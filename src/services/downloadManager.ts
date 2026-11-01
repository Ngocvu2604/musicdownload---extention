import { DownloadItem, AudioFormat } from '../types/audio';
import { cleanFilename, getExtensionFromUrl, getFormatFromMimeOrExt } from '../utils/formatters';
import { storageService } from '../storage/storageService';

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.downloads;

export class DownloadManager {
  /**
   * Start downloading an audio item
   */
  async startDownload(params: {
    url: string;
    filename: string;
    audioId?: string;
    domain?: string;
    size?: number;
    saveAs?: boolean;
  }): Promise<number> {
    const settings = await storageService.getSettings();
    const cleanName = cleanFilename(params.filename);

    let targetFilename = cleanName;
    if (settings.downloadSubfolder && settings.downloadSubfolder.trim()) {
      const folder = settings.downloadSubfolder.trim().replace(/[<>:"/\\|?*]/g, '_');
      targetFilename = `${folder}/${cleanName}`;
    }

    if (isChromeExtension) {
      try {
        const downloadId = await chrome.downloads.download({
          url: params.url,
          filename: targetFilename,
          conflictAction: 'uniquify',
          saveAs: params.saveAs !== undefined ? params.saveAs : settings.promptFilename,
        });

        const ext = getExtensionFromUrl(cleanName);
        const format = getFormatFromMimeOrExt(undefined, ext);

        const newDownload: DownloadItem = {
          downloadId,
          audioId: params.audioId,
          url: params.url,
          filename: cleanName,
          format,
          size: params.size,
          bytesReceived: 0,
          totalBytes: params.size || 0,
          state: 'in_progress',
          canResume: false,
          paused: false,
          startTime: Date.now(),
          domain: params.domain || 'unknown',
        };

        const current = await storageService.getStoredDownloads();
        current.unshift(newDownload);
        await storageService.saveStoredDownloads(current.slice(0, 50));

        return downloadId;
      } catch (error) {
        console.error('Failed to initiate download:', error);
        throw error;
      }
    } else {
      // In normal browser environment, trigger anchor download
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
        await new Promise(r => setTimeout(r, 250));
      } catch (e) {
        console.warn(`Failed downloading ${item.filename}:`, e);
      }
    }
    return downloadIds;
  }

  /**
   * Pause an active download
   */
  async pauseDownload(downloadId: number): Promise<void> {
    if (isChromeExtension) {
      try {
        await chrome.downloads.pause(downloadId);
      } catch (e) {
        console.error('Failed to pause download:', e);
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
        console.error('Failed to resume download:', e);
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
        const current = await storageService.getStoredDownloads();
        const updated = current.filter(d => d.downloadId !== downloadId);
        await storageService.saveStoredDownloads(updated);
      } catch (e) {
        console.error('Failed to cancel download:', e);
      }
    }
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
   * Query recent downloads from Chrome API
   */
  async getChromeDownloads(): Promise<DownloadItem[]> {
    if (!isChromeExtension) {
      return storageService.getStoredDownloads();
    }

    try {
      const items = await chrome.downloads.search({
        limit: 30,
        orderBy: ['-startTime'],
      });

      return items
        .filter(item => {
          const ext = getExtensionFromUrl(item.filename || item.url);
          const mime = item.mime || '';
          return mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus', 'webm'].includes(ext);
        })
        .map(item => {
          const ext = getExtensionFromUrl(item.filename || item.url);
          return {
            downloadId: item.id,
            url: item.url,
            filename: cleanFilename(item.filename || 'audio.mp3'),
            format: getFormatFromMimeOrExt(item.mime, ext),
            size: item.totalBytes > 0 ? item.totalBytes : undefined,
            bytesReceived: item.bytesReceived,
            totalBytes: item.totalBytes,
            state: item.state,
            canResume: item.canResume,
            paused: item.paused,
            error: item.error,
            startTime: item.startTime ? new Date(item.startTime).getTime() : Date.now(),
            domain: 'web',
          };
        });
    } catch (e) {
      console.warn('Failed to query chrome downloads:', e);
      return [];
    }
  }
}

export const downloadManager = new DownloadManager();
