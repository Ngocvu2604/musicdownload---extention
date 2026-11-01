import { DownloadItem, DownloadStatus } from '../types/audio';
import { cleanFilename, getExtensionFromUrl, getFormatFromMimeOrExt, formatSpeed } from '../utils/formatters';
import { storageService } from '../storage/storageService';
import { sourceValidator } from './sourceValidator';

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.downloads;

// Speed tracking state: Map<downloadId, { lastBytes: number, lastTime: number }>
const speedTracker = new Map<number, { lastBytes: number; lastTime: number }>();

export class DownloadManager {
  /**
   * Start downloading an audio item with smart pre-validation
   */
  async startDownload(params: {
    url: string;
    filename: string;
    audioId?: string;
    domain?: string;
    size?: number;
    saveAs?: boolean;
    skipValidation?: boolean;
  }): Promise<number> {
    const settings = await storageService.getSettings();

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
      if (validation.suggestedFormat && validation.suggestedFormat !== 'unknown') {
        const trueFormat = validation.suggestedFormat;
        const currentExt = getExtensionFromUrl(finalFilename);
        if (currentExt && currentExt !== trueFormat) {
          finalFilename = finalFilename.replace(/\.[a-zA-Z0-9]{2,5}$/, `.${trueFormat}`);
        }
      }
    }

    const cleanName = cleanFilename(finalFilename);

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

      return items
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
    } catch (e) {
      console.warn('[AudioFlow] Failed to query chrome downloads:', e);
      return [];
    }
  }
}

export const downloadManager = new DownloadManager();
