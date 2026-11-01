import {
  AudioFormat,
  DetectionSource,
  DetectedMedia,
  MediaSourceType,
  MediaPlaybackStatus,
  DownloadStatus,
} from '../types/audio';
import {
  buildSanitizedFilename,
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
  'mp4',
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
  'video/mp4',
  'video/webm',
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
 * Classify Media Source Type as required by V2 Specification
 */
export function determineSourceType(url: string = '', mimeType: string = ''): MediaSourceType {
  const lowerUrl = url.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  // Playlists & Manifests
  if (
    lowerUrl.includes('.m3u8') ||
    lowerMime.includes('application/vnd.apple.mpegurl') ||
    lowerMime.includes('application/x-mpegurl') ||
    lowerUrl.includes('.mpd') ||
    lowerMime.includes('application/dash+xml')
  ) {
    return 'PLAYLIST';
  }

  // Media Segments
  if (
    lowerUrl.endsWith('.ts') ||
    lowerUrl.endsWith('.m4s') ||
    lowerUrl.includes('seg-') ||
    lowerUrl.includes('segment-') ||
    lowerUrl.includes('range=') ||
    lowerUrl.includes('cf-hls-media.sndcdn.com') ||
    lowerUrl.includes('cf-hls-opus.sndcdn.com')
  ) {
    return 'MEDIA_SEGMENT';
  }

  // Blob Media
  if (lowerUrl.startsWith('blob:')) {
    return 'BLOB_MEDIA';
  }

  // Streaming Media
  if (
    lowerUrl.includes('googlevideo.com') ||
    lowerUrl.includes('manifest') ||
    lowerUrl.includes('/stream/') ||
    lowerUrl.includes('sndcdn.com/stream') ||
    lowerUrl.includes('/hls/')
  ) {
    return 'STREAMING_MEDIA';
  }

  // Direct Audio File
  if (isDirectAudioUrl(url) || isAudioMimeType(mimeType)) {
    return 'DIRECT_FILE';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'DIRECT_FILE';
  }

  return 'UNKNOWN';
}

/**
 * Build a DetectedMedia object safely with V2 attributes
 */
export function createDetectedMediaItem(params: {
  url?: string;
  source: DetectionSource;
  pageUrl: string;
  tabId: number;
  title?: string;
  artist?: string;
  mediaType?: 'audio' | 'video' | 'stream' | 'unknown';
  format?: AudioFormat;
  sourceType?: MediaSourceType;
  status?: MediaPlaybackStatus;
  downloadStatus?: DownloadStatus;
  duration?: number;
  currentTime?: number;
  size?: number;
  mimeType?: string;
  downloadable?: boolean;
  downloadReason?: string;
  streamingProtocol?: string;
}): DetectedMedia {
  const {
    url = '',
    source,
    pageUrl,
    tabId,
    title: initialTitle,
    artist,
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
    streamingProtocol,
  } = params;

  const domain = getDomainFromUrl(pageUrl || url);
  const ext = getExtensionFromUrl(url);
  const format: AudioFormat = initialFormat || getFormatFromMimeOrExt(mimeType, ext);
  const sourceType: MediaSourceType = initialSourceType || determineSourceType(url, mimeType);

  // Derive title & filename
  let title = (initialTitle || '').trim();
  if (!title) {
    if (domain.includes('youtube.com')) {
      title = 'YouTube Video Media';
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

  // Build filename combining artist and title
  const finalExt = format !== 'unknown' ? format : 'mp3';
  const filename = buildSanitizedFilename(title, artist, finalExt);

  // Determine downloadability & DownloadStatus
  let downloadable = false;
  let downloadReason = '';
  let downloadStatus: DownloadStatus = 'NOT_AVAILABLE';

  if (initialDownloadable !== undefined) {
    downloadable = initialDownloadable;
    downloadStatus = downloadable ? 'READY_TO_DOWNLOAD' : 'NOT_AVAILABLE';
    downloadReason =
      initialReason || (downloadable ? 'Sẵn sàng tải về' : 'Không có file tải trực tiếp');
  } else if (domain.includes('youtube.com')) {
    downloadable = false;
    downloadStatus = 'STREAMING_ONLY';
    downloadReason = 'Nguồn phát trực tuyến YouTube (DASH/Blob), tuân thủ chính sách bản quyền';
  } else if (sourceType === 'BLOB_MEDIA' || sourceType === 'BLOB') {
    downloadable = false;
    downloadStatus = 'STREAMING_ONLY';
    downloadReason = 'Nguồn phát trực tuyến qua Blob URL, không có file tải trực tiếp';
  } else if (sourceType === 'STREAMING_MEDIA' || sourceType === 'STREAMING') {
    downloadable = false;
    downloadStatus = 'STREAMING_ONLY';
    downloadReason = 'Nguồn phát trực tuyến (Streaming Media), không có file tải trực tiếp';
  } else if (sourceType === 'PLAYLIST' || sourceType === 'MEDIA_SEGMENT') {
    downloadable = false;
    downloadStatus = 'STREAMING_ONLY';
    downloadReason = 'Nguồn phát qua phân đoạn / playlist streaming';
  } else if (isDirectAudioUrl(url) || url.startsWith('http')) {
    downloadable = true;
    downloadStatus = 'READY_TO_DOWNLOAD';
    downloadReason = 'File âm thanh trực tiếp sẵn sàng tải về';
  } else {
    downloadable = false;
    downloadStatus = 'NOT_AVAILABLE';
    downloadReason = 'Chưa xác định được liên kết tải trực tiếp';
  }

  const id = generateMediaId(url, pageUrl, `${title}_${artist || ''}`);
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
    format: format !== 'unknown' ? format : 'mp3',
    sourceType,
    status,
    downloadStatus,
    duration: duration && duration > 0 ? duration : undefined,
    currentTime: currentTime && currentTime >= 0 ? currentTime : undefined,
    size: size && size > 0 ? size : undefined,
    downloadable,
    downloadReason,
    streamingProtocol,
    source,
    mimeType,
    detectedAt: now,
    updatedAt: now,
  };
}

export const createDetectedAudioItem = createDetectedMediaItem;
