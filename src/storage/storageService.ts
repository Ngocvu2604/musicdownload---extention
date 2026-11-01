import { DetectedMedia, HistoryItem, UserSettings, DownloadItem } from '../types/audio';

export const DEFAULT_SETTINGS: UserSettings = {
  autoDetect: true,
  minFileSizeKB: 50,
  minDurationSeconds: 1,
  downloadSubfolder: 'AudioFlow',
  promptFilename: false,
  audioNotification: true,
  theme: 'dark',
};

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.storage?.local;

class StorageService {
  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    try {
      if (isChromeExtension) {
        const result = await chrome.storage.local.get('audioflow_settings');
        if (result.audioflow_settings) {
          return { ...DEFAULT_SETTINGS, ...result.audioflow_settings };
        }
      } else {
        const raw = localStorage.getItem('audioflow_settings');
        if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Failed to get settings from storage:', e);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Save user settings
   */
  async saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    try {
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_settings: updated });
      } else {
        localStorage.setItem('audioflow_settings', JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
    return updated;
  }

  /**
   * Get detected media items for a specific tab
   */
  async getTabAudio(tabId: number): Promise<DetectedMedia[]> {
    try {
      const key = `tab_audio_${tabId}`;
      if (isChromeExtension) {
        const result = await chrome.storage.local.get(key);
        return (result[key] as DetectedMedia[]) || [];
      } else {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn(`Failed to get audio for tab ${tabId}:`, e);
      return [];
    }
  }

  /**
   * Overwrite entire tab audio list (e.g. after full scan)
   */
  async setTabAudio(tabId: number, items: DetectedMedia[]): Promise<void> {
    try {
      const key = `tab_audio_${tabId}`;
      if (isChromeExtension) {
        await chrome.storage.local.set({ [key]: items });
      } else {
        localStorage.setItem(key, JSON.stringify(items));
      }
    } catch (e) {
      console.warn(`Failed to set audio for tab ${tabId}:`, e);
    }
  }

  /**
   * Add or update a detected media item for a specific tab
   * Deduplicates by URL or media ID or title
   */
  async addDetectedAudio(item: DetectedMedia): Promise<boolean> {
    try {
      const items = await this.getTabAudio(item.tabId);

      // Check if already detected (deduplicate)
      const existingIndex = items.findIndex(
        (i) =>
          i.id === item.id ||
          (item.mediaUrl && i.mediaUrl === item.mediaUrl) ||
          (i.title === item.title && i.website === item.website)
      );

      if (existingIndex >= 0) {
        // Merge attributes and update live playback status
        items[existingIndex] = {
          ...items[existingIndex],
          status: item.status || items[existingIndex].status,
          currentTime: item.currentTime ?? items[existingIndex].currentTime,
          duration: item.duration ?? items[existingIndex].duration,
          size: item.size ?? items[existingIndex].size,
          mediaUrl: item.mediaUrl || items[existingIndex].mediaUrl,
          downloadable: item.downloadable ?? items[existingIndex].downloadable,
          downloadReason: item.downloadReason || items[existingIndex].downloadReason,
          updatedAt: Date.now(),
        };
        await this.setTabAudio(item.tabId, items);
        return false; // updated
      } else {
        items.unshift(item);
        await this.setTabAudio(item.tabId, items);
        return true; // newly added
      }
    } catch (e) {
      console.error('Failed to add detected audio:', e);
      return false;
    }
  }

  /**
   * Clear all detected audio for a specific tab
   */
  async clearTabAudio(tabId: number): Promise<void> {
    try {
      const key = `tab_audio_${tabId}`;
      if (isChromeExtension) {
        await chrome.storage.local.remove(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`Failed to clear audio for tab ${tabId}:`, e);
    }
  }

  /**
   * Get download history
   */
  async getHistory(): Promise<HistoryItem[]> {
    try {
      if (isChromeExtension) {
        const result = await chrome.storage.local.get('audioflow_history');
        return (result.audioflow_history as HistoryItem[]) || [];
      } else {
        const raw = localStorage.getItem('audioflow_history');
        return raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
      return [];
    }
  }

  /**
   * Add item to download history
   */
  async addToHistory(item: HistoryItem): Promise<void> {
    try {
      const history = await this.getHistory();
      const filtered = history.filter((h) => h.id !== item.id && h.url !== item.url);
      filtered.unshift(item);
      const trimmed = filtered.slice(0, 200);
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_history: trimmed });
      } else {
        localStorage.setItem('audioflow_history', JSON.stringify(trimmed));
      }
    } catch (e) {
      console.error('Failed to add to history:', e);
    }
  }

  /**
   * Toggle favorite in history
   */
  async toggleFavorite(itemId: string): Promise<boolean> {
    try {
      const history = await this.getHistory();
      const item = history.find((h) => h.id === itemId);
      let isFav = false;
      if (item) {
        item.isFavorite = !item.isFavorite;
        isFav = item.isFavorite;
        if (isChromeExtension) {
          await chrome.storage.local.set({ audioflow_history: history });
        } else {
          localStorage.setItem('audioflow_history', JSON.stringify(history));
        }
      }
      return isFav;
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
      return false;
    }
  }

  /**
   * Remove item from history
   */
  async removeFromHistory(itemId: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const updated = history.filter((h) => h.id !== itemId);
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_history: updated });
      } else {
        localStorage.setItem('audioflow_history', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to delete history item:', e);
    }
  }

  /**
   * Clear all history
   */
  async clearAllHistory(): Promise<void> {
    try {
      if (isChromeExtension) {
        await chrome.storage.local.remove('audioflow_history');
      } else {
        localStorage.removeItem('audioflow_history');
      }
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }

  /**
   * Get active downloads stored in session
   */
  async getStoredDownloads(): Promise<DownloadItem[]> {
    try {
      if (isChromeExtension) {
        const result = await chrome.storage.local.get('audioflow_active_downloads');
        return (result.audioflow_active_downloads as DownloadItem[]) || [];
      } else {
        const raw = localStorage.getItem('audioflow_active_downloads');
        return raw ? JSON.parse(raw) : [];
      }
    } catch {
      return [];
    }
  }

  /**
   * Save active downloads
   */
  async saveStoredDownloads(downloads: DownloadItem[]): Promise<void> {
    try {
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_active_downloads: downloads });
      } else {
        localStorage.setItem('audioflow_active_downloads', JSON.stringify(downloads));
      }
    } catch (e) {
      console.warn('Failed to save downloads:', e);
    }
  }
}

export const storageService = new StorageService();
