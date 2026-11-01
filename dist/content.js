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
    if (e === "m3u8" || mime.includes("application/vnd.apple.mpegurl") || mime.includes("application/x-mpegurl")) return "hls";
    if (e === "mpd" || mime.includes("application/dash+xml")) return "dash";
    if (e === "mp4" || mime.includes("video/mp4") || mime.includes("audio/mp4")) return "mp4";
    if (e === "webm" || mime.includes("audio/webm") || mime.includes("video/webm")) return "webm";
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
    if (lowerUrl.endsWith(".ts") || lowerUrl.endsWith(".m4s") || lowerUrl.includes("seg-") || lowerUrl.includes("segment-") || lowerUrl.includes("range=")) {
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

  // src/content/index.ts
  console.log("[AudioFlow V2] Advanced Content Script initialized on:", window.location.href);
  var mediaRegistry = /* @__PURE__ */ new Map();
  var boundElements = /* @__PURE__ */ new WeakSet();
  function sendMediaToBackground(media) {
    mediaRegistry.set(media.id, media);
    try {
      chrome.runtime.sendMessage({
        type: "MEDIA_DETECTED",
        payload: media
      });
    } catch {
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
  function extractMediaMetadata(element) {
    const isYouTube = window.location.hostname.includes("youtube.com");
    const isSoundCloud = window.location.hostname.includes("soundcloud.com");
    if (isYouTube) {
      const titleElem = document.querySelector(
        "h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title, .ytp-title-link"
      );
      const title = titleElem?.textContent?.trim() || document.title.replace("- YouTube", "").trim();
      const channelElem = document.querySelector(
        "ytd-channel-name a, #channel-name a, #owner-name a, yt-formatted-string.ytd-channel-name, .ytd-video-owner-renderer a"
      );
      const artist = channelElem?.textContent?.trim() || void 0;
      return { title: title || "YouTube Video", artist };
    }
    if (isSoundCloud) {
      const scTitleElem = document.querySelector(
        '.playbackSoundBadge__titleLink, [data-testid="track-title"], .soundTitle__title'
      );
      let title = scTitleElem?.getAttribute("title") || scTitleElem?.textContent?.trim();
      const scArtistElem = document.querySelector(
        '.playbackSoundBadge__lightLink, .playbackSoundBadge__titleContextContainer a, .soundTitle__username, [data-testid="track-artist"]'
      );
      const artist = scArtistElem?.getAttribute("title") || scArtistElem?.textContent?.trim() || void 0;
      if (!title) {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
        title = ogTitle || document.title.replace("Stream ", "").replace("Listen to ", "").replace("on SoundCloud", "").trim();
      }
      return { title: title || "SoundCloud Track", artist };
    }
    const explicitTitle = element.getAttribute("title") || element.getAttribute("aria-label") || element.getAttribute("data-title") || element.getAttribute("data-track-name");
    const explicitArtist = element.getAttribute("data-artist") || element.getAttribute("data-creator") || element.getAttribute("data-author");
    if (explicitTitle && explicitTitle.trim()) {
      return { title: explicitTitle.trim(), artist: explicitArtist?.trim() };
    }
    const trackContainer = element.closest(".track, .song, .audio-player, .player, [data-track], article, li");
    if (trackContainer) {
      const heading = trackContainer.querySelector("h1, h2, h3, h4, .title, .track-title, .song-title");
      const artistElem = trackContainer.querySelector(".artist, .author, .creator, .byline, .channel");
      if (heading && heading.textContent?.trim()) {
        return {
          title: heading.textContent.trim(),
          artist: artistElem?.textContent?.trim() || void 0
        };
      }
    }
    if (element instanceof HTMLAnchorElement && element.textContent?.trim()) {
      return { title: element.textContent.trim() };
    }
    const cleanDocTitle = document.title.replace(/[-|].*$/, "").trim();
    return { title: cleanDocTitle || "Web Audio" };
  }
  function inspectMediaElement(element) {
    const isVideo = element instanceof HTMLVideoElement;
    let src = element.currentSrc || element.src;
    if (!src) {
      const sourceEl = element.querySelector("source");
      if (sourceEl) src = sourceEl.src;
    }
    const { title, artist } = extractMediaMetadata(element);
    const status = getElementPlaybackStatus(element);
    const duration = isFinite(element.duration) && element.duration > 0 ? element.duration : void 0;
    const currentTime = isFinite(element.currentTime) ? element.currentTime : void 0;
    const isYouTube = window.location.hostname.includes("youtube.com");
    const isSoundCloud = window.location.hostname.includes("soundcloud.com");
    let mediaType = isVideo ? "video" : "audio";
    let sourceType = determineSourceType(src);
    let downloadable = false;
    let downloadReason = "";
    let format = getFormatFromMimeOrExt(void 0, getExtensionFromUrl(src));
    let streamingProtocol = void 0;
    if (isYouTube) {
      mediaType = "stream";
      sourceType = "STREAMING_MEDIA";
      streamingProtocol = "DASH / Adaptive WebM";
      downloadable = false;
      downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn YouTube (DASH/Blob), tu\xE2n th\u1EE7 ch\xEDnh s\xE1ch b\u1EA3n quy\u1EC1n";
    } else if (isSoundCloud) {
      const scDownloadBtn = document.querySelector(
        '.sc-button-download, a[href*="download"], a[title*="Download"], button[title*="Download"]'
      );
      const dlHref = scDownloadBtn?.getAttribute("href");
      if (dlHref && dlHref.startsWith("http") && !dlHref.includes("javascript:")) {
        downloadable = true;
        sourceType = "DIRECT_FILE";
        downloadReason = "Ph\xE1t hi\u1EC7n li\xEAn k\u1EBFt t\u1EA3i ch\xEDnh th\u1EE9c t\u1EEB t\xE1c gi\u1EA3 SoundCloud";
        src = dlHref;
      } else {
        mediaType = "stream";
        sourceType = "STREAMING_MEDIA";
        streamingProtocol = "HLS / SoundCloud Adaptive Stream";
        downloadable = false;
        downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn SoundCloud, t\xE1c gi\u1EA3 ch\u01B0a m\u1EDF t\u1EA3i tr\u1EF1c ti\u1EBFp";
      }
    } else if (src && isDirectAudioUrl(src)) {
      downloadable = true;
      sourceType = "DIRECT_FILE";
      downloadReason = "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1";
    } else if (src && src.startsWith("blob:")) {
      sourceType = "BLOB_MEDIA";
      streamingProtocol = "Blob MediaSource";
      downloadable = false;
      downloadReason = "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn qua Blob URL, kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp";
    } else if (src && src.startsWith("http")) {
      downloadable = isDirectAudioUrl(src);
      sourceType = downloadable ? "DIRECT_FILE" : "STREAMING_MEDIA";
      downloadReason = downloadable ? "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : "\u0110ang ph\xE1t tr\u1EF1c tuy\u1EBFn tr\xEAn website";
    } else {
      downloadable = false;
      sourceType = "UNKNOWN";
      downloadReason = "\u0110ang ph\xE1t \xE2m thanh tr\xEAn trang";
    }
    const mediaItem = createDetectedMediaItem({
      url: src || window.location.href,
      source: isYouTube ? "youtube-source" : isSoundCloud ? "soundcloud-source" : isVideo ? "dom-video" : "dom-audio",
      pageUrl: window.location.href,
      tabId: 0,
      title,
      artist,
      mediaType,
      format,
      sourceType,
      status,
      duration,
      currentTime,
      downloadable,
      downloadReason,
      streamingProtocol
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
        if (!name || !name.startsWith("http")) return;
        const sourceType = determineSourceType(name);
        if (sourceType === "DIRECT_FILE" && isDirectAudioUrl(name)) {
          if (!mediaRegistry.has(name)) {
            const item = createDetectedMediaItem({
              url: name,
              source: "performance-resource",
              pageUrl: window.location.href,
              tabId: 0,
              sourceType: "DIRECT_FILE",
              downloadable: true,
              downloadReason: "T\xE0i nguy\xEAn \xE2m thanh tr\u1EF1c ti\u1EBFp ph\xE1t hi\u1EC7n qua m\u1EA1ng"
            });
            sendMediaToBackground(item);
          }
        } else if (sourceType === "PLAYLIST") {
          if (!mediaRegistry.has(name)) {
            const item = createDetectedMediaItem({
              url: name,
              source: "hls-manifest",
              pageUrl: window.location.href,
              tabId: 0,
              sourceType: "PLAYLIST",
              format: name.includes(".m3u8") ? "hls" : "dash",
              downloadable: false,
              downloadReason: "Danh s\xE1ch ph\xE1t \u0111a ph\xE2n \u0111o\u1EA1n (HLS/DASH Playlist)"
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
      'a[href*=".mp3"], a[href*=".wav"], a[href*=".flac"], a[href*=".m4a"], a[href*=".aac"], a[href*=".ogg"], a[href*=".opus"], a[href*=".webm"], a[href*=".mp4"]'
    );
    links.forEach((link) => {
      const href = link.href;
      if (href && href.startsWith("http") && isDirectAudioUrl(href)) {
        const { title, artist } = extractMediaMetadata(link);
        const item = createDetectedMediaItem({
          url: href,
          source: "dom-link",
          pageUrl: window.location.href,
          tabId: 0,
          title,
          artist,
          sourceType: "DIRECT_FILE",
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
