"use strict";
(() => {
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

  // src/content/index.ts
  console.log("[AudioFlow] Content script initialized on:", window.location.href);
  var mediaRegistry = /* @__PURE__ */ new Map();
  var boundElements = /* @__PURE__ */ new WeakSet();
  function sendMediaToBackground(media) {
    mediaRegistry.set(media.id, media);
    try {
      chrome.runtime.sendMessage({
        type: "MEDIA_DETECTED",
        payload: media
      });
    } catch (err) {
    }
  }
  function getElementPlaybackStatus(el) {
    if (el.ended) return "ENDED";
    if (el.seeking || el.readyState === 1 || el.readyState === 2 && !el.paused) {
      return "BUFFERING";
    }
    if (!el.paused && !el.ended && el.readyState >= 2) {
      return "PLAYING";
    }
    if (el.paused && el.currentTime > 0) {
      return "PAUSED";
    }
    if (el.paused) {
      return "PAUSED";
    }
    return "UNKNOWN";
  }
  function extractTitleFromContext(element) {
    const explicit = element.getAttribute("title") || element.getAttribute("aria-label") || element.getAttribute("data-title") || element.getAttribute("data-track-name");
    if (explicit && explicit.trim()) return explicit.trim();
    if (window.location.hostname.includes("youtube.com")) {
      const ytElem = document.querySelector(
        "h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title, .ytp-title-link"
      );
      if (ytElem && ytElem.textContent?.trim()) {
        return ytElem.textContent.trim();
      }
      return document.title.replace("- YouTube", "").trim();
    }
    if (window.location.hostname.includes("soundcloud.com")) {
      const scTitle = document.querySelector(
        '.playbackSoundBadge__titleLink, [data-testid="track-title"], .soundTitle__title'
      );
      if (scTitle) {
        const titleAttr = scTitle.getAttribute("title");
        if (titleAttr?.trim()) return titleAttr.trim();
        if (scTitle.textContent?.trim()) return scTitle.textContent.trim();
      }
      return document.title.replace("Stream ", "").replace("Listen to ", "").replace("on SoundCloud", "").trim();
    }
    const trackContainer = element.closest(".track, .song, .audio-player, .player, [data-track], article, li");
    if (trackContainer) {
      const heading = trackContainer.querySelector("h1, h2, h3, h4, .title, .track-title, .song-title");
      if (heading && heading.textContent?.trim()) {
        return heading.textContent.trim();
      }
    }
    if (element instanceof HTMLAnchorElement && element.textContent?.trim()) {
      return element.textContent.trim();
    }
    const cleanDocTitle = document.title.replace(/[-|].*$/, "").trim();
    return cleanDocTitle || "Web Audio";
  }
  function inspectMediaElement(element) {
    const isVideo = element instanceof HTMLVideoElement;
    const isAudio = element instanceof HTMLAudioElement;
    let src = element.currentSrc || element.src;
    if (!src) {
      const sourceEl = element.querySelector("source");
      if (sourceEl) src = sourceEl.src;
    }
    const title = extractTitleFromContext(element);
    const status = getElementPlaybackStatus(element);
    const duration = isFinite(element.duration) && element.duration > 0 ? element.duration : void 0;
    const currentTime = isFinite(element.currentTime) ? element.currentTime : void 0;
    const isYouTube = window.location.hostname.includes("youtube.com");
    const isSoundCloud = window.location.hostname.includes("soundcloud.com");
    let mediaType = isVideo ? "video" : "audio";
    let downloadable = false;
    let downloadReason = "";
    if (isYouTube) {
      mediaType = "stream";
      downloadable = false;
      downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn YouTube (DASH/Blob), tu\xE2n th\u1EE7 b\u1EA3n quy\u1EC1n";
    } else if (isSoundCloud) {
      const scDownloadBtn = document.querySelector('.sc-button-download, a[href*="download"]');
      const dlHref = scDownloadBtn?.getAttribute("href");
      if (dlHref && dlHref.startsWith("http")) {
        downloadable = true;
        downloadReason = "Ph\xE1t hi\u1EC7n li\xEAn k\u1EBFt t\u1EA3i ch\xEDnh th\u1EE9c t\u1EEB t\xE1c gi\u1EA3 SoundCloud";
      } else {
        mediaType = "stream";
        downloadable = false;
        downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn SoundCloud, kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp";
      }
    } else if (src && isDirectAudioUrl(src)) {
      downloadable = true;
      downloadReason = "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1";
    } else if (src && src.startsWith("blob:")) {
      downloadable = false;
      downloadReason = "Ngu\u1ED3n ph\xE1t qua Blob URL, kh\xF4ng c\xF3 li\xEAn k\u1EBFt t\u1EA3i tr\u1EF1c ti\u1EBFp";
    } else if (src && src.startsWith("http")) {
      downloadable = isDirectAudioUrl(src);
      downloadReason = downloadable ? "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : "\u0110ang ph\xE1t tr\u1EF1c tuy\u1EBFn tr\xEAn website";
    } else {
      downloadable = false;
      downloadReason = "\u0110ang ph\xE1t \xE2m thanh tr\xEAn trang";
    }
    const mediaItem = createDetectedMediaItem({
      url: src || window.location.href,
      source: isYouTube ? "youtube-source" : isSoundCloud ? "soundcloud-source" : isVideo ? "dom-video" : "dom-audio",
      pageUrl: window.location.href,
      tabId: 0,
      title,
      mediaType,
      status,
      duration,
      currentTime,
      downloadable,
      downloadReason
    });
    sendMediaToBackground(mediaItem);
    if (!boundElements.has(element)) {
      boundElements.add(element);
      bindMediaEventListeners(element);
    }
  }
  function bindMediaEventListeners(element) {
    const events = [
      "play",
      "playing",
      "pause",
      "ended",
      "loadedmetadata",
      "volumechange",
      "ratechange"
    ];
    events.forEach((evtName) => {
      element.addEventListener(
        evtName,
        () => {
          inspectMediaElement(element);
        },
        { passive: true }
      );
    });
    let lastTimeUpdate = 0;
    element.addEventListener(
      "timeupdate",
      () => {
        const now = Date.now();
        if (now - lastTimeUpdate > 2500) {
          lastTimeUpdate = now;
          inspectMediaElement(element);
        }
      },
      { passive: true }
    );
  }
  function scanMediaElements() {
    const elements = document.querySelectorAll("audio, video");
    elements.forEach((el) => {
      inspectMediaElement(el);
    });
  }
  function scanPerformanceResources() {
    try {
      const resources = performance.getEntriesByType("resource");
      resources.forEach((res) => {
        const name = res.name;
        if (name && name.startsWith("http") && isDirectAudioUrl(name)) {
          if (!mediaRegistry.has(name)) {
            const item = createDetectedMediaItem({
              url: name,
              source: "performance-resource",
              pageUrl: window.location.href,
              tabId: 0,
              downloadable: true,
              downloadReason: "T\xE0i nguy\xEAn \xE2m thanh tr\u1EF1c ti\u1EBFp ph\xE1t hi\u1EC7n qua m\u1EA1ng"
            });
            sendMediaToBackground(item);
          }
        }
      });
    } catch {
    }
  }
  function scanDownloadLinks() {
    const links = document.querySelectorAll(
      'a[href*=".mp3"], a[href*=".wav"], a[href*=".flac"], a[href*=".m4a"], a[href*=".aac"], a[href*=".ogg"], a[href*=".opus"], a[href*=".webm"]'
    );
    links.forEach((link) => {
      const href = link.href;
      if (href && href.startsWith("http") && isDirectAudioUrl(href)) {
        const title = extractTitleFromContext(link);
        const item = createDetectedMediaItem({
          url: href,
          source: "dom-link",
          pageUrl: window.location.href,
          tabId: 0,
          title,
          downloadable: true,
          downloadReason: "Li\xEAn k\u1EBFt t\u1EA3i \xE2m thanh tr\u1EF1c ti\u1EBFp tr\xEAn website"
        });
        sendMediaToBackground(item);
      }
    });
  }
  function performFullScan() {
    scanMediaElements();
    scanPerformanceResources();
    scanDownloadLinks();
    return Array.from(mediaRegistry.values());
  }
  performFullScan();
  var observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node instanceof HTMLElement) {
            if (node.tagName === "AUDIO" || node.tagName === "VIDEO" || node.querySelector("audio, video")) {
              shouldScan = true;
              break;
            }
          }
        }
      }
      if (shouldScan) break;
    }
    if (shouldScan) {
      scanMediaElements();
    }
  });
  var startObserver = () => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  };
  if (document.body) {
    startObserver();
  } else {
    document.addEventListener("DOMContentLoaded", startObserver);
  }
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "SCAN_PAGE" || msg.type === "SCAN_MEDIA") {
      const freshMedia = performFullScan();
      sendResponse({
        success: true,
        count: freshMedia.length,
        media: freshMedia
      });
      return true;
    }
  });
})();
