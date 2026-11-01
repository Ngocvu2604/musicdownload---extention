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
  function buildSanitizedFilename(title, _artist, ext = "mp3") {
    return cleanFilename(title.trim(), ext);
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
    clean = clean.replace(/\s*\|\s*/g, " - ");
    clean = clean.replace(/[<>:"/\\?*\x00-\x1F]/g, "_").trim();
    clean = clean.replace(/_+/g, "_").replace(/\s+/g, " ").trim();
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
  function isStreamChunkOrFragment(rawUrl, sizeBytes) {
    if (!rawUrl) return false;
    const lower = rawUrl.toLowerCase();
    if (lower.includes(".m3u8") || lower.includes("/playlist") || lower.includes(".mpd")) {
      return false;
    }
    if (lower.includes("playback.media-streaming.soundcloud.cloud") || lower.includes("cf-hls-media.sndcdn.com") || lower.includes("cf-hls-opus.sndcdn.com") || lower.includes("googlevideo.com/videoplayback")) {
      return true;
    }
    if (/data\d+\.(m4a|mp3|aac|ts|m4s)/i.test(lower) || /seg(ment)?[-_]?\d+/i.test(lower) || /frag(ment)?[-_]?\d+/i.test(lower) || /chunk[-_]?\d+/i.test(lower) || lower.endsWith(".ts") || lower.endsWith(".m4s") || lower.includes("/hls/") || lower.includes("/dash/")) {
      if (sizeBytes !== void 0 && sizeBytes < 4e5) {
        return true;
      }
      if (/data\d+\.(m4a|mp3|aac|ts)/i.test(lower)) {
        return true;
      }
    }
    return false;
  }
  function isDirectAudioUrl(rawUrl) {
    if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
      return false;
    }
    if (isStreamChunkOrFragment(rawUrl)) {
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
    if (isStreamChunkOrFragment(url) || lowerUrl.endsWith(".ts") || lowerUrl.endsWith(".m4s") || lowerUrl.includes("seg-") || lowerUrl.includes("segment-") || lowerUrl.includes("range=") || lowerUrl.includes("cf-hls-media.sndcdn.com") || lowerUrl.includes("cf-hls-opus.sndcdn.com")) {
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
    const isVideo = params.mediaType === "video" || ext === "mp4" || mimeType.toLowerCase().includes("video/") || url.toLowerCase().includes(".mp4");
    const resolvedMediaType = params.mediaType || (isVideo ? "video" : "audio");
    const format = initialFormat || getFormatFromMimeOrExt(mimeType, ext) || (isVideo ? "mp4" : "mp3");
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
          title = segments[segments.length - 1] || (isVideo ? "Web Video" : "Web Audio");
        } catch {
          title = isVideo ? "Web Video" : "Web Audio";
        }
      } else {
        title = `${domain} Media`;
      }
    }
    const finalExt = format !== "unknown" && format !== "hls" && format !== "dash" ? format : isVideo ? "mp4" : "mp3";
    const filename = buildSanitizedFilename(title, artist, finalExt);
    let downloadable = false;
    let downloadReason = "";
    let downloadStatus = "NOT_AVAILABLE";
    if (isStreamChunkOrFragment(url, size)) {
      downloadable = false;
      downloadStatus = "STREAMING_ONLY";
      downloadReason = "Ph\xE2n \u0111o\u1EA1n \xE2m thanh lu\u1ED3ng ng\u1EAFn (chunk 50KB), kh\xF4ng ph\u1EA3i t\u1EC7p MP3/WAV ho\xE0n ch\u1EC9nh";
    } else if (initialDownloadable !== void 0) {
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
    } else if (sourceType === "PLAYLIST" || url.toLowerCase().includes(".m3u8")) {
      downloadable = true;
      downloadStatus = "READY_TO_DOWNLOAD";
      downloadReason = "S\u1EB5n s\xE0ng t\u1EA3i b\xE0i h\xE1t \u0111\u1EA7y \u0111\u1EE7 (Gh\xE9p t\u1EEB lu\u1ED3ng HLS ch\u1EA5t l\u01B0\u1EE3ng cao)";
    } else if (sourceType === "MEDIA_SEGMENT") {
      downloadable = false;
      downloadStatus = "STREAMING_ONLY";
      downloadReason = "Ph\xE2n \u0111o\u1EA1n \xE2m thanh ng\u1EAFn (chunk)";
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
      mediaType: resolvedMediaType,
      format: format !== "unknown" && format !== "hls" && format !== "dash" ? format : "mp3",
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
      const trackPageHeading = document.querySelector(
        'h1.soundTitle__title span, h1.soundTitle__title, .soundTitle__title span, .soundTitle__title, [data-testid="track-title"]'
      );
      const playerBadgeTitle = document.querySelector(
        "a.playbackSoundBadge__titleLink, .playbackSoundBadge__titleLink span, .playbackSoundBadge__titleLink, a.playbackSoundBadge__title"
      );
      let title = trackPageHeading?.textContent?.trim() || playerBadgeTitle?.getAttribute("title") || playerBadgeTitle?.textContent?.trim();
      const trackPageArtist = document.querySelector(
        '.soundTitle__usernameHero a, .soundTitle__username a, .soundTitle__username, [data-testid="track-artist"]'
      );
      const playerBadgeArtist = document.querySelector(
        "a.playbackSoundBadge__lightLink, .playbackSoundBadge__lightLink"
      );
      let artist = trackPageArtist?.textContent?.trim() || playerBadgeArtist?.getAttribute("title") || playerBadgeArtist?.textContent?.trim() || void 0;
      const docParsed = parseSoundCloudDocTitle(document.title);
      if (!title || title.toLowerCase() === (artist || "").toLowerCase() || title.toLowerCase() === "soundcloud") {
        if (docParsed.title) {
          title = docParsed.title;
        }
      }
      if (!artist && docParsed.artist) {
        artist = docParsed.artist;
      }
      if (!title || title.toLowerCase() === (artist || "").toLowerCase()) {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
        if (ogTitle) {
          const ogParsed = parseSoundCloudDocTitle(ogTitle);
          if (ogParsed.title) title = ogParsed.title;
          if (!artist && ogParsed.artist) artist = ogParsed.artist;
        }
      }
      if (title) {
        title = title.replace(/^Stream\s+/i, "").replace(/\s+on SoundCloud$/i, "").trim();
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
      const sources = element.querySelectorAll("source");
      for (const s of Array.from(sources)) {
        if (s.src) {
          src = s.src;
          break;
        }
      }
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
    if (isVideo && (format === "unknown" || !format)) {
      format = "mp4";
    }
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
        downloadReason = "Li\xEAn k\u1EBFt t\u1EA3i ch\xEDnh th\u1EE9c t\u1EEB t\xE1c gi\u1EA3 SoundCloud";
        src = dlHref;
      } else {
        const perfAudio = performance.getEntriesByType("resource").find((r) => {
          const name = r.name.toLowerCase();
          return name.includes("sndcdn.com") && !name.includes("cf-hls-") && !name.includes(".m3u8") && (name.includes("/preview/") || name.includes(".128.mp3") || name.includes(".128.m4a") || name.includes(".128.aac"));
        });
        if (perfAudio && perfAudio.name) {
          src = perfAudio.name;
          downloadable = true;
          sourceType = "DIRECT_FILE";
          downloadReason = "T\u1EC7p \xE2m thanh tr\u1EF1c ti\u1EBFp t\u1EEB SoundCloud";
        } else {
          const perfHls = performance.getEntriesByType("resource").find((r) => {
            const name = r.name.toLowerCase();
            return name.includes(".m3u8") || name.includes("cf-hls-media.sndcdn.com") || name.includes("playback.media-streaming.soundcloud.cloud");
          });
          if (perfHls && perfHls.name) {
            let hlsUrl = perfHls.name;
            if (!hlsUrl.includes(".m3u8")) {
              hlsUrl = hlsUrl.substring(0, hlsUrl.lastIndexOf("/") + 1) + "playlist.m3u8";
            }
            src = hlsUrl;
            mediaType = "audio";
            sourceType = "PLAYLIST";
            format = "mp3";
            streamingProtocol = "HLS Stream (Gh\xE9p sang MP3)";
            downloadable = true;
            downloadReason = "S\u1EB5n s\xE0ng t\u1EA3i b\xE0i h\xE1t MP3 ho\xE0n ch\u1EC9nh";
          } else {
            mediaType = "stream";
            sourceType = "STREAMING_MEDIA";
            streamingProtocol = "HLS Adaptive Stream";
            downloadable = false;
            downloadReason = "\u0110ang ph\xE1t \xE2m thanh tr\u1EF1c tuy\u1EBFn tr\xEAn SoundCloud";
          }
        }
      }
    } else if (src && (isDirectAudioUrl(src) || src.toLowerCase().includes(".mp4") || src.toLowerCase().includes(".webm"))) {
      downloadable = true;
      sourceType = "DIRECT_FILE";
      downloadReason = isVideo ? "File video MP4 s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1";
    } else if (src && src.startsWith("blob:")) {
      sourceType = "BLOB_MEDIA";
      streamingProtocol = isVideo ? "Blob Video Stream" : "Blob MediaSource";
      downloadable = false;
      downloadReason = isVideo ? "Ngu\u1ED3n video ph\xE1t tr\u1EF1c tuy\u1EBFn qua Blob" : "Ngu\u1ED3n ph\xE1t tr\u1EF1c tuy\u1EBFn qua Blob URL, kh\xF4ng c\xF3 file t\u1EA3i tr\u1EF1c ti\u1EBFp";
    } else if (src && src.startsWith("http")) {
      const isDirect = isDirectAudioUrl(src) || src.toLowerCase().includes(".mp4") || src.toLowerCase().includes(".webm");
      downloadable = isDirect;
      sourceType = downloadable ? "DIRECT_FILE" : "STREAMING_MEDIA";
      downloadReason = downloadable ? isVideo ? "File video MP4 s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : "File \xE2m thanh tr\u1EF1c ti\u1EBFp s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : isVideo ? "\u0110ang ph\xE1t video tr\u1EF1c tuy\u1EBFn tr\xEAn website" : "\u0110ang ph\xE1t tr\u1EF1c tuy\u1EBFn tr\xEAn website";
    } else {
      downloadable = false;
      sourceType = "UNKNOWN";
      downloadReason = isVideo ? "\u0110ang ph\xE1t video tr\xEAn trang" : "\u0110ang ph\xE1t \xE2m thanh tr\xEAn trang";
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
        const lowerName = name.toLowerCase();
        if (lowerName.includes("cf-hls-media.sndcdn.com") || lowerName.includes("cf-hls-opus.sndcdn.com") || lowerName.endsWith(".ts") || lowerName.endsWith(".m4s") || lowerName.includes("/segment")) {
          return;
        }
        const sourceType = determineSourceType(name);
        const { title, artist } = extractMediaMetadata(document.body);
        const isVid = lowerName.includes(".mp4") || lowerName.includes(".webm");
        if (sourceType === "DIRECT_FILE" && (isDirectAudioUrl(name) || isVid)) {
          if (!mediaRegistry.has(name)) {
            const item = createDetectedMediaItem({
              url: name,
              source: isVid ? "dom-video" : "performance-resource",
              pageUrl: window.location.href,
              tabId: 0,
              title,
              artist,
              mediaType: isVid ? "video" : "audio",
              format: isVid ? "mp4" : void 0,
              sourceType: "DIRECT_FILE",
              downloadable: true,
              downloadReason: isVid ? "File video MP4 tr\u1EF1c ti\u1EBFp ph\xE1t hi\u1EC7n qua m\u1EA1ng" : "T\xE0i nguy\xEAn \xE2m thanh tr\u1EF1c ti\u1EBFp ph\xE1t hi\u1EC7n qua m\u1EA1ng"
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
              title,
              artist,
              sourceType: "PLAYLIST",
              format: "mp3",
              downloadable: true,
              downloadReason: "S\u1EB5n s\xE0ng t\u1EA3i b\xE0i h\xE1t MP3 ho\xE0n ch\u1EC9nh",
              streamingProtocol: "HLS Stream (Gh\xE9p sang MP3)"
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
      'a[href*=".mp3"], a[href*=".wav"], a[href*=".flac"], a[href*=".m4a"], a[href*=".aac"], a[href*=".ogg"], a[href*=".opus"], a[href*=".webm"], a[href*=".mp4"], a.sc-button-download, a[href*="/download"], a[download]'
    );
    links.forEach((link) => {
      const href = link.href;
      if (href && href.startsWith("http") && !href.startsWith("javascript:")) {
        if (isDirectAudioUrl(href) || link.classList.contains("sc-button-download") && !href.includes("javascript:")) {
          const { title, artist } = extractMediaMetadata(link);
          const isVid = href.toLowerCase().includes(".mp4") || href.toLowerCase().includes(".webm");
          const item = createDetectedMediaItem({
            url: href,
            source: isVid ? "dom-video" : "dom-link",
            pageUrl: window.location.href,
            tabId: 0,
            title,
            artist,
            mediaType: isVid ? "video" : "audio",
            format: isVid ? "mp4" : void 0,
            sourceType: "DIRECT_FILE",
            downloadable: true,
            downloadReason: isVid ? "File video MP4 s\u1EB5n s\xE0ng t\u1EA3i v\u1EC1" : "Li\xEAn k\u1EBFt t\u1EA3i \xE2m thanh tr\u1EF1c ti\u1EBFp (MP3/WAV) tr\xEAn website"
          });
          sendMediaToBackground(item);
        }
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
