import { DownloadItem, DownloadStatus, AudioFormat } from '../types/audio';
import { cleanFilename, getExtensionFromUrl, getFormatFromMimeOrExt, formatSpeed } from '../utils/formatters';
import { storageService } from '../storage/storageService';
import { sourceValidator } from './sourceValidator';
import { hlsDownloader } from './hlsDownloader';
import { audioConverter } from './audioConverter';

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.downloads;

// Speed tracking state: Map<downloadId, { lastBytes: number, lastTime: number }>
const speedTracker = new Map<number, { lastBytes: number; lastTime: number }>();

export class DownloadManager {
  /**
   * Start downloading an audio/video item with smart pre-validation
   */
  async startDownload(params: {
    url: string;
    filename: string;
    audioId?: string;
    domain?: string;
    size?: number;
    saveAs?: boolean;
    skipValidation?: boolean;
    targetFormat?: 'mp3' | 'm4a' | 'wav' | 'mp4';
    explicitFormatSelection?: boolean;
  }): Promise<number> {
    const isHls =
      params.url.toLowerCase().includes('.m3u8') ||
      params.url.toLowerCase().includes('/playlist');

    if (isHls) {
      return await this.startHlsDownload(params);
    }

    const settings = await storageService.getSettings();
    const chosenFormat = params.targetFormat;

    // 1. Smart Source Pre-validation (unless explicitly skipped for verified retry)
    let finalFilename = params.filename;
    let validatedSize = params.size;

    if (!params.skipValidation) {
      const validation = await sourceValidator.validateSource(params.url);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Nguồn không hợp lệ hoặc không có quyền truy cập');
      }

      // If server provides Content-Disposition filename, prefer it!
      if (validation.contentDispositionFilename) {
        finalFilename = validation.contentDispositionFilename;
      }
      if (validation.contentLength) {
        validatedSize = validation.contentLength;
      }

      // Synchronize format extension: If server returns M4A/AAC/MP3, ensure filename extension matches!
      if (!chosenFormat && validation.suggestedFormat && validation.suggestedFormat !== 'unknown') {
        const trueFormat = validation.suggestedFormat;
        const currentExt = getExtensionFromUrl(finalFilename);
        if (currentExt && currentExt !== trueFormat) {
          finalFilename = finalFilename.replace(/\.[a-zA-Z0-9]{2,5}$/, `.${trueFormat}`);
        }
      }
    }

    const currentExt = getExtensionFromUrl(finalFilename) || getExtensionFromUrl(params.url);
    const isVideo = params.url.toLowerCase().includes('.mp4') || currentExt === 'mp4' || chosenFormat === 'mp4';
    const effectiveExt = chosenFormat || (isVideo ? 'mp4' : (currentExt || 'mp3'));

    const shouldPrompt = params.saveAs !== undefined ? params.saveAs : settings.promptFilename;
    const subfolder = (settings.downloadSubfolder || 'music').trim().replace(/[<>:"/\\|?*]/g, '_');

    // If format conversion is explicitly requested (e.g., MP3 or WAV from a different source format)
    if (params.explicitFormatSelection && chosenFormat && (chosenFormat === 'mp3' || chosenFormat === 'wav') && currentExt && currentExt !== chosenFormat) {
      try {
        const resp = await fetch(params.url);
        if (resp.ok) {
          const rawBlob = await resp.blob();
          let convertedBlob: Blob;
          if (chosenFormat === 'wav') {
            convertedBlob = await audioConverter.convertBlobToWav(rawBlob);
          } else {
            convertedBlob = await audioConverter.convertBlobToMp3(rawBlob, 192);
          }

          let objectUrl: string;
          try {
            objectUrl = URL.createObjectURL(convertedBlob);
          } catch {
            objectUrl = await this.blobToDataUrl(convertedBlob);
          }

          const baseTitle = finalFilename.replace(/\.[a-zA-Z0-9]{2,5}$/, '');
          const cleanName = cleanFilename(`${baseTitle}.${chosenFormat}`, chosenFormat);
          const targetFilename = subfolder ? `${subfolder}/${cleanName}` : cleanName;

          if (isChromeExtension) {
            try {
              await chrome.runtime.sendMessage({
                type: 'REGISTER_PENDING_DOWNLOAD',
                payload: {
                  url: objectUrl,
                  filename: cleanName,
                  subfolder,
                },
              });
            } catch {}

            const downloadId = await chrome.downloads.download({
              url: objectUrl,
              filename: targetFilename,
              conflictAction: 'uniquify',
              saveAs: shouldPrompt,
            });

            const newDownload: DownloadItem = {
              downloadId,
              audioId: params.audioId,
              url: objectUrl,
              filename: cleanName,
              format: chosenFormat as any,
              size: convertedBlob.size,
              bytesReceived: convertedBlob.size,
              totalBytes: convertedBlob.size,
              state: 'in_progress',
              downloadStatus: 'DOWNLOADING',
              canResume: false,
              paused: false,
              startTime: Date.now(),
              domain: params.domain || 'unknown',
              retryCount: 0,
            };

            const current = await storageService.getStoredDownloads();
            current.unshift(newDownload);
            await storageService.saveStoredDownloads(current.slice(0, 50));

            return downloadId;
          }
        }
      } catch {
        // Silently fall back to native direct download without logging to extension console
      }
    }

    const baseTitle = finalFilename.replace(/\.[a-zA-Z0-9]{2,5}$/, '');
    const cleanName = cleanFilename(`${baseTitle}.${effectiveExt}`, effectiveExt);
    const targetFilename = subfolder ? `${subfolder}/${cleanName}` : cleanName;

    if (isChromeExtension) {
      try {
        try {
          await chrome.runtime.sendMessage({
            type: 'REGISTER_PENDING_DOWNLOAD',
            payload: {
              url: params.url,
              filename: cleanName,
              subfolder,
            },
          });
        } catch {
          // Extension messaging transition
        }

        const downloadId = await chrome.downloads.download({
          url: params.url,
          filename: targetFilename,
          conflictAction: 'uniquify',
          saveAs: shouldPrompt,
        });

        const newDownload: DownloadItem = {
          downloadId,
          audioId: params.audioId,
          url: params.url,
          filename: cleanName,
          format: effectiveExt as any,
          size: validatedSize,
          bytesReceived: 0,
          totalBytes: validatedSize || 0,
          state: 'in_progress',
          downloadStatus: 'DOWNLOADING',
          canResume: false,
          paused: false,
          startTime: Date.now(),
          domain: params.domain || 'unknown',
          retryCount: 0,
        };

        speedTracker.set(downloadId, { lastBytes: 0, lastTime: Date.now() });

        const current = await storageService.getStoredDownloads();
        current.unshift(newDownload);
        await storageService.saveStoredDownloads(current.slice(0, 50));

        return downloadId;
      } catch (error: any) {
        console.error('[AudioFlow] Failed to initiate download:', error);
        throw new Error(error?.message || 'Không thể bắt đầu tải xuống qua Chrome Downloads API');
      }
    } else {
      // In web dev environment, trigger fallback
      const a = document.createElement('a');
      a.href = params.url;
      a.download = cleanName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      const mockId = Date.now();
      return mockId;
    }
  }

  /**
   * Helper to convert Blob to Base64 Data URL if URL.createObjectURL is restricted
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + chunkSize, len))));
    }
    return `data:${blob.type || 'audio/mp4'};base64,${btoa(binary)}`;
  }

  /**
   * Download and assemble an HLS stream into a complete audio file
   */
  async startHlsDownload(params: {
    url: string;
    filename: string;
    audioId?: string;
    domain?: string;
    saveAs?: boolean;
    targetFormat?: 'mp3' | 'm4a' | 'wav' | 'mp4';
  }): Promise<number> {
    const settings = await storageService.getSettings();
    const tempDownloadId = Math.floor(Date.now() % 10000000);
    const preferredFormat = params.targetFormat || settings.preferredFormat || 'mp3';

    let cleanName = cleanFilename(params.filename, preferredFormat);
    cleanName = cleanName.replace(/\.[a-zA-Z0-9]{2,5}$/, `.${preferredFormat}`);

    const shouldPrompt = params.saveAs !== undefined ? params.saveAs : settings.promptFilename;
    let targetFilename = cleanName;
    if (!shouldPrompt && settings.downloadSubfolder && settings.downloadSubfolder.trim()) {
      const folder = settings.downloadSubfolder.trim().replace(/[<>:"/\\|?*]/g, '_');
      targetFilename = `${folder}/${cleanName}`;
    }

    // Register active download in storage
    const initialItem: DownloadItem = {
      downloadId: tempDownloadId,
      audioId: params.audioId,
      url: params.url,
      filename: cleanName,
      format: preferredFormat as any,
      bytesReceived: 0,
      totalBytes: 0,
      state: 'in_progress',
      downloadStatus: 'DOWNLOADING',
      canResume: false,
      paused: false,
      startTime: Date.now(),
      domain: params.domain || 'unknown',
      speedFormatted: 'Đang kết nối luồng phát...',
    };

    const currentDownloads = await storageService.getStoredDownloads();
    currentDownloads.unshift(initialItem);
    await storageService.saveStoredDownloads(currentDownloads.slice(0, 50));

    try {
      let lastSaveTime = Date.now();
      const stitched = await hlsDownloader.downloadAndStitchHls({
        playlistUrl: params.url,
        onProgress: async (progress) => {
          const now = Date.now();
          if (now - lastSaveTime > 400 || progress.percent === 100) {
            lastSaveTime = now;
            const all = await storageService.getStoredDownloads();
            const idx = all.findIndex((d) => d.downloadId === tempDownloadId);
            if (idx >= 0) {
              all[idx].bytesReceived = progress.bytes;
              all[idx].totalBytes = Math.round(progress.bytes / (progress.percent / 100 || 1));
              all[idx].speedFormatted = `Đang tải ${progress.current}/${progress.total} (${progress.percent}%)`;
              await storageService.saveStoredDownloads(all);
            }
          }
        },
      });

      // Convert to user's desired format (MP3 by default)
      let finalBlob = stitched.blob;
      let finalFormat: AudioFormat = 'mp3';
      let finalExt = 'mp3';

      if (preferredFormat === 'wav') {
        try {
          const all = await storageService.getStoredDownloads();
          const idx = all.findIndex((d) => d.downloadId === tempDownloadId);
          if (idx >= 0) {
            all[idx].speedFormatted = 'Đang chuyển đổi sang WAV (PCM)...';
            await storageService.saveStoredDownloads(all);
          }
          finalBlob = await audioConverter.convertBlobToWav(stitched.blob);
          finalFormat = 'wav';
          finalExt = 'wav';
        } catch (e) {
          console.warn('WAV conversion fallback:', e);
        }
      } else if (preferredFormat !== 'm4a') {
        // MP3 conversion (DEFAULT for genuine music files!)
        try {
          const all = await storageService.getStoredDownloads();
          const idx = all.findIndex((d) => d.downloadId === tempDownloadId);
          if (idx >= 0) {
            all[idx].speedFormatted = 'Đang mã hóa MP3 (192 kbps)...';
            await storageService.saveStoredDownloads(all);
          }
          finalBlob = await audioConverter.convertBlobToMp3(stitched.blob, 192, async (percent) => {
            const allDownloads = await storageService.getStoredDownloads();
            const i = allDownloads.findIndex((d) => d.downloadId === tempDownloadId);
            if (i >= 0) {
              allDownloads[i].speedFormatted = `Đang mã hóa MP3 (${percent}%)...`;
              await storageService.saveStoredDownloads(allDownloads);
            }
          });
          finalFormat = 'mp3';
          finalExt = 'mp3';
        } catch (e) {
          console.warn('MP3 conversion fallback to stitched audio:', e);
          finalFormat = (stitched.format as any) || 'm4a';
          finalExt = finalFormat;
        }
      } else {
        finalFormat = (stitched.format as any) || 'm4a';
        finalExt = finalFormat;
      }

      // Ensure filename matches final format extension
      cleanName = cleanName.replace(/\.[a-zA-Z0-9]{2,5}$/, `.${finalExt}`);
      const subfolder = (settings.downloadSubfolder || 'music').trim().replace(/[<>:"/\\|?*]/g, '_');
      const targetFilename = subfolder ? `${subfolder}/${cleanName}` : cleanName;

      // Convert Blob to URL for Chrome download
      let objectUrl: string;
      try {
        objectUrl = URL.createObjectURL(finalBlob);
      } catch {
        objectUrl = await this.blobToDataUrl(finalBlob);
      }

      // Pre-register URL, clean filename, and subfolder in background for onDeterminingFilename
      try {
        await chrome.runtime.sendMessage({
          type: 'REGISTER_PENDING_DOWNLOAD',
          payload: {
            url: objectUrl,
            filename: cleanName,
            subfolder,
          },
        });
      } catch {
        // Extension messaging transition
      }

      // Pre-register final URL and filename in stored downloads for onDeterminingFilename
      const preDownloads = await storageService.getStoredDownloads();
      const preIdx = preDownloads.findIndex((d) => d.downloadId === tempDownloadId);
      if (preIdx >= 0) {
        preDownloads[preIdx].url = objectUrl;
        preDownloads[preIdx].filename = cleanName;
        preDownloads[preIdx].format = finalFormat;
        await storageService.saveStoredDownloads(preDownloads);
      }

      if (isChromeExtension) {
        const chromeDownloadId = await chrome.downloads.download({
          url: objectUrl,
          filename: targetFilename,
          conflictAction: 'uniquify',
          saveAs: shouldPrompt,
        });

        // Update stored item with final Chrome downloadId
        const all = await storageService.getStoredDownloads();
        const idx = all.findIndex((d) => d.downloadId === tempDownloadId);
        if (idx >= 0) {
          all[idx].downloadId = chromeDownloadId;
          all[idx].bytesReceived = finalBlob.size;
          all[idx].totalBytes = finalBlob.size;
          all[idx].size = finalBlob.size;
          all[idx].filename = cleanName;
          all[idx].format = finalFormat;
          all[idx].speedFormatted = 'Hoàn tất tải file nhạc';
          await storageService.saveStoredDownloads(all);
        }

        // Add to history
        await storageService.addToHistory({
          id: params.audioId || `dl_${chromeDownloadId}`,
          title: cleanName.replace(/\.[a-zA-Z0-9]{2,5}$/, '').replace(/[_+-]+/g, ' '),
          filename: cleanName,
          url: params.url,
          format: finalFormat,
          size: finalBlob.size,
          domain: params.domain || 'unknown',
          downloadedAt: Date.now(),
          isFavorite: false,
        });

        return chromeDownloadId;
      } else {
        // Fallback for non-extension web dev preview
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return tempDownloadId;
      }
    } catch (err: any) {
      // Mark as failed in stored downloads
      const all = await storageService.getStoredDownloads();
      const idx = all.findIndex((d) => d.downloadId === tempDownloadId);
      if (idx >= 0) {
        all[idx].state = 'interrupted';
        all[idx].downloadStatus = 'FAILED';
        all[idx].error = err?.message || 'Lỗi khi ghép luồng HLS';
        await storageService.saveStoredDownloads(all);
      }
      throw err;
    }
  }

  /**
   * Batch download multiple audio items
   */
  async batchDownload(
    items: Array<{ url: string; filename: string; audioId?: string; domain?: string; size?: number }>
  ): Promise<number[]> {
    const downloadIds: number[] = [];
    for (const item of items) {
      try {
        const id = await this.startDownload({ ...item, saveAs: false });
        downloadIds.push(id);
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        console.warn(`[AudioFlow] Failed downloading ${item.filename}:`, e);
      }
    }
    return downloadIds;
  }

  /**
   * Retry a failed download
   */
  async retryDownload(downloadId: number): Promise<number | null> {
    const downloads = await storageService.getStoredDownloads();
    const item = downloads.find((d) => d.downloadId === downloadId);
    if (!item) return null;

    try {
      const newId = await this.startDownload({
        url: item.url,
        filename: item.filename,
        audioId: item.audioId,
        domain: item.domain,
        size: item.size,
        saveAs: false,
      });

      // Remove old failed item
      const updated = downloads.filter((d) => d.downloadId !== downloadId);
      await storageService.saveStoredDownloads(updated);
      return newId;
    } catch (e: any) {
      item.error = e?.message || 'Thử lại thất bại';
      item.retryCount = (item.retryCount || 0) + 1;
      await storageService.saveStoredDownloads(downloads);
      throw e;
    }
  }

  /**
   * Pause an active download
   */
  async pauseDownload(downloadId: number): Promise<void> {
    if (isChromeExtension) {
      try {
        await chrome.downloads.pause(downloadId);
      } catch (e) {
        console.error('[AudioFlow] Failed to pause download:', e);
      }
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(downloadId: number): Promise<void> {
    if (isChromeExtension) {
      try {
        await chrome.downloads.resume(downloadId);
      } catch (e) {
        console.error('[AudioFlow] Failed to resume download:', e);
      }
    }
  }

  /**
   * Cancel a download
   */
  async cancelDownload(downloadId: number): Promise<void> {
    if (isChromeExtension) {
      try {
        await chrome.downloads.cancel(downloadId);
        speedTracker.delete(downloadId);
        const current = await storageService.getStoredDownloads();
        const updated = current.filter((d) => d.downloadId !== downloadId);
        await storageService.saveStoredDownloads(updated);
      } catch (e) {
        console.error('[AudioFlow] Failed to cancel download:', e);
      }
    }
  }

  /**
   * Clear all completed and interrupted downloads from both Chrome history and local storage
   */
  async clearFinishedDownloads(): Promise<void> {
    if (isChromeExtension) {
      try {
        await new Promise<void>((resolve) => {
          chrome.downloads.erase({ state: 'complete' }, () => {
            chrome.downloads.erase({ state: 'interrupted' }, () => {
              resolve();
            });
          });
        });
      } catch (e) {
        console.warn('[AudioFlow] Failed to erase Chrome downloads history:', e);
      }
    }

    // Also clean stored downloads in local storage
    const current = await storageService.getStoredDownloads();
    const activeOnly = current.filter((d) => d.state === 'in_progress');
    await storageService.saveStoredDownloads(activeOnly);
  }

  /**
   * Open the file in folder or show default downloads folder
   */
  showDownloadItem(downloadId: number): void {
    if (isChromeExtension) {
      try {
        chrome.downloads.show(downloadId);
      } catch {
        this.openDownloadsFolder();
      }
    }
  }

  /**
   * Open default downloads folder
   */
  openDownloadsFolder(): void {
    if (isChromeExtension) {
      try {
        chrome.downloads.showDefaultFolder();
      } catch (e) {
        console.warn('Cannot open default folder:', e);
      }
    }
  }

  /**
   * Update download speed and progress from Chrome onChanged event
   */
  updateProgressAndSpeed(downloadId: number, bytesReceived: number): { speed: number; speedFormatted: string } {
    const now = Date.now();
    const last = speedTracker.get(downloadId);
    let speed = 0;

    if (last) {
      const timeDelta = (now - last.lastTime) / 1000;
      if (timeDelta > 0.5) {
        const bytesDelta = bytesReceived - last.lastBytes;
        speed = Math.max(0, bytesDelta / timeDelta);
        speedTracker.set(downloadId, { lastBytes: bytesReceived, lastTime: now });
      }
    } else {
      speedTracker.set(downloadId, { lastBytes: bytesReceived, lastTime: now });
    }

    return {
      speed,
      speedFormatted: formatSpeed(speed),
    };
  }

  /**
   * Query recent downloads from Chrome API with speed & status enrichment
   */
  async getChromeDownloads(): Promise<DownloadItem[]> {
    if (!isChromeExtension) {
      return storageService.getStoredDownloads();
    }

    try {
      const items = await chrome.downloads.search({
        limit: 35,
        orderBy: ['-startTime'],
      });

      const stored = await storageService.getStoredDownloads();
      const storedMap = new Map(stored.map((s) => [s.downloadId, s]));

      const chromeResults = items
        .filter((item) => {
          const ext = getExtensionFromUrl(item.filename || item.url);
          const mime = item.mime || '';
          return (
            mime.startsWith('audio/') ||
            mime.startsWith('video/') ||
            ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus', 'webm', 'mp4'].includes(ext)
          );
        })
        .map((item) => {
          const ext = getExtensionFromUrl(item.filename || item.url);
          const existing = storedMap.get(item.id);

          let downloadStatus: DownloadStatus = 'READY_TO_DOWNLOAD';
          if (item.state === 'in_progress') downloadStatus = 'DOWNLOADING';
          else if (item.state === 'complete') downloadStatus = 'COMPLETED';
          else if (item.state === 'interrupted') downloadStatus = 'FAILED';

          const { speed, speedFormatted } = this.updateProgressAndSpeed(item.id, item.bytesReceived);

          return {
            downloadId: item.id,
            audioId: existing?.audioId,
            url: item.url,
            filename: cleanFilename(item.filename || 'audio.mp3'),
            format: getFormatFromMimeOrExt(item.mime, ext),
            size: item.totalBytes > 0 ? item.totalBytes : existing?.size,
            bytesReceived: item.bytesReceived,
            totalBytes: item.totalBytes,
            state: item.state,
            downloadStatus,
            canResume: item.canResume,
            paused: item.paused,
            error: item.error,
            speed: item.state === 'in_progress' ? speed : undefined,
            speedFormatted: item.state === 'in_progress' ? speedFormatted : undefined,
            startTime: item.startTime ? new Date(item.startTime).getTime() : Date.now(),
            domain: existing?.domain || 'web',
            retryCount: existing?.retryCount || 0,
          };
        });

      // Include active HLS assembling downloads not yet in Chrome download manager
      const assembling = stored.filter(
        (s) => s.state === 'in_progress' && !items.some((ci) => ci.id === s.downloadId)
      );

      return [...assembling, ...chromeResults];
    } catch (e) {
      console.warn('[AudioFlow] Failed to query chrome downloads:', e);
      return [];
    }
  }
}

export const downloadManager = new DownloadManager();
