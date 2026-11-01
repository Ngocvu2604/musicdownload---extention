// src/storage/storageService.ts
var DEFAULT_SETTINGS = {
  autoDetect: true,
  minFileSizeKB: 50,
  minDurationSeconds: 1,
  downloadSubfolder: "AudioFlow",
  promptFilename: false,
  audioNotification: true,
  theme: "dark"
};
var isChromeExtension = typeof chrome !== "undefined" && !!chrome.storage?.local;
var StorageService = class {
  /**
   * Get user settings
   */
  async getSettings() {
    try {
      if (isChromeExtension) {
        const result = await chrome.storage.local.get("audioflow_settings");
        if (result.audioflow_settings) {
          return { ...DEFAULT_SETTINGS, ...result.audioflow_settings };
        }
      } else {
        const raw = localStorage.getItem("audioflow_settings");
        if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn("Failed to get settings from storage:", e);
    }
    return DEFAULT_SETTINGS;
  }
  /**
   * Save user settings
   */
  async saveSettings(settings) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    try {
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_settings: updated });
      } else {
        localStorage.setItem("audioflow_settings", JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Failed to save settings:", e);
    }
    return updated;
  }
  /**
   * Get detected media items for a specific tab
   */
  async getTabAudio(tabId) {
    try {
      const key = `tab_audio_${tabId}`;
      if (isChromeExtension) {
        const result = await chrome.storage.local.get(key);
        return result[key] || [];
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
  async setTabAudio(tabId, items) {
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
  async addDetectedAudio(item) {
    try {
      const items = await this.getTabAudio(item.tabId);
      const isGenericTitle = !item.title || item.title === "SoundCloud Track" || item.title === "YouTube Video Media" || item.title === "Web Audio";
      const existingIndex = items.findIndex(
        (i) => i.id === item.id || item.mediaUrl && i.mediaUrl === item.mediaUrl || !isGenericTitle && i.title.toLowerCase() === item.title.toLowerCase() && i.website === item.website
      );
      if (existingIndex >= 0) {
        const existing = items[existingIndex];
        const hasBetterTitle = item.title && item.title !== "SoundCloud Track" && item.title !== "YouTube Video Media" && item.title !== "Web Audio";
        items[existingIndex] = {
          ...existing,
          title: hasBetterTitle ? item.title : existing.title,
          artist: item.artist || existing.artist,
          filename: hasBetterTitle ? item.filename : existing.filename,
          format: item.format !== "unknown" ? item.format : existing.format,
          sourceType: item.sourceType !== "UNKNOWN" ? item.sourceType : existing.sourceType,
          status: item.status !== "UNKNOWN" ? item.status : existing.status,
          downloadStatus: item.downloadStatus || existing.downloadStatus,
          currentTime: item.currentTime ?? existing.currentTime,
          duration: item.duration ?? existing.duration,
          size: item.size && item.size > (existing.size || 0) ? item.size : existing.size,
          mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith("blob:") ? item.mediaUrl : existing.mediaUrl || item.mediaUrl,
          downloadable: item.downloadable !== void 0 ? item.downloadable : existing.downloadable,
          downloadReason: item.downloadReason || existing.downloadReason,
          streamingProtocol: item.streamingProtocol || existing.streamingProtocol,
          updatedAt: Date.now()
        };
        await this.setTabAudio(item.tabId, items);
        return false;
      } else {
        items.unshift(item);
        await this.setTabAudio(item.tabId, items);
        return true;
      }
    } catch (e) {
      console.error("Failed to add detected audio:", e);
      return false;
    }
  }
  /**
   * Clear all detected audio for a specific tab
   */
  async clearTabAudio(tabId) {
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
  async getHistory() {
    try {
      if (isChromeExtension) {
        const result = await chrome.storage.local.get("audioflow_history");
        return result.audioflow_history || [];
      } else {
        const raw = localStorage.getItem("audioflow_history");
        return raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn("Failed to load history:", e);
      return [];
    }
  }
  /**
   * Add item to download history
   */
  async addToHistory(item) {
    try {
      const history = await this.getHistory();
      const filtered = history.filter((h) => h.id !== item.id && h.url !== item.url);
      filtered.unshift(item);
      const trimmed = filtered.slice(0, 200);
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_history: trimmed });
      } else {
        localStorage.setItem("audioflow_history", JSON.stringify(trimmed));
      }
    } catch (e) {
      console.error("Failed to add to history:", e);
    }
  }
  /**
   * Toggle favorite in history
   */
  async toggleFavorite(itemId) {
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
          localStorage.setItem("audioflow_history", JSON.stringify(history));
        }
      }
      return isFav;
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
      return false;
    }
  }
  /**
   * Remove item from history
   */
  async removeFromHistory(itemId) {
    try {
      const history = await this.getHistory();
      const updated = history.filter((h) => h.id !== itemId);
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_history: updated });
      } else {
        localStorage.setItem("audioflow_history", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to delete history item:", e);
    }
  }
  /**
   * Clear all history
   */
  async clearAllHistory() {
    try {
      if (isChromeExtension) {
        await chrome.storage.local.remove("audioflow_history");
      } else {
        localStorage.removeItem("audioflow_history");
      }
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
  }
  /**
   * Get active downloads stored in session
   */
  async getStoredDownloads() {
    try {
      if (isChromeExtension) {
        const result = await chrome.storage.local.get("audioflow_active_downloads");
        return result.audioflow_active_downloads || [];
      } else {
        const raw = localStorage.getItem("audioflow_active_downloads");
        return raw ? JSON.parse(raw) : [];
      }
    } catch {
      return [];
    }
  }
  /**
   * Save active downloads
   */
  async saveStoredDownloads(downloads) {
    try {
      if (isChromeExtension) {
        await chrome.storage.local.set({ audioflow_active_downloads: downloads });
      } else {
        localStorage.setItem("audioflow_active_downloads", JSON.stringify(downloads));
      }
    } catch (e) {
      console.warn("Failed to save downloads:", e);
    }
  }
};
var storageService = new StorageService();

// src/utils/formatters.ts
function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0 || !isFinite(bytesPerSec)) {
    return "-- KB/s";
  }
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}
function getDomainFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
function parseFilenameFromContentDisposition(header) {
  if (!header) return null;
  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;\r\n]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const normalMatch = header.match(/filename\s*=\s*(?:"([^"]+)"|([^;\r\n]+))/i);
  if (normalMatch) {
    const raw = normalMatch[1] || normalMatch[2];
    if (raw) return raw.trim();
  }
  return null;
}
function buildSanitizedFilename(title, artist, ext = "mp3") {
  let base = title.trim();
  if (artist && artist.trim() && !base.toLowerCase().includes(artist.toLowerCase())) {
    base = `${artist.trim()} - ${base}`;
  }
  return cleanFilename(base, ext);
}
function cleanFilename(name, fallbackExt = "mp3") {
  if (!name || !name.trim()) {
    name = `audio_${Date.now()}`;
  }
  let clean = name.split("?")[0].split("#")[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {
  }
  clean = clean.replace(/\\/g, "/");
  if (clean.includes("/")) {
    clean = clean.substring(clean.lastIndexOf("/") + 1);
  }
  clean = clean.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
  if (!/\.[a-zA-Z0-9]{2,5}$/.test(clean)) {
    clean = `${clean}.${fallbackExt}`;
  }
  return clean || `audio_${Date.now()}.${fallbackExt}`;
}
function getExtensionFromUrl(url) {
  try {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const match = cleanUrl.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : "";
  } catch {
    return "";
  }
}
function parseSoundCloudDocTitle(rawDocTitle) {
  if (!rawDocTitle) return {};
  let clean = rawDocTitle.trim();
  clean = clean.replace(/\s*\|\s*Listen online for free on SoundCloud.*$/i, "");
  clean = clean.replace(/\s*\|\s*Free Listening on SoundCloud.*$/i, "");
  clean = clean.replace(/\s*\|\s*SoundCloud.*$/i, "");
  clean = clean.replace(/\s*on SoundCloud.*$/i, "");
  clean = clean.replace(/^Stream\s+/i, "");
  clean = clean.replace(/^Listen to\s+/i, "");
  clean = clean.trim();
  const byMatch = clean.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch && byMatch[1] && byMatch[2]) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
  }
  const dashMatch = clean.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch && dashMatch[1] && dashMatch[2]) {
    return { artist: dashMatch[1].trim(), title: dashMatch[2].trim() };
  }
  if (clean && clean.toLowerCase() !== "soundcloud") {
    return { title: clean };
  }
  return {};
}
function parseTitleAndArtistFromTab(tabTitle, tabUrl) {
  const domain = getDomainFromUrl(tabUrl);
  if (domain.includes("soundcloud.com")) {
    const scParsed = parseSoundCloudDocTitle(tabTitle);
    if (scParsed.title) {
      return { title: scParsed.title, artist: scParsed.artist };
    }
  }
  if (domain.includes("youtube.com")) {
    const ytTitle = tabTitle.replace(/\s*-\s*YouTube.*$/i, "").trim();
    if (ytTitle) return { title: ytTitle };
  }
  const generalTitle = tabTitle.replace(/[-|•].*$/, "").trim();
  return { title: generalTitle || `${domain} Media` };
}
function getFormatFromMimeOrExt(mimeType, ext) {
  const mime = (mimeType || "").toLowerCase();
  const e = (ext || "").toLowerCase().replace(/^\./, "");
  if (mime.includes("audio/mpeg") || mime.includes("audio/mp3")) return "mp3";
  if (mime.includes("audio/m4a") || mime.includes("audio/x-m4a")) return "m4a";
  if (mime.includes("audio/aac") || mime.includes("audio/x-aac")) return "aac";
  if (mime.includes("audio/wav") || mime.includes("audio/x-wav")) return "wav";
  if (mime.includes("audio/flac") || mime.includes("audio/x-flac")) return "flac";
  if (mime.includes("audio/ogg") || mime.includes("application/ogg")) return "ogg";
  if (mime.includes("audio/opus")) return "opus";
  if (mime.includes("audio/webm") || mime.includes("video/webm")) return "webm";
  if (mime.includes("audio/mp4")) return "m4a";
  if (mime.includes("video/mp4")) return "mp4";
  if (mime.includes("application/vnd.apple.mpegurl") || mime.includes("application/x-mpegurl")) return "hls";
  if (mime.includes("application/dash+xml")) return "dash";
  if (e === "mp3") return "mp3";
  if (e === "m4a") return "m4a";
  if (e === "aac") return "aac";
  if (e === "wav") return "wav";
  if (e === "flac") return "flac";
  if (e === "ogg") return "ogg";
  if (e === "opus") return "opus";
  if (e === "m3u8") return "hls";
  if (e === "mpd") return "dash";
  if (e === "mp4") return "mp4";
  if (e === "webm") return "webm";
  return "unknown";
}

// src/services/sourceValidator.ts
var SourceValidator = class {
  /**
   * Validate a media source URL before downloading
   */
  async validateSource(url) {
    if (!url || typeof url !== "string") {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: "URL kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng"
      };
    }
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn (Blob/Data URI), kh\xF4ng h\u1ED7 tr\u1EE3 t\u1EA3i tr\u1EF1c ti\u1EBFp qua HTTP"
      };
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: "Giao th\u1EE9c kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 (ch\u1EC9 h\u1ED7 tr\u1EE3 http/https)"
      };
    }
    try {
      let response = null;
      let usedRangeGet = false;
      try {
        response = await fetch(url, {
          method: "HEAD",
          credentials: "omit",
          headers: {
            "Accept": "audio/*, video/*, */*"
          }
        });
      } catch {
        usedRangeGet = true;
      }
      if (usedRangeGet || !response || response.status === 405 || response.status === 403) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6e3);
          response = await fetch(url, {
            method: "GET",
            headers: {
              "Range": "bytes=0-1",
              "Accept": "audio/*, video/*, */*"
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
        } catch (e) {
          return {
            isValid: false,
            isAudioOrVideo: false,
            error: `L\u1ED7i k\u1EBFt n\u1ED1i t\u1EDBi m\xE1y ch\u1EE7 ngu\u1ED3n: ${e?.message || "Network error"}`
          };
        }
      }
      if (!response) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          error: "Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i t\u1EEB m\xE1y ch\u1EE7 ngu\u1ED3n"
        };
      }
      const status = response.status;
      if (status === 404 || status === 410) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          error: `T\xE0i nguy\xEAn kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c li\xEAn k\u1EBFt \u0111\xE3 h\u1EBFt h\u1EA1n (HTTP ${status})`
        };
      }
      if (status === 401 || status === 403) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          error: `M\xE1y ch\u1EE7 y\xEAu c\u1EA7u quy\u1EC1n truy c\u1EADp ho\u1EB7c x\xE1c th\u1EF1c (HTTP ${status})`
        };
      }
      if (status >= 500) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          error: `M\xE1y ch\u1EE7 ngu\u1ED3n g\u1EB7p l\u1ED7i n\u1ED9i b\u1ED9 (HTTP ${status})`
        };
      }
      const rawContentType = response.headers.get("content-type") || "";
      const contentType = rawContentType.toLowerCase();
      if (contentType.includes("text/html") || contentType.includes("application/json") || contentType.includes("text/plain")) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          contentType,
          error: "Li\xEAn k\u1EBFt tr\u1EA3 v\u1EC1 n\u1ED9i dung trang Web/HTML, kh\xF4ng ph\u1EA3i file \xE2m thanh h\u1EE3p l\u1EC7 (URL c\xF3 th\u1EC3 \u0111\xE3 h\u1EBFt h\u1EA1n)"
        };
      }
      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : void 0;
      const contentDisposition = response.headers.get("content-disposition");
      const filenameFromHeader = parseFilenameFromContentDisposition(contentDisposition || void 0);
      const ext = getExtensionFromUrl(url);
      const isMediaMime = contentType.startsWith("audio/") || contentType.startsWith("video/") || contentType.includes("application/ogg") || contentType.includes("application/vnd.apple.mpegurl") || contentType.includes("application/octet-stream");
      const suggestedFormat = getFormatFromMimeOrExt(contentType, ext);
      return {
        isValid: true,
        isAudioOrVideo: isMediaMime || suggestedFormat !== "unknown",
        contentType,
        contentLength: contentLength && contentLength > 0 ? contentLength : void 0,
        contentDispositionFilename: filenameFromHeader || void 0,
        httpStatus: status,
        suggestedFormat
      };
    } catch (err) {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: `Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c ngu\u1ED3n: ${err?.message || "Network error"}`
      };
    }
  }
};
var sourceValidator = new SourceValidator();

// src/services/downloadManager.ts
var isChromeExtension2 = typeof chrome !== "undefined" && !!chrome.downloads;
var speedTracker = /* @__PURE__ */ new Map();
var DownloadManager = class {
  /**
   * Start downloading an audio item with smart pre-validation
   */
  async startDownload(params) {
    const settings = await storageService.getSettings();
    let finalFilename = params.filename;
    let validatedSize = params.size;
    if (!params.skipValidation) {
      const validation = await sourceValidator.validateSource(params.url);
      if (!validation.isValid) {
        throw new Error(validation.error || "Ngu\u1ED3n kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c kh\xF4ng c\xF3 quy\u1EC1n truy c\u1EADp");
      }
      if (validation.contentDispositionFilename) {
        finalFilename = validation.contentDispositionFilename;
      }
      if (validation.contentLength) {
        validatedSize = validation.contentLength;
      }
      if (validation.suggestedFormat && validation.suggestedFormat !== "unknown") {
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
      const folder = settings.downloadSubfolder.trim().replace(/[<>:"/\\|?*]/g, "_");
      targetFilename = `${folder}/${cleanName}`;
    }
    if (isChromeExtension2) {
      try {
        const downloadId = await chrome.downloads.download({
          url: params.url,
          filename: targetFilename,
          conflictAction: "uniquify",
          saveAs: params.saveAs !== void 0 ? params.saveAs : settings.promptFilename
        });
        const ext = getExtensionFromUrl(cleanName);
        const format = getFormatFromMimeOrExt(void 0, ext);
        const newDownload = {
          downloadId,
          audioId: params.audioId,
          url: params.url,
          filename: cleanName,
          format,
          size: validatedSize,
          bytesReceived: 0,
          totalBytes: validatedSize || 0,
          state: "in_progress",
          downloadStatus: "DOWNLOADING",
          canResume: false,
          paused: false,
          startTime: Date.now(),
          domain: params.domain || "unknown",
          retryCount: 0
        };
        speedTracker.set(downloadId, { lastBytes: 0, lastTime: Date.now() });
        const current = await storageService.getStoredDownloads();
        current.unshift(newDownload);
        await storageService.saveStoredDownloads(current.slice(0, 50));
        return downloadId;
      } catch (error) {
        console.error("[AudioFlow] Failed to initiate download:", error);
        throw new Error(error?.message || "Kh\xF4ng th\u1EC3 b\u1EAFt \u0111\u1EA7u t\u1EA3i xu\u1ED1ng qua Chrome Downloads API");
      }
    } else {
      const a = document.createElement("a");
      a.href = params.url;
      a.download = cleanName;
      a.target = "_blank";
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
  async batchDownload(items) {
    const downloadIds = [];
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
  async retryDownload(downloadId) {
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
        saveAs: false
      });
      const updated = downloads.filter((d) => d.downloadId !== downloadId);
      await storageService.saveStoredDownloads(updated);
      return newId;
    } catch (e) {
      item.error = e?.message || "Th\u1EED l\u1EA1i th\u1EA5t b\u1EA1i";
      item.retryCount = (item.retryCount || 0) + 1;
      await storageService.saveStoredDownloads(downloads);
      throw e;
    }
  }
  /**
   * Pause an active download
   */
  async pauseDownload(downloadId) {
    if (isChromeExtension2) {
      try {
        await chrome.downloads.pause(downloadId);
      } catch (e) {
        console.error("[AudioFlow] Failed to pause download:", e);
      }
    }
  }
  /**
   * Resume a paused download
   */
  async resumeDownload(downloadId) {
    if (isChromeExtension2) {
      try {
        await chrome.downloads.resume(downloadId);
      } catch (e) {
        console.error("[AudioFlow] Failed to resume download:", e);
      }
    }
  }
  /**
   * Cancel a download
   */
  async cancelDownload(downloadId) {
    if (isChromeExtension2) {
      try {
        await chrome.downloads.cancel(downloadId);
        speedTracker.delete(downloadId);
        const current = await storageService.getStoredDownloads();
        const updated = current.filter((d) => d.downloadId !== downloadId);
        await storageService.saveStoredDownloads(updated);
      } catch (e) {
        console.error("[AudioFlow] Failed to cancel download:", e);
      }
    }
  }
  /**
   * Open the file in folder or show default downloads folder
   */
  showDownloadItem(downloadId) {
    if (isChromeExtension2) {
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
  openDownloadsFolder() {
    if (isChromeExtension2) {
      try {
        chrome.downloads.showDefaultFolder();
      } catch (e) {
        console.warn("Cannot open default folder:", e);
      }
    }
  }
  /**
   * Update download speed and progress from Chrome onChanged event
   */
  updateProgressAndSpeed(downloadId, bytesReceived) {
    const now = Date.now();
    const last = speedTracker.get(downloadId);
    let speed = 0;
    if (last) {
      const timeDelta = (now - last.lastTime) / 1e3;
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
      speedFormatted: formatSpeed(speed)
    };
  }
  /**
   * Query recent downloads from Chrome API with speed & status enrichment
   */
  async getChromeDownloads() {
    if (!isChromeExtension2) {
      return storageService.getStoredDownloads();
    }
    try {
      const items = await chrome.downloads.search({
        limit: 35,
        orderBy: ["-startTime"]
      });
      const stored = await storageService.getStoredDownloads();
      const storedMap = new Map(stored.map((s) => [s.downloadId, s]));
      return items.filter((item) => {
        const ext = getExtensionFromUrl(item.filename || item.url);
        const mime = item.mime || "";
        return mime.startsWith("audio/") || mime.startsWith("video/") || ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "webm", "mp4"].includes(ext);
      }).map((item) => {
        const ext = getExtensionFromUrl(item.filename || item.url);
        const existing = storedMap.get(item.id);
        let downloadStatus = "READY_TO_DOWNLOAD";
        if (item.state === "in_progress") downloadStatus = "DOWNLOADING";
        else if (item.state === "complete") downloadStatus = "COMPLETED";
        else if (item.state === "interrupted") downloadStatus = "FAILED";
        const { speed, speedFormatted } = this.updateProgressAndSpeed(item.id, item.bytesReceived);
        return {
          downloadId: item.id,
          audioId: existing?.audioId,
          url: item.url,
          filename: cleanFilename(item.filename || "audio.mp3"),
          format: getFormatFromMimeOrExt(item.mime, ext),
          size: item.totalBytes > 0 ? item.totalBytes : existing?.size,
          bytesReceived: item.bytesReceived,
          totalBytes: item.totalBytes,
          state: item.state,
          downloadStatus,
          canResume: item.canResume,
          paused: item.paused,
          error: item.error,
          speed: item.state === "in_progress" ? speed : void 0,
          speedFormatted: item.state === "in_progress" ? speedFormatted : void 0,
          startTime: item.startTime ? new Date(item.startTime).getTime() : Date.now(),
          domain: existing?.domain || "web",
          retryCount: existing?.retryCount || 0
        };
      });
    } catch (e) {
      console.warn("[AudioFlow] Failed to query chrome downloads:", e);
      return [];
    }
  }
};
var downloadManager = new DownloadManager();

// src/utils/audioDetector.ts
var SUPPORTED_AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "flac",
  "aac",
  "m4a",
  "ogg",
  "opus",
  "webm",
  "mp4"
];
var AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/ogg",
  "application/ogg",
  "audio/opus",
  "audio/webm",
  "video/mp4",
  "video/webm"
];
function generateMediaId(url, pageUrl, titleHint) {
  const seed = `${url || ""}_${pageUrl || ""}_${titleHint || ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `med_${Math.abs(hash).toString(36)}`;
}
function isDirectAudioUrl(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return false;
  }
  try {
    const cleanUrl = rawUrl.split("?")[0].split("#")[0].toLowerCase();
    return SUPPORTED_AUDIO_EXTENSIONS.some((ext) => cleanUrl.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}
function isAudioMimeType(mimeType) {
  if (!mimeType) return false;
  const lower = mimeType.toLowerCase();
  return lower.startsWith("audio/") || AUDIO_MIME_TYPES.some((m) => lower.includes(m));
}
function determineSourceType(url = "", mimeType = "") {
  const lowerUrl = url.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  if (lowerUrl.includes(".m3u8") || lowerMime.includes("application/vnd.apple.mpegurl") || lowerMime.includes("application/x-mpegurl") || lowerUrl.includes(".mpd") || lowerMime.includes("application/dash+xml")) {
    return "PLAYLIST";
  }
  if (lowerUrl.endsWith(".ts") || lowerUrl.endsWith(".m4s") || lowerUrl.includes("seg-") || lowerUrl.includes("segment-") || lowerUrl.includes("range=") || lowerUrl.includes("cf-hls-media.sndcdn.com") || lowerUrl.includes("cf-hls-opus.sndcdn.com")) {
    return "MEDIA_SEGMENT";
  }
  if (lowerUrl.startsWith("blob:")) {
    return "BLOB_MEDIA";
  }
  if (lowerUrl.includes("googlevideo.com") || lowerUrl.includes("manifest") || lowerUrl.includes("/stream/") || lowerUrl.includes("sndcdn.com/stream") || lowerUrl.includes("/hls/")) {
    return "STREAMING_MEDIA";
  }
  if (isDirectAudioUrl(url) || isAudioMimeType(mimeType)) {
    return "DIRECT_FILE";
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return "DIRECT_FILE";
  }
  return "UNKNOWN";
}
function createDetectedMediaItem(params) {
  const {
    url = "",
    source,
    pageUrl,
    tabId,
    title: initialTitle,
    artist,
    mediaType = "audio",
    format: initialFormat,
    sourceType: initialSourceType,
    status = "UNKNOWN",
    duration,
    currentTime,
    size,
    mimeType = "",
    downloadable: initialDownloadable,
    downloadReason: initialReason,
    streamingProtocol
  } = params;
  const domain = getDomainFromUrl(pageUrl || url);
  const ext = getExtensionFromUrl(url);
  const format = initialFormat || getFormatFromMimeOrExt(mimeType, ext);
  const sourceType = initialSourceType || determineSourceType(url, mimeType);
  let title = (initialTitle || "").trim();
  if (!title) {
    if (domain.includes("youtube.com")) {
      title = "YouTube Video Media";
    } else if (domain.includes("soundcloud.com")) {
      title = "SoundCloud Track";
    } else if (url && url.startsWith("http")) {
      try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split("/").filter(Boolean);
        title = segments[segments.length - 1] || "Web Audio";
      } catch {
        title = "Web Audio";
      }
    } else {
      title = `${domain} Media`;
    }
  }
  const finalExt = format !== "unknown" ? format : "mp3";
  const filename = buildSanitizedFilename(title, artist, finalExt);
  let downloadable = false;
  let downloadReason = "";
  let downloadStatus = "NOT_AVAILABLE";
  if (initialDownloadable !== void 0) {
    downloadable = initialDownloadable;
    downloadStatus = downloadable ? "READY_TO_DOWNLOAD" : "NOT_AVAILABLE";
    downloadReason = initialReason || (downloadable ? "S\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : "Kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp");
  } else if (domain.includes("youtube.com")) {
    downloadable = false;
    downloadStatus = "STREAMING_ONLY";
    downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn YouTube (DASH/Blob), tu\xE2n th\u1EE7 ch\xEDnh s\xE1ch b\u1EA3n quy\u1EC1n";
  } else if (sourceType === "BLOB_MEDIA" || sourceType === "BLOB") {
    downloadable = false;
    downloadStatus = "STREAMING_ONLY";
    downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn qua Blob URL, kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp";
  } else if (sourceType === "STREAMING_MEDIA" || sourceType === "STREAMING") {
    downloadable = false;
    downloadStatus = "STREAMING_ONLY";
    downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn (Streaming Media), kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp";
  } else if (sourceType === "PLAYLIST" || sourceType === "MEDIA_SEGMENT") {
    downloadable = false;
    downloadStatus = "STREAMING_ONLY";
    downloadReason = "Ngu\u1ED3n ph\xE1t qua ph\xE2n \u0111o\u1EA1n / playlist streaming";
  } else if (isDirectAudioUrl(url) || url.startsWith("http")) {
    downloadable = true;
    downloadStatus = "READY_TO_DOWNLOAD";
    downloadReason = "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1";
  } else {
    downloadable = false;
    downloadStatus = "NOT_AVAILABLE";
    downloadReason = "Ch\u01B0a x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt t\u1EA3i tr\u1EF1c ti\u1EBFp";
  }
  const id = generateMediaId(url, pageUrl, `${title}_${artist || ""}`);
  const now = Date.now();
  return {
    id,
    tabId,
    title,
    artist,
    filename,
    website: domain,
    pageUrl,
    mediaUrl: url,
    mediaType,
    format: format !== "unknown" ? format : "mp3",
    sourceType,
    status,
    downloadStatus,
    duration: duration && duration > 0 ? duration : void 0,
    currentTime: currentTime && currentTime >= 0 ? currentTime : void 0,
    size: size && size > 0 ? size : void 0,
    downloadable,
    downloadReason,
    streamingProtocol,
    source,
    mimeType,
    detectedAt: now,
    updatedAt: now
  };
}

// src/background/index.ts
console.log("[AudioFlow] Background Service Worker initialized.");
async function updateTabBadge(tabId) {
  if (tabId <= 0) return;
  try {
    const items = await storageService.getTabAudio(tabId);
    const count = items.length;
    const hasPlaying = items.some((i) => i.status === "PLAYING");
    if (hasPlaying) {
      await chrome.action.setBadgeText({ text: "\u25B6", tabId });
      await chrome.action.setBadgeBackgroundColor({ color: "#D62828", tabId });
    } else if (count > 0) {
      await chrome.action.setBadgeText({ text: count.toString(), tabId });
      await chrome.action.setBadgeBackgroundColor({ color: "#A61E22", tabId });
    } else {
      await chrome.action.setBadgeText({ text: "", tabId });
    }
  } catch {
  }
}
async function ensureContentScriptInjected(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
      return false;
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content.js"]
    });
    return true;
  } catch (err) {
    console.warn("[AudioFlow] Script injection failed:", err);
    return false;
  }
}
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    void (async () => {
      if (details.tabId <= 0 || !details.responseHeaders) return;
      try {
        const settings = await storageService.getSettings();
        if (!settings.autoDetect) return;
        let contentType = "";
        let contentLength = 0;
        for (const header of details.responseHeaders) {
          const name = header.name.toLowerCase();
          if (name === "content-type" && header.value) {
            contentType = header.value.toLowerCase();
          } else if (name === "content-length" && header.value) {
            contentLength = parseInt(header.value, 10) || 0;
          }
        }
        const isAudio = isAudioMimeType(contentType) || isDirectAudioUrl(details.url);
        if (!isAudio) return;
        const lowerUrl = details.url.toLowerCase();
        const isHlsSegment = lowerUrl.includes("cf-hls-media.sndcdn.com") || lowerUrl.includes("cf-hls-opus.sndcdn.com") || lowerUrl.endsWith(".ts") || lowerUrl.endsWith(".m4s") || lowerUrl.includes("/segment") || lowerUrl.includes("-frag") || lowerUrl.includes("playlist.m3u8");
        if (isHlsSegment && contentLength > 0 && contentLength < 35e4) {
          return;
        }
        const minBytes = (settings.minFileSizeKB || 0) * 1024;
        if (contentLength > 0 && contentLength < minBytes) {
          return;
        }
        let pageUrl = details.initiator || details.url;
        let tabTitle = "";
        try {
          const tab = await chrome.tabs.get(details.tabId);
          if (tab && tab.url) {
            pageUrl = tab.url;
          }
          if (tab && tab.title) {
            tabTitle = tab.title;
          }
        } catch {
        }
        const { title, artist } = parseTitleAndArtistFromTab(tabTitle, pageUrl);
        const format = getFormatFromMimeOrExt(contentType, getExtensionFromUrl(details.url));
        const item = createDetectedMediaItem({
          url: details.url,
          source: "network-request",
          pageUrl,
          tabId: details.tabId,
          title,
          artist,
          format,
          mimeType: contentType,
          size: contentLength > 0 ? contentLength : void 0,
          downloadable: true,
          downloadReason: "T\u1EC7p \xE2m thanh n\u1EA1p t\u1EEB m\u1EA1ng m\xE1y ch\u1EE7"
        });
        if (item) {
          await storageService.addDetectedAudio(item);
          await updateTabBadge(details.tabId);
        }
      } catch (err) {
        console.warn("[AudioFlow] Error in webRequest:", err);
      }
    })();
    return void 0;
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void (async () => {
    if (changeInfo.status === "loading" && changeInfo.url) {
      await storageService.clearTabAudio(tabId);
      await updateTabBadge(tabId);
    } else if (changeInfo.status === "complete" && tab.url && !tab.url.startsWith("chrome://")) {
      try {
        const settings = await storageService.getSettings();
        if (settings.autoDetect) {
          chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" }, () => {
            if (chrome.runtime.lastError) {
              void ensureContentScriptInjected(tabId).then((success) => {
                if (success) {
                  chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" }, () => {
                  });
                }
              });
            }
          });
        }
      } catch {
      }
    }
  })();
});
chrome.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    await updateTabBadge(activeInfo.tabId);
  })();
});
chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    await storageService.clearTabAudio(tabId);
  })();
});
chrome.downloads.onChanged.addListener((delta) => {
  void (async () => {
    try {
      const currentDownloads = await storageService.getStoredDownloads();
      const itemIndex = currentDownloads.findIndex((d) => d.downloadId === delta.id);
      if (itemIndex >= 0) {
        const item = currentDownloads[itemIndex];
        if (delta.state && delta.state.current) {
          item.state = delta.state.current;
        }
        if (delta.paused && delta.paused.current !== void 0) {
          item.paused = delta.paused.current;
        }
        if (delta.canResume && delta.canResume.current !== void 0) {
          item.canResume = delta.canResume.current;
        }
        if (delta.error && delta.error.current) {
          item.error = delta.error.current;
        }
        if (delta.totalBytes && delta.totalBytes.current !== void 0 && delta.totalBytes.current > 0) {
          item.totalBytes = delta.totalBytes.current;
          item.size = delta.totalBytes.current;
        }
        await storageService.saveStoredDownloads(currentDownloads);
        if (delta.state && delta.state.current === "complete") {
          const historyItem = {
            id: item.audioId || `dl_${item.downloadId}`,
            title: item.filename.replace(/\.[a-zA-Z0-9]{2,5}$/, "").replace(/[_+-]+/g, " "),
            filename: item.filename,
            url: item.url,
            format: item.format,
            size: item.size || item.totalBytes,
            domain: item.domain,
            downloadedAt: Date.now(),
            isFavorite: false
          };
          await storageService.addToHistory(historyItem);
        }
      }
    } catch (e) {
      console.error("[AudioFlow] Error handling download change:", e);
    }
  })();
});
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    const handleMessage = async () => {
      switch (message.type) {
        case "MEDIA_DETECTED":
        case "AUDIO_DETECTED": {
          if (message.payload) {
            const tabId = message.tabId || sender.tab?.id || 0;
            const item = { ...message.payload, tabId };
            await storageService.addDetectedAudio(item);
            if (tabId > 0) {
              await updateTabBadge(tabId);
            }
            return { success: true };
          }
          return { success: false, error: "No payload" };
        }
        case "SCAN_PAGE":
        case "SCAN_MEDIA": {
          const tabId = message.tabId || sender.tab?.id || 0;
          if (tabId <= 0) return { success: false, error: "Invalid tabId" };
          return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" }, (response) => {
              void (async () => {
                if (chrome.runtime.lastError || !response) {
                  const injected = await ensureContentScriptInjected(tabId);
                  if (injected) {
                    setTimeout(() => {
                      chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" }, () => {
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
        case "GET_TAB_AUDIO":
        case "GET_TAB_MEDIA": {
          const tabId = message.tabId || 0;
          const items = await storageService.getTabAudio(tabId);
          return { success: true, items };
        }
        case "CLEAR_TAB_AUDIO": {
          const tabId = message.tabId || 0;
          await storageService.clearTabAudio(tabId);
          await updateTabBadge(tabId);
          return { success: true };
        }
        case "VALIDATE_AND_DOWNLOAD":
        case "START_DOWNLOAD": {
          const payload = message.payload;
          if (!payload || !payload.url) {
            return { success: false, error: "URL is required" };
          }
          try {
            const downloadId = await downloadManager.startDownload({
              url: payload.url,
              filename: payload.filename,
              audioId: payload.audioId,
              domain: payload.domain,
              size: payload.size,
              saveAs: payload.saveAs
            });
            return { success: true, downloadId };
          } catch (err) {
            return { success: false, error: err?.message || "Download failed" };
          }
        }
        case "RETRY_DOWNLOAD": {
          if (message.payload?.downloadId) {
            try {
              const newId = await downloadManager.retryDownload(message.payload.downloadId);
              return { success: true, downloadId: newId };
            } catch (err) {
              return { success: false, error: err?.message || "Th\u1EED l\u1EA1i th\u1EA5t b\u1EA1i" };
            }
          }
          return { success: false, error: "downloadId is required" };
        }
        case "PAUSE_DOWNLOAD": {
          if (message.payload?.downloadId) {
            await downloadManager.pauseDownload(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }
        case "RESUME_DOWNLOAD": {
          if (message.payload?.downloadId) {
            await downloadManager.resumeDownload(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }
        case "CANCEL_DOWNLOAD": {
          if (message.payload?.downloadId) {
            await downloadManager.cancelDownload(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }
        case "SHOW_DOWNLOAD_ITEM": {
          if (message.payload?.downloadId) {
            downloadManager.showDownloadItem(message.payload.downloadId);
            return { success: true };
          }
          return { success: false };
        }
        case "OPEN_DOWNLOADS_FOLDER": {
          downloadManager.openDownloadsFolder();
          return { success: true };
        }
        case "GET_SETTINGS": {
          const settings = await storageService.getSettings();
          return { success: true, settings };
        }
        case "UPDATE_SETTINGS": {
          const updated = await storageService.saveSettings(message.payload || {});
          return { success: true, settings: updated };
        }
        default:
          return { success: false, error: "Unknown message type" };
      }
    };
    handleMessage().then(sendResponse).catch(
      (err) => sendResponse({ success: false, error: err?.message || "Internal error" })
    );
    return true;
  }
);
