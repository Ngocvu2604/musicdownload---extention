import { storageService } from '../storage/storageService';
import { downloadManager } from '../services/downloadManager';
import { createDetectedMediaItem, isAudioMimeType, isDirectAudioUrl } from '../utils/audioDetector';
import { parseTitleAndArtistFromTab, getFormatFromMimeOrExt, getExtensionFromUrl } from '../utils/formatters';
import { ExtensionMessage, HistoryItem, DetectedMedia } from '../types/audio';

console.log('[AudioFlow] Background Service Worker initialized.');

/**
 * Update the badge count and playing indicator on the extension icon for a specific tab
 */
async function updateTabBadge(tabId: number): Promise<void> {
  if (tabId <= 0) return;
  try {
    const items = await storageService.getTabAudio(tabId);
    const count = items.length;
    const hasPlaying = items.some((i) => i.status === 'PLAYING');

    if (hasPlaying) {
      // Show playing symbol if media is playing
      await chrome.action.setBadgeText({ text: '▶', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#D62828', tabId }); // Primary Red for playing
    } else if (count > 0) {
      await chrome.action.setBadgeText({ text: count.toString(), tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#A61E22', tabId }); // Dark Red for detected media
    } else {
      await chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch {
    // Tab might be closing
  }
}

/**
 * Helper to programmatically inject content script into an already open tab
 */
async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return false;
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['dist/content.js'],
    });
    return true;
  } catch (err) {
    console.warn('[AudioFlow] Script injection failed:', err);
    return false;
  }
}

/**
 * Listen for network requests that respond with audio MIME types or extensions
 */
chrome.webRequest.onHeadersReceived.addListener(
  (details: chrome.webRequest.OnHeadersReceivedDetails): chrome.webRequest.BlockingResponse | undefined => {
    void (async () => {
      if (details.tabId <= 0 || !details.responseHeaders) return;

      try {
        const settings = await storageService.getSettings();
        if (!settings.autoDetect) return;

        let contentType = '';
        let contentLength = 0;

        for (const header of details.responseHeaders) {
          const name = header.name.toLowerCase();
          if (name === 'content-type' && header.value) {
            contentType = header.value.toLowerCase();
          } else if (name === 'content-length' && header.value) {
            contentLength = parseInt(header.value, 10) || 0;
          }
        }

        const isAudio = isAudioMimeType(contentType) || isDirectAudioUrl(details.url);
        if (!isAudio) return;

        // Ignore tiny HLS / DASH stream chunks (3-second fragments) that clutter the list
        const lowerUrl = details.url.toLowerCase();
        const isHlsSegment =
          lowerUrl.includes('cf-hls-media.sndcdn.com') ||
          lowerUrl.includes('cf-hls-opus.sndcdn.com') ||
          lowerUrl.endsWith('.ts') ||
          lowerUrl.endsWith('.m4s') ||
          lowerUrl.includes('/segment') ||
          lowerUrl.includes('-frag') ||
          lowerUrl.includes('playlist.m3u8');

        if (isHlsSegment && contentLength > 0 && contentLength < 350000) {
          // Skip 50KB HLS chunks - they are not full songs
          return;
        }

        const minBytes = (settings.minFileSizeKB || 0) * 1024;
        if (contentLength > 0 && contentLength < minBytes) {
          return;
        }

        let pageUrl = details.initiator || details.url;
        let tabTitle = '';
        try {
          const tab = await chrome.tabs.get(details.tabId);
          if (tab && tab.url) {
            pageUrl = tab.url;
          }
          if (tab && tab.title) {
            tabTitle = tab.title;
          }
        } catch {
          // Tab not accessible
        }

        const { title, artist } = parseTitleAndArtistFromTab(tabTitle, pageUrl);
        const format = getFormatFromMimeOrExt(contentType, getExtensionFromUrl(details.url));

        const item = createDetectedMediaItem({
          url: details.url,
          source: 'network-request',
          pageUrl,
          tabId: details.tabId,
          title,
          artist,
          format,
          mimeType: contentType,
          size: contentLength > 0 ? contentLength : undefined,
          downloadable: true,
          downloadReason: 'Tệp âm thanh nạp từ mạng máy chủ',
        });

        if (item) {
          await storageService.addDetectedAudio(item);
          await updateTabBadge(details.tabId);
        }
      } catch (err) {
        console.warn('[AudioFlow] Error in webRequest:', err);
      }
    })();
    return undefined;
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

/**
 * Listen to tab updates (page reloads, URL navigation)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void (async () => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
      await storageService.clearTabAudio(tabId);
      await updateTabBadge(tabId);
    } else if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
      try {
        const settings = await storageService.getSettings();
        if (settings.autoDetect) {
          chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, () => {
            if (chrome.runtime.lastError) {
              // Auto inject content script if not present
              void ensureContentScriptInjected(tabId).then((success) => {
                if (success) {
                  chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, () => {});
                }
              });
            }
          });
        }
      } catch {
        // Ignore
      }
    }
  })();
});

/**
 * Handle tab activation (user switches active tab)
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    await updateTabBadge(activeInfo.tabId);
  })();
});

/**
 * Clean up storage when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    await storageService.clearTabAudio(tabId);
  })();
});

/**
 * Listen for download status changes
 */
chrome.downloads.onChanged.addListener((delta) => {
  void (async () => {
    try {
      const currentDownloads = await storageService.getStoredDownloads();
      const itemIndex = currentDownloads.findIndex((d) => d.downloadId === delta.id);

      if (itemIndex >= 0) {
        const item = currentDownloads[itemIndex];

        if (delta.state && delta.state.current) {
          item.state = delta.state.current as 'in_progress' | 'interrupted' | 'complete';
        }
        if (delta.paused && delta.paused.current !== undefined) {
          item.paused = delta.paused.current;
        }
        if (delta.canResume && delta.canResume.current !== undefined) {
          item.canResume = delta.canResume.current;
        }
        if (delta.error && delta.error.current) {
          item.error = delta.error.current;
        }
        if (delta.totalBytes && delta.totalBytes.current !== undefined && delta.totalBytes.current > 0) {
          item.totalBytes = delta.totalBytes.current;
          item.size = delta.totalBytes.current;
        }

        await storageService.saveStoredDownloads(currentDownloads);

        if (delta.state && delta.state.current === 'complete') {
          const historyItem: HistoryItem = {
            id: item.audioId || `dl_${item.downloadId}`,
            title: item.filename.replace(/\.[a-zA-Z0-9]{2,5}$/, '').replace(/[_+-]+/g, ' '),
            filename: item.filename,
            url: item.url,
            format: item.format,
            size: item.size || item.totalBytes,
            domain: item.domain,
            downloadedAt: Date.now(),
            isFavorite: false,
          };

          await storageService.addToHistory(historyItem);
        }
      }
    } catch (e) {
      console.error('[AudioFlow] Error handling download change:', e);
    }
  })();
});

/**
 * Message dispatcher
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    const handleMessage = async (): Promise<any> => {
      switch (message.type) {
        case 'MEDIA_DETECTED':
        case 'AUDIO_DETECTED': {
          if (message.payload) {
            const tabId = message.tabId || sender.tab?.id || 0;
            const item: DetectedMedia = { ...message.payload, tabId };
            await storageService.addDetectedAudio(item);
            if (tabId > 0) {
              await updateTabBadge(tabId);
            }
            return { success: true };
          }
          return { success: false, error: 'No payload' };
        }

        case 'SCAN_PAGE':
        case 'SCAN_MEDIA': {
          const tabId = message.tabId || sender.tab?.id || 0;
          if (tabId <= 0) return { success: false, error: 'Invalid tabId' };

          return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (response) => {
              void (async () => {
                if (chrome.runtime.lastError || !response) {
                  // Try injecting content script dynamically
                  const injected = await ensureContentScriptInjected(tabId);
                  if (injected) {
                    setTimeout(() => {
                      chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, () => {
                        void (async () => {
                          const items = await storageService.getTabAudio(tabId);
                          await updateTabBadge(tabId);
                          resolve({ success: true, count: items.length, items });
                        })();
                      });
                    }, 300);
                  } else {
                    const items = await storageService.getTabAudio(tabId);
                    resolve({ success: true, count: items.length, items });
                  }
                } else {
                  const items = await storageService.getTabAudio(tabId);
                  await updateTabBadge(tabId);
                  resolve({ success: true, count: items.length, items });
                }
              })();
            });
          });
        }

        case 'GET_TAB_AUDIO':
        case 'GET_TAB_MEDIA': {
          const tabId = message.tabId || 0;
          const items = await storageService.getTabAudio(tabId);
          return { success: true, items };
        }

        case 'CLEAR_TAB_AUDIO': {
          const tabId = message.tabId || 0;
          await storageService.clearTabAudio(tabId);
          await updateTabBadge(tabId);
          return { success: true };
        }

        case 'VALIDATE_AND_DOWNLOAD':
        case 'START_DOWNLOAD': {
          const payload = message.payload;
          if (!payload || !payload.url) {
            return { success: false, error: 'URL is required' };
          }
          try {
            const downloadId = await downloadManager.startDownload({
              url: payload.url,
              filename: payload.filename,
              audioId: payload.audioId,
              domain: payload.domain,
              size: payload.size,
              saveAs: payload.saveAs,
            });
            return { success: true, downloadId };
          } catch (err: any) {
            return { success: false, error: err?.message || 'Download failed' };
          }
        }

        case 'RETRY_DOWNLOAD': {
          if (message.payload?.downloadId) {
            try {
              const newId = await downloadManager.retryDownload(message.payload.downloadId);
              return { success: true, downloadId: newId };
            } catch (err: any) {
              return { success: false, error: err?.message || 'Thử lại thất bại' };
            }
          }
          return { success: false, error: 'downloadId is required' };
        }

        case 'PAUSE_DOWNLOAD': {
          if (message.payload?.downloadId) {
            await downloadManager.pauseDownload(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }

        case 'RESUME_DOWNLOAD': {
          if (message.payload?.downloadId) {
            await downloadManager.resumeDownload(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }

        case 'CANCEL_DOWNLOAD': {
          if (message.payload?.downloadId) {
            await downloadManager.cancelDownload(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }

        case 'SHOW_DOWNLOAD_ITEM': {
          if (message.payload?.downloadId) {
            downloadManager.showDownloadItem(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }

        case 'OPEN_DOWNLOADS_FOLDER': {
          downloadManager.openDownloadsFolder();
          return { success: true };
        }

        case 'GET_SETTINGS': {
          const settings = await storageService.getSettings();
          return { success: true, settings };
        }

        case 'UPDATE_SETTINGS': {
          const updated = await storageService.saveSettings(message.payload || {});
          return { success: true, settings: updated };
        }

        default:
          return { success: false, error: 'Unknown message type' };
      }
    };

    handleMessage()
      .then(sendResponse)
      .catch((err) =>
        sendResponse({ success: false, error: err?.message || 'Internal error' })
      );
    return true;
  }
);
