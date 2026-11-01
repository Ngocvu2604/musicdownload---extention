import {
  createDetectedMediaItem,
  isDirectAudioUrl,
  determineSourceType,
} from '../utils/audioDetector';
import { DetectedMedia, MediaPlaybackStatus, AudioFormat } from '../types/audio';
import { getFormatFromMimeOrExt, getExtensionFromUrl } from '../utils/formatters';

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
    // Current playing track title
    const scTitleElem = document.querySelector(
      '.playbackSoundBadge__titleLink, [data-testid="track-title"], .soundTitle__title'
    );
    let title = scTitleElem?.getAttribute('title') || scTitleElem?.textContent?.trim();

    // Current playing track artist
    const scArtistElem = document.querySelector(
      '.playbackSoundBadge__lightLink, .playbackSoundBadge__titleContextContainer a, .soundTitle__username, [data-testid="track-artist"]'
    );
    const artist = scArtistElem?.getAttribute('title') || scArtistElem?.textContent?.trim() || undefined;

    if (!title) {
      // Fallback to OpenGraph or document title
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      title = ogTitle || document.title.replace('Stream ', '').replace('Listen to ', '').replace('on SoundCloud', '').trim();
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
    // Check if SoundCloud track has an official free download button on the page
    const scDownloadBtn = document.querySelector(
      '.sc-button-download, a[href*="download"], a[title*="Download"], button[title*="Download"]'
    );
    const dlHref = scDownloadBtn?.getAttribute('href');

    if (dlHref && dlHref.startsWith('http') && !dlHref.includes('javascript:')) {
      downloadable = true;
      sourceType = 'DIRECT_FILE';
      downloadReason = 'Phát hiện liên kết tải chính thức từ tác giả SoundCloud';
      src = dlHref;
    } else {
      mediaType = 'stream';
      sourceType = 'STREAMING_MEDIA';
      streamingProtocol = 'HLS / SoundCloud Adaptive Stream';
      downloadable = false;
      downloadReason = 'Nguồn phát trực tuyến SoundCloud, tác giả chưa mở tải trực tiếp';
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

      const sourceType = determineSourceType(name);

      if (sourceType === 'DIRECT_FILE' && isDirectAudioUrl(name)) {
        if (!mediaRegistry.has(name)) {
          const item = createDetectedMediaItem({
            url: name,
            source: 'performance-resource',
            pageUrl: window.location.href,
            tabId: 0,
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
            sourceType: 'PLAYLIST',
            format: name.includes('.m3u8') ? 'hls' : 'dash',
            downloadable: false,
            downloadReason: 'Danh sách phát đa phân đoạn (HLS/DASH Playlist)',
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
 * Scan direct download links (<a href="*.mp3">)
 */
function scanDownloadLinks() {
  const links = document.querySelectorAll(
    'a[href*=".mp3"], a[href*=".wav"], a[href*=".flac"], a[href*=".m4a"], a[href*=".aac"], a[href*=".ogg"], a[href*=".opus"], a[href*=".webm"], a[href*=".mp4"]'
  );

  links.forEach((link) => {
    const href = (link as HTMLAnchorElement).href;
    if (href && href.startsWith('http') && isDirectAudioUrl(href)) {
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
        downloadReason: 'Liên kết tải âm thanh trực tiếp trên website',
      });
      sendMediaToBackground(item);
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
