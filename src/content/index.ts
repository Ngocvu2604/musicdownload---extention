import {
  createDetectedMediaItem,
  isDirectAudioUrl,
  determineSourceType,
} from '../utils/audioDetector';
import { DetectedMedia, MediaPlaybackStatus, AudioFormat } from '../types/audio';
import { getFormatFromMimeOrExt, getExtensionFromUrl, parseSoundCloudDocTitle } from '../utils/formatters';

console.log('[AudioFlow V2] Advanced Content Script initialized on:', window.location.href);

// Registry of detected media for this page: Map<id, DetectedMedia>
const mediaRegistry = new Map<string, DetectedMedia>();
// Keep track of elements that already have event listeners attached
const boundElements = new WeakSet<HTMLMediaElement>();

/**
 * Send an item or update to Background Service Worker
 */
function sendMediaToBackground(media: DetectedMedia) {
  mediaRegistry.set(media.id, media);
  try {
    chrome.runtime.sendMessage({
      type: 'MEDIA_DETECTED',
      payload: media,
    });
  } catch {
    // Service Worker might be in transition
  }
}

/**
 * Determine accurate playback status for an HTMLMediaElement
 */
function getElementPlaybackStatus(el: HTMLMediaElement): MediaPlaybackStatus {
  if (el.ended) return 'ENDED';
  if (el.seeking || el.readyState === 1 || (el.readyState === 2 && !el.paused)) {
    return 'BUFFERING';
  }
  if (!el.paused && !el.ended && el.readyState >= 2) {
    return 'PLAYING';
  }
  if (el.paused && el.currentTime > 0) {
    return 'PAUSED';
  }
  if (el.paused) {
    return 'PAUSED';
  }
  return 'UNKNOWN';
}

/**
 * Extract Track Title, Artist, and Channel context from DOM
 */
function extractMediaMetadata(element: HTMLElement): { title: string; artist?: string } {
  const isYouTube = window.location.hostname.includes('youtube.com');
  const isSoundCloud = window.location.hostname.includes('soundcloud.com');

  // 1. YouTube metadata extraction
  if (isYouTube) {
    const titleElem = document.querySelector(
      'h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title, .ytp-title-link'
    );
    const title = titleElem?.textContent?.trim() || document.title.replace('- YouTube', '').trim();

    const channelElem = document.querySelector(
      'ytd-channel-name a, #channel-name a, #owner-name a, yt-formatted-string.ytd-channel-name, .ytd-video-owner-renderer a'
    );
    const artist = channelElem?.textContent?.trim() || undefined;

    return { title: title || 'YouTube Video', artist };
  }

  // 2. SoundCloud metadata extraction (Track & Artist)
  if (isSoundCloud) {
    // Current playing track title: Check track page main heading first, then player badge link
    const trackPageHeading = document.querySelector(
      'h1.soundTitle__title span, h1.soundTitle__title, .soundTitle__title span, .soundTitle__title, [data-testid="track-title"]'
    );
    const playerBadgeTitle = document.querySelector(
      'a.playbackSoundBadge__titleLink, .playbackSoundBadge__titleLink span, .playbackSoundBadge__titleLink, a.playbackSoundBadge__title'
    );
    let title =
      trackPageHeading?.textContent?.trim() ||
      playerBadgeTitle?.getAttribute('title') ||
      playerBadgeTitle?.textContent?.trim();

    // Current playing track artist: Check artist link in page hero, then player badge artist link
    const trackPageArtist = document.querySelector(
      '.soundTitle__usernameHero a, .soundTitle__username a, .soundTitle__username, [data-testid="track-artist"]'
    );
    const playerBadgeArtist = document.querySelector(
      'a.playbackSoundBadge__lightLink, .playbackSoundBadge__lightLink'
    );
    let artist =
      trackPageArtist?.textContent?.trim() ||
      playerBadgeArtist?.getAttribute('title') ||
      playerBadgeArtist?.textContent?.trim() ||
      undefined;

    // Document title parser (authoritative on SoundCloud tab)
    const docParsed = parseSoundCloudDocTitle(document.title);
    if (!title || title.toLowerCase() === (artist || '').toLowerCase() || title.toLowerCase() === 'soundcloud') {
      if (docParsed.title) {
        title = docParsed.title;
      }
    }
    if (!artist && docParsed.artist) {
      artist = docParsed.artist;
    }

    // OpenGraph meta tags fallback
    if (!title || title.toLowerCase() === (artist || '').toLowerCase()) {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      if (ogTitle) {
        const ogParsed = parseSoundCloudDocTitle(ogTitle);
        if (ogParsed.title) title = ogParsed.title;
        if (!artist && ogParsed.artist) artist = ogParsed.artist;
      }
    }

    if (title) {
      title = title.replace(/^Stream\s+/i, '').replace(/\s+on SoundCloud$/i, '').trim();
    }

    return { title: title || 'SoundCloud Track', artist };
  }

  // 3. Explicit HTML attributes
  const explicitTitle =
    element.getAttribute('title') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('data-title') ||
    element.getAttribute('data-track-name');

  const explicitArtist =
    element.getAttribute('data-artist') ||
    element.getAttribute('data-creator') ||
    element.getAttribute('data-author');

  if (explicitTitle && explicitTitle.trim()) {
    return { title: explicitTitle.trim(), artist: explicitArtist?.trim() };
  }

  // 4. Common music/track parent container
  const trackContainer = element.closest('.track, .song, .audio-player, .player, [data-track], article, li');
  if (trackContainer) {
    const heading = trackContainer.querySelector('h1, h2, h3, h4, .title, .track-title, .song-title');
    const artistElem = trackContainer.querySelector('.artist, .author, .creator, .byline, .channel');
    if (heading && heading.textContent?.trim()) {
      return {
        title: heading.textContent.trim(),
        artist: artistElem?.textContent?.trim() || undefined,
      };
    }
  }

  // 5. Anchor text if inside link
  if (element instanceof HTMLAnchorElement && element.textContent?.trim()) {
    return { title: element.textContent.trim() };
  }

  // 6. Page document title as fallback
  const cleanDocTitle = document.title.replace(/[-|].*$/, '').trim();
  return { title: cleanDocTitle || 'Web Audio' };
}

/**
 * Scan and inspect an HTMLMediaElement (<audio> or <video>)
 */
function inspectMediaElement(element: HTMLMediaElement) {
  const isVideo = element instanceof HTMLVideoElement;
  let src = element.currentSrc || element.src;

  // Check child source tags if src is empty
  if (!src) {
    const sourceEl = element.querySelector('source');
    if (sourceEl) src = sourceEl.src;
  }

  const { title, artist } = extractMediaMetadata(element);
  const status = getElementPlaybackStatus(element);
  const duration = isFinite(element.duration) && element.duration > 0 ? element.duration : undefined;
  const currentTime = isFinite(element.currentTime) ? element.currentTime : undefined;

  const isYouTube = window.location.hostname.includes('youtube.com');
  const isSoundCloud = window.location.hostname.includes('soundcloud.com');

  let mediaType: 'audio' | 'video' | 'stream' = isVideo ? 'video' : 'audio';
  let sourceType = determineSourceType(src);
  let downloadable = false;
  let downloadReason = '';
  let format: AudioFormat = getFormatFromMimeOrExt(undefined, getExtensionFromUrl(src));
  let streamingProtocol: string | undefined = undefined;

  if (isYouTube) {
    mediaType = 'stream';
    sourceType = 'STREAMING_MEDIA';
    streamingProtocol = 'DASH / Adaptive WebM';
    downloadable = false;
    downloadReason = 'Nguồn phát trực tuyến YouTube (DASH/Blob), tuân thủ chính sách bản quyền';
  } else if (isSoundCloud) {
    // 1. Check if SoundCloud track has an official free download button on the page
    const scDownloadBtn = document.querySelector<HTMLAnchorElement>(
      '.sc-button-download, a[href*="download"], a[title*="Download"], button[title*="Download"]'
    );
    const dlHref = scDownloadBtn?.getAttribute('href');

    if (dlHref && dlHref.startsWith('http') && !dlHref.includes('javascript:')) {
      downloadable = true;
      sourceType = 'DIRECT_FILE';
      downloadReason = 'Liên kết tải chính thức từ tác giả SoundCloud';
      src = dlHref;
    } else {
      // 2. Check for progressive audio stream in performance timing (complete audio files)
      const perfAudio = performance.getEntriesByType('resource').find((r) => {
        const name = r.name.toLowerCase();
        return (
          name.includes('sndcdn.com') &&
          !name.includes('cf-hls-') &&
          !name.includes('.m3u8') &&
          (name.includes('/preview/') || name.includes('.128.mp3') || name.includes('.128.m4a') || name.includes('.128.aac'))
        );
      });

      if (perfAudio && perfAudio.name) {
        src = perfAudio.name;
        downloadable = true;
        sourceType = 'DIRECT_FILE';
        downloadReason = 'Tệp âm thanh trực tiếp từ SoundCloud';
      } else {
        // 3. HLS Adaptive Stream (SoundCloud standard audio stream)
        const perfHls = performance.getEntriesByType('resource').find((r) => {
          const name = r.name.toLowerCase();
          return (
            name.includes('.m3u8') ||
            name.includes('cf-hls-media.sndcdn.com') ||
            name.includes('playback.media-streaming.soundcloud.cloud')
          );
        });

        if (perfHls && perfHls.name) {
          let hlsUrl = perfHls.name;
          if (!hlsUrl.includes('.m3u8')) {
            hlsUrl = hlsUrl.substring(0, hlsUrl.lastIndexOf('/') + 1) + 'playlist.m3u8';
          }
          src = hlsUrl;
          mediaType = 'audio';
          sourceType = 'PLAYLIST';
          format = 'mp3';
          streamingProtocol = 'HLS Stream (Ghép sang MP3)';
          downloadable = true;
          downloadReason = 'Sẵn sàng tải bài hát MP3 hoàn chỉnh';
        } else {
          mediaType = 'stream';
          sourceType = 'STREAMING_MEDIA';
          streamingProtocol = 'HLS Adaptive Stream';
          downloadable = false;
          downloadReason = 'Đang phát âm thanh trực tuyến trên SoundCloud';
        }
      }
    }
  } else if (src && isDirectAudioUrl(src)) {
    downloadable = true;
    sourceType = 'DIRECT_FILE';
    downloadReason = 'File âm thanh trực tiếp sẵn sàng tải về';
  } else if (src && src.startsWith('blob:')) {
    sourceType = 'BLOB_MEDIA';
    streamingProtocol = 'Blob MediaSource';
    downloadable = false;
    downloadReason = 'Nguồn phát trực tuyến qua Blob URL, không có file tải trực tiếp';
  } else if (src && src.startsWith('http')) {
    downloadable = isDirectAudioUrl(src);
    sourceType = downloadable ? 'DIRECT_FILE' : 'STREAMING_MEDIA';
    downloadReason = downloadable
      ? 'File âm thanh trực tiếp sẵn sàng tải về'
      : 'Đang phát trực tuyến trên website';
  } else {
    downloadable = false;
    sourceType = 'UNKNOWN';
    downloadReason = 'Đang phát âm thanh trên trang';
  }

  const mediaItem = createDetectedMediaItem({
    url: src || window.location.href,
    source: isYouTube
      ? 'youtube-source'
      : isSoundCloud
      ? 'soundcloud-source'
      : isVideo
      ? 'dom-video'
      : 'dom-audio',
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
    streamingProtocol,
  });

  sendMediaToBackground(mediaItem);

  // Attach event listeners for real-time play/pause/timeupdate
  if (!boundElements.has(element)) {
    boundElements.add(element);
    bindMediaEventListeners(element);
  }
}

/**
 * Bind playback event listeners to an HTMLMediaElement for realtime updates
 */
function bindMediaEventListeners(element: HTMLMediaElement) {
  const events = [
    'play',
    'playing',
    'pause',
    'ended',
    'loadedmetadata',
    'volumechange',
    'ratechange',
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

  // Debounced timeupdate listener (throttle to ~2s)
  let lastTimeUpdate = 0;
  element.addEventListener(
    'timeupdate',
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

/**
 * Scan all <audio> and <video> elements on the page
 */
function scanMediaElements() {
  const elements = document.querySelectorAll('audio, video');
  elements.forEach((el) => {
    inspectMediaElement(el as HTMLMediaElement);
  });
}

/**
 * Scan PerformanceResourceTiming entries for direct audio files & playlists
 */
function scanPerformanceResources() {
  try {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    resources.forEach((res) => {
      const name = res.name;
      if (!name || !name.startsWith('http')) return;

      const lowerName = name.toLowerCase();
      // Skip tiny HLS fragments / chunk streams
      if (
        lowerName.includes('cf-hls-media.sndcdn.com') ||
        lowerName.includes('cf-hls-opus.sndcdn.com') ||
        lowerName.endsWith('.ts') ||
        lowerName.endsWith('.m4s') ||
        lowerName.includes('/segment')
      ) {
        return;
      }

      const sourceType = determineSourceType(name);
      const { title, artist } = extractMediaMetadata(document.body);

      if (sourceType === 'DIRECT_FILE' && isDirectAudioUrl(name)) {
        if (!mediaRegistry.has(name)) {
          const item = createDetectedMediaItem({
            url: name,
            source: 'performance-resource',
            pageUrl: window.location.href,
            tabId: 0,
            title,
            artist,
            sourceType: 'DIRECT_FILE',
            downloadable: true,
            downloadReason: 'Tài nguyên âm thanh trực tiếp phát hiện qua mạng',
          });
          sendMediaToBackground(item);
        }
      } else if (sourceType === 'PLAYLIST') {
        if (!mediaRegistry.has(name)) {
          const item = createDetectedMediaItem({
            url: name,
            source: 'hls-manifest',
            pageUrl: window.location.href,
            tabId: 0,
            title,
            artist,
            sourceType: 'PLAYLIST',
            format: 'mp3',
            downloadable: true,
            downloadReason: 'Sẵn sàng tải bài hát MP3 hoàn chỉnh',
            streamingProtocol: 'HLS Stream (Ghép sang MP3)',
          });
          sendMediaToBackground(item);
        }
      }
    });
  } catch {
    // Restricted or unsupported
  }
}

/**
 * Scan direct download links (<a href="*.mp3">, <a href="*.wav">, download buttons)
 */
function scanDownloadLinks() {
  const links = document.querySelectorAll(
    'a[href*=".mp3"], a[href*=".wav"], a[href*=".flac"], a[href*=".m4a"], a[href*=".aac"], a[href*=".ogg"], a[href*=".opus"], a[href*=".webm"], a[href*=".mp4"], a.sc-button-download, a[href*="/download"], a[download]'
  );

  links.forEach((link) => {
    const href = (link as HTMLAnchorElement).href;
    if (href && href.startsWith('http') && !href.startsWith('javascript:')) {
      if (isDirectAudioUrl(href) || (link.classList.contains('sc-button-download') && !href.includes('javascript:'))) {
        const { title, artist } = extractMediaMetadata(link as HTMLElement);
        const item = createDetectedMediaItem({
          url: href,
          source: 'dom-link',
          pageUrl: window.location.href,
          tabId: 0,
          title,
          artist,
          sourceType: 'DIRECT_FILE',
          downloadable: true,
          downloadReason: 'Liên kết tải âm thanh trực tiếp (MP3/WAV) trên website',
        });
        sendMediaToBackground(item);
      }
    }
  });
}

/**
 * Full page scan execution
 */
function performFullScan(): DetectedMedia[] {
  scanMediaElements();
  scanPerformanceResources();
  scanDownloadLinks();
  return Array.from(mediaRegistry.values());
}

// Initial scan
performFullScan();

// MutationObserver for dynamic websites & SPAs (SoundCloud, YouTube, Spotify)
const observer = new MutationObserver((mutations) => {
  let shouldScan = false;
  for (const m of mutations) {
    if (m.addedNodes.length > 0) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (node instanceof HTMLElement) {
          if (
            node.tagName === 'AUDIO' ||
            node.tagName === 'VIDEO' ||
            node.querySelector('audio, video')
          ) {
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

const startObserver = () => {
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
};

if (document.body) {
  startObserver();
} else {
  document.addEventListener('DOMContentLoaded', startObserver);
}

// Listen for messages from Popup or Background
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SCAN_PAGE' || msg.type === 'SCAN_MEDIA') {
    const freshMedia = performFullScan();
    sendResponse({
      success: true,
      count: freshMedia.length,
      media: freshMedia,
    });
    return true;
  }
});
