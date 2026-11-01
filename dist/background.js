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
      const existingIndex = items.findIndex(
        (i) => i.id === item.id || item.mediaUrl && i.mediaUrl === item.mediaUrl || i.title === item.title && i.website === item.website
      );
      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex],
          status: item.status || items[existingIndex].status,
          currentTime: item.currentTime ?? items[existingIndex].currentTime,
          duration: item.duration ?? items[existingIndex].duration,
          size: item.size ?? items[existingIndex].size,
          mediaUrl: item.mediaUrl || items[existingIndex].mediaUrl,
          downloadable: item.downloadable ?? items[existingIndex].downloadable,
          downloadReason: item.downloadReason || items[existingIndex].downloadReason,
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
function getDomainFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
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
function getFormatFromMimeOrExt(mimeType, ext) {
  const mime = (mimeType || "").toLowerCase();
  const e = (ext || "").toLowerCase().replace(/^\./, "");
  if (e === "mp3" || mime.includes("audio/mpeg") || mime.includes("audio/mp3")) return "mp3";
  if (e === "wav" || mime.includes("audio/wav") || mime.includes("audio/x-wav")) return "wav";
  if (e === "flac" || mime.includes("audio/flac") || mime.includes("audio/x-flac")) return "flac";
  if (e === "m4a" || mime.includes("audio/m4a") || mime.includes("audio/x-m4a")) return "m4a";
  if (e === "aac" || mime.includes("audio/aac")) return "aac";
  if (e === "ogg" || mime.includes("audio/ogg") || mime.includes("application/ogg")) return "ogg";
  if (e === "opus" || mime.includes("audio/opus")) return "opus";
  if (e === "webm" || mime.includes("audio/webm")) return "webm";
  return "unknown";
}

// src/services/downloadManager.ts
var isChromeExtension2 = typeof chrome !== "undefined" && !!chrome.downloads;
var DownloadManager = class {
  /**
   * Start downloading an audio item
   */
  async startDownload(params) {
    const settings = await storageService.getSettings();
    const cleanName = cleanFilename(params.filename);
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
          size: params.size,
          bytesReceived: 0,
          totalBytes: params.size || 0,
          state: "in_progress",
          canResume: false,
          paused: false,
          startTime: Date.now(),
          domain: params.domain || "unknown"
        };
        const current = await storageService.getStoredDownloads();
        current.unshift(newDownload);
        await storageService.saveStoredDownloads(current.slice(0, 50));
        return downloadId;
      } catch (error) {
        console.error("Failed to initiate download:", error);
        throw error;
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
        console.warn(`Failed downloading ${item.filename}:`, e);
      }
    }
    return downloadIds;
  }
  /**
   * Pause an active download
   */
  async pauseDownload(downloadId) {
    if (isChromeExtension2) {
      try {
        await chrome.downloads.pause(downloadId);
      } catch (e) {
        console.error("Failed to pause download:", e);
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
        console.error("Failed to resume download:", e);
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
        const current = await storageService.getStoredDownloads();
        const updated = current.filter((d) => d.downloadId !== downloadId);
        await storageService.saveStoredDownloads(updated);
      } catch (e) {
        console.error("Failed to cancel download:", e);
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
   * Query recent downloads from Chrome API
   */
  async getChromeDownloads() {
    if (!isChromeExtension2) {
      return storageService.getStoredDownloads();
    }
    try {
      const items = await chrome.downloads.search({
        limit: 30,
        orderBy: ["-startTime"]
      });
      return items.filter((item) => {
        const ext = getExtensionFromUrl(item.filename || item.url);
        const mime = item.mime || "";
        return mime.startsWith("audio/") || ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "webm"].includes(ext);
      }).map((item) => {
        const ext = getExtensionFromUrl(item.filename || item.url);
        return {
          downloadId: item.id,
          url: item.url,
          filename: cleanFilename(item.filename || "audio.mp3"),
          format: getFormatFromMimeOrExt(item.mime, ext),
          size: item.totalBytes > 0 ? item.totalBytes : void 0,
          bytesReceived: item.bytesReceived,
          totalBytes: item.totalBytes,
          state: item.state,
          canResume: item.canResume,
          paused: item.paused,
          error: item.error,
          startTime: item.startTime ? new Date(item.startTime).getTime() : Date.now(),
          domain: "web"
        };
      });
    } catch (e) {
      console.warn("Failed to query chrome downloads:", e);
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
  "webm"
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
  "audio/webm"
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
  if (lowerUrl.startsWith("blob:")) {
    return "BLOB";
  }
  if (lowerUrl.includes(".m3u8") || lowerUrl.includes(".mpd") || lowerUrl.includes("googlevideo.com") || lowerUrl.includes("manifest") || lowerUrl.includes("stream") || lowerUrl.includes("segment")) {
    return "STREAMING";
  }
  if (isDirectAudioUrl(url) || isAudioMimeType(mimeType)) {
    return "DIRECT";
  }
  if (url.startsWith("http")) {
    return "DIRECT";
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
    mediaType = "audio",
    format: initialFormat,
    sourceType: initialSourceType,
    status = "UNKNOWN",
    duration,
    currentTime,
    size,
    mimeType = "",
    downloadable: initialDownloadable,
    downloadReason: initialReason
  } = params;
  const domain = getDomainFromUrl(pageUrl || url);
  const ext = getExtensionFromUrl(url);
  const format = initialFormat || getFormatFromMimeOrExt(mimeType, ext);
  const sourceType = initialSourceType || determineSourceType(url, mimeType);
  let title = (initialTitle || "").trim();
  if (!title) {
    if (domain.includes("youtube.com")) {
      title = "YouTube Media";
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
  const cleanBase = title.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  const finalExt = format !== "unknown" ? format : "mp3";
  const filename = cleanFilename(`${cleanBase}.${finalExt}`);
  let downloadable = false;
  let downloadReason = "";
  if (initialDownloadable !== void 0) {
    downloadable = initialDownloadable;
    downloadReason = initialReason || (downloadable ? "S\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : "Kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp");
  } else if (domain.includes("youtube.com")) {
    downloadable = false;
    downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn YouTube (DASH/Blob), tu\xE2n th\u1EE7 ch\xEDnh s\xE1ch b\u1EA3n quy\u1EC1n";
  } else if (sourceType === "BLOB" || sourceType === "STREAMING") {
    downloadable = false;
    downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn (Streaming), kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp";
  } else if (isDirectAudioUrl(url) || url.startsWith("http")) {
    downloadable = true;
    downloadReason = "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1";
  } else {
    downloadable = false;
    downloadReason = "Ch\u01B0a x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt t\u1EA3i tr\u1EF1c ti\u1EBFp";
  }
  const id = generateMediaId(url, pageUrl, title);
  const now = Date.now();
  return {
    id,
    tabId,
    title,
    filename,
    website: domain,
    pageUrl,
    mediaUrl: url,
    mediaType,
    format: format !== "unknown" ? format : "mp3",
    sourceType,
    status,
    duration: duration && duration > 0 ? duration : void 0,
    currentTime: currentTime && currentTime >= 0 ? currentTime : void 0,
    size: size && size > 0 ? size : void 0,
    downloadable,
    downloadReason,
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
      await chrome.action.setBadgeBackgroundColor({ color: "#22D3EE", tabId });
    } else if (count > 0) {
      await chrome.action.setBadgeText({ text: count.toString(), tabId });
      await chrome.action.setBadgeBackgroundColor({ color: "#7C3AED", tabId });
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
        const minBytes = (settings.minFileSizeKB || 0) * 1024;
        if (contentLength > 0 && contentLength < minBytes) {
          return;
        }
        let pageUrl = details.initiator || details.url;
        try {
          const tab = await chrome.tabs.get(details.tabId);
          if (tab && tab.url) {
            pageUrl = tab.url;
          }
        } catch {
        }
        const item = createDetectedMediaItem({
          url: details.url,
          source: "network-request",
          pageUrl,
          tabId: details.tabId,
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
