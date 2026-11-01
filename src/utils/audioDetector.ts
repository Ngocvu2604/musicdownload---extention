import {
  AudioFormat,
  DetectionSource,
  DetectedMedia,
  MediaSourceType,
  MediaPlaybackStatus,
} from '../types/audio';
import {
  cleanFilename,
  getDomainFromUrl,
  getExtensionFromUrl,
  getFormatFromMimeOrExt,
} from './formatters';

export const SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'flac',
  'aac',
  'm4a',
  'ogg',
  'opus',
  'webm',
] as const;

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/ogg',
  'application/ogg',
  'audio/opus',
  'audio/webm',
];

/**
 * Generate a consistent unique ID for a media item
 */
export function generateMediaId(url: string, pageUrl: string, titleHint?: string): string {
  const seed = `${url || ''}_${pageUrl || ''}_${titleHint || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `med_${Math.abs(hash).toString(36)}`;
}

/**
 * Determine if a URL is a direct downloadable audio file
 */
export function isDirectAudioUrl(rawUrl: string): boolean {
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return false;
  }

  try {
    const cleanUrl = rawUrl.split('?')[0].split('#')[0].toLowerCase();
    return SUPPORTED_AUDIO_EXTENSIONS.some((ext) => cleanUrl.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

/**
 * Backward compatible alias
 */
export const isAudioUrl = isDirectAudioUrl;

/**
 * Determine if a MIME type indicates an audio stream or file
 */
export function isAudioMimeType(mimeType?: string): boolean {
  if (!mimeType) return false;
  const lower = mimeType.toLowerCase();
  return lower.startsWith('audio/') || AUDIO_MIME_TYPES.some((m) => lower.includes(m));
}

/**
 * Classify Media Source Type
 */
export function determineSourceType(url: string = '', mimeType: string = ''): MediaSourceType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith('blob:')) {
    return 'BLOB';
  }
  if (
    lowerUrl.includes('.m3u8') ||
    lowerUrl.includes('.mpd') ||
    lowerUrl.includes('googlevideo.com') ||
    lowerUrl.includes('manifest') ||
    lowerUrl.includes('stream') ||
    lowerUrl.includes('segment')
  ) {
    return 'STREAMING';
  }
  if (isDirectAudioUrl(url) || isAudioMimeType(mimeType)) {
    return 'DIRECT';
  }
  if (url.startsWith('http')) {
    return 'DIRECT';
  }
  return 'UNKNOWN';
}

/**
 * Build a DetectedMedia object safely
 */
export function createDetectedMediaItem(params: {
  url?: string;
  source: DetectionSource;
  pageUrl: string;
  tabId: number;
  title?: string;
  mediaType?: 'audio' | 'video' | 'stream' | 'unknown';
  format?: AudioFormat;
  sourceType?: MediaSourceType;
  status?: MediaPlaybackStatus;
  duration?: number;
  currentTime?: number;
  size?: number;
  mimeType?: string;
  downloadable?: boolean;
  downloadReason?: string;
}): DetectedMedia {
  const {
    url = '',
    source,
    pageUrl,
    tabId,
    title: initialTitle,
    mediaType = 'audio',
    format: initialFormat,
    sourceType: initialSourceType,
    status = 'UNKNOWN',
    duration,
    currentTime,
    size,
    mimeType = '',
    downloadable: initialDownloadable,
    downloadReason: initialReason,
  } = params;

  const domain = getDomainFromUrl(pageUrl || url);
  const ext = getExtensionFromUrl(url);
  const format: AudioFormat = initialFormat || getFormatFromMimeOrExt(mimeType, ext);
  const sourceType: MediaSourceType = initialSourceType || determineSourceType(url, mimeType);

  // Derive title & filename
  let title = (initialTitle || '').trim();
  if (!title) {
    if (domain.includes('youtube.com')) {
      title = 'YouTube Media';
    } else if (domain.includes('soundcloud.com')) {
      title = 'SoundCloud Track';
    } else if (url && url.startsWith('http')) {
      try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/').filter(Boolean);
        title = segments[segments.length - 1] || 'Web Audio';
      } catch {
        title = 'Web Audio';
      }
    } else {
      title = `${domain} Media`;
    }
  }

  // Sanitize filename
  const cleanBase = title.replace(/\.[a-zA-Z0-9]{2,5}$/, '');
  const finalExt = format !== 'unknown' ? format : 'mp3';
  const filename = cleanFilename(`${cleanBase}.${finalExt}`);

  // Downloadable check
  let downloadable = false;
  let downloadReason = '';

  if (initialDownloadable !== undefined) {
    downloadable = initialDownloadable;
    downloadReason = initialReason || (downloadable ? 'Sẵn sàng tải về' : 'Không có file tải trực tiếp');
  } else if (domain.includes('youtube.com')) {
    downloadable = false;
    downloadReason = 'Nguồn phát trực tuyến YouTube (DASH/Blob), tuân thủ chính sách bản quyền';
  } else if (sourceType === 'BLOB' || sourceType === 'STREAMING') {
    downloadable = false;
    downloadReason = 'Nguồn phát trực tuyến (Streaming), không có file tải trực tiếp';
  } else if (isDirectAudioUrl(url) || url.startsWith('http')) {
    downloadable = true;
    downloadReason = 'File âm thanh trực tiếp sẵn sàng tải về';
  } else {
    downloadable = false;
    downloadReason = 'Chưa xác định được liên kết tải trực tiếp';
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
    format: format !== 'unknown' ? format : 'mp3',
    sourceType,
    status,
    duration: duration && duration > 0 ? duration : undefined,
    currentTime: currentTime && currentTime >= 0 ? currentTime : undefined,
    size: size && size > 0 ? size : undefined,
    downloadable,
    downloadReason,
    source,
    mimeType,
    detectedAt: now,
    updatedAt: now,
  };
}

/**
 * Backward compatibility helper
 */
export const createDetectedAudioItem = createDetectedMediaItem;
