import {
  createDetectedMediaItem,
  isDirectAudioUrl,
  determineSourceType,
} from '../utils/audioDetector';
import { DetectedMedia, MediaPlaybackStatus } from '../types/audio';

console.log('[AudioFlow] Content script initialized on:', window.location.href);

// Registry of detected media for this page
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
  } catch (err) {
    // Background worker might be waking up
  }
}

/**
 * Determine accurate playback status for an HTMLMediaElement
 */
function getElementPlaybackStatus(el: HTMLMediaElement): MediaPlaybackStatus {
  if (el.ended) return 'ENDED';
  if (el.seeking || el.readyState === 1 || el.readyState === 2 && !el.paused) {
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
 * Extract meaningful title from HTML context
 */
function extractTitleFromContext(element: HTMLElement): string {
  // 1. Explicit title attributes
  const explicit =
    element.getAttribute('title') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('data-title') ||
    element.getAttribute('data-track-name');
  if (explicit && explicit.trim()) return explicit.trim();

  // 2. YouTube specific title
  if (window.location.hostname.includes('youtube.com')) {
    const ytElem = document.querySelector(
      'h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title, .ytp-title-link'
    );
    if (ytElem && ytElem.textContent?.trim()) {
      return ytElem.textContent.trim();
    }
    return document.title.replace('- YouTube', '').trim();
  }

  // 3. SoundCloud specific title
  if (window.location.hostname.includes('soundcloud.com')) {
    const scTitle = document.querySelector(
      '.playbackSoundBadge__titleLink, [data-testid="track-title"], .soundTitle__title'
    );
    if (scTitle) {
      const titleAttr = scTitle.getAttribute('title');
      if (titleAttr?.trim()) return titleAttr.trim();
      if (scTitle.textContent?.trim()) return scTitle.textContent.trim();
    }
    return document.title.replace('Stream ', '').replace('Listen to ', '').replace('on SoundCloud', '').trim();
  }

  // 4. Common music/track parent container
  const trackContainer = element.closest('.track, .song, .audio-player, .player, [data-track], article, li');
  if (trackContainer) {
    const heading = trackContainer.querySelector('h1, h2, h3, h4, .title, .track-title, .song-title');
    if (heading && heading.textContent?.trim()) {
      return heading.textContent.trim();
    }
  }

  // 5. Anchor text if inside link
  if (element instanceof HTMLAnchorElement && element.textContent?.trim()) {
    return element.textContent.trim();
  }

  // 6. Page document title as fallback
  const cleanDocTitle = document.title.replace(/[-|].*$/, '').trim();
  return cleanDocTitle || 'Web Audio';
}

/**
 * Scan and inspect a single HTMLMediaElement (<audio> or <video>)
 */
function inspectMediaElement(element: HTMLMediaElement) {
  const isVideo = element instanceof HTMLVideoElement;
  const isAudio = element instanceof HTMLAudioElement;

  // Obtain active URL
  let src = element.currentSrc || element.src;

  // Check child source tags if src is empty
  if (!src) {
    const sourceEl = element.querySelector('source');
    if (sourceEl) src = sourceEl.src;
  }

  // Determine title
  const title = extractTitleFromContext(element);
  const status = getElementPlaybackStatus(element);
  const duration = isFinite(element.duration) && element.duration > 0 ? element.duration : undefined;
  const currentTime = isFinite(element.currentTime) ? element.currentTime : undefined;
  const isYouTube = window.location.hostname.includes('youtube.com');
  const isSoundCloud = window.location.hostname.includes('soundcloud.com');

  // Classification
  let mediaType: 'audio' | 'video' | 'stream' = isVideo ? 'video' : 'audio';
  let downloadable = false;
  let downloadReason = '';

  if (isYouTube) {
    mediaType = 'stream';
    downloadable = false;
    downloadReason = 'Nguồn phát trực tuyến YouTube (DASH/Blob), tuân thủ bản quyền';
  } else if (isSoundCloud) {
    // Check if SoundCloud track has an official free download link
    const scDownloadBtn = document.querySelector('.sc-button-download, a[href*="download"]');
    const dlHref = scDownloadBtn?.getAttribute('href');
    if (dlHref && dlHref.startsWith('http')) {
      downloadable = true;
      downloadReason = 'Phát hiện liên kết tải chính thức từ tác giả SoundCloud';
    } else {
      mediaType = 'stream';
      downloadable = false;
      downloadReason = 'Nguồn phát trực tuyến SoundCloud, không có file tải trực tiếp';
    }
  } else if (src && isDirectAudioUrl(src)) {
    downloadable = true;
    downloadReason = 'File âm thanh trực tiếp sẵn sàng tải về';
  } else if (src && src.startsWith('blob:')) {
    downloadable = false;
    downloadReason = 'Nguồn phát qua Blob URL, không có liên kết tải trực tiếp';
  } else if (src && src.startsWith('http')) {
    downloadable = isDirectAudioUrl(src);
    downloadReason = downloadable
      ? 'File âm thanh trực tiếp sẵn sàng tải về'
      : 'Đang phát trực tuyến trên website';
  } else {
    downloadable = false;
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
    mediaType,
    status,
    duration,
    currentTime,
    downloadable,
    downloadReason,
  });

  sendMediaToBackground(mediaItem);

  // Attach real-time event listeners if not already attached
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
        // Re-inspect element on state change
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
 * Scan all <audio> and <video> elements on the page (including inside shadow roots)
 */
function scanMediaElements() {
  const elements = document.querySelectorAll('audio, video');
  elements.forEach((el) => {
    inspectMediaElement(el as HTMLMediaElement);
  });
}

/**
 * Scan PerformanceResourceTiming entries for direct audio files
 */
function scanPerformanceResources() {
  try {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    resources.forEach((res) => {
      const name = res.name;
      if (name && name.startsWith('http') && isDirectAudioUrl(name)) {
        if (!mediaRegistry.has(name)) {
          const item = createDetectedMediaItem({
            url: name,
            source: 'performance-resource',
            pageUrl: window.location.href,
            tabId: 0,
            downloadable: true,
            downloadReason: 'Tài nguyên âm thanh trực tiếp phát hiện qua mạng',
          });
          sendMediaToBackground(item);
        }
      }
    });
  } catch {
    // Performance API not supported or restricted
  }
}

/**
 * Scan direct download links (<a href="*.mp3">)
 */
function scanDownloadLinks() {
  const links = document.querySelectorAll(
    'a[href*=".mp3"], a[href*=".wav"], a[href*=".flac"], a[href*=".m4a"], a[href*=".aac"], a[href*=".ogg"], a[href*=".opus"], a[href*=".webm"]'
  );

  links.forEach((link) => {
    const href = (link as HTMLAnchorElement).href;
    if (href && href.startsWith('http') && isDirectAudioUrl(href)) {
      const title = extractTitleFromContext(link as HTMLElement);
      const item = createDetectedMediaItem({
        url: href,
        source: 'dom-link',
        pageUrl: window.location.href,
        tabId: 0,
        title,
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

// MutationObserver for dynamic websites & SPAs (YouTube, SoundCloud, Spotify)
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
