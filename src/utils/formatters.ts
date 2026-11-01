import { AudioFormat } from '../types/audio';

/**
 * Format bytes to human readable string (KB, MB, GB)
 */
export function formatBytes(bytes?: number, decimals = 1): string {
  if (bytes === undefined || bytes === null || bytes <= 0 || isNaN(bytes)) {
    return 'Unknown size';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return '0 Bytes';
  if (i >= sizes.length) return `${(bytes / Math.pow(k, sizes.length - 1)).toFixed(dm)} ${sizes[sizes.length - 1]}`;

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format download speed in bytes/second to KB/s or MB/s
 */
export function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec || bytesPerSec <= 0 || !isFinite(bytesPerSec)) {
    return '-- KB/s';
  }
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || seconds <= 0 || !isFinite(seconds)) {
    return '--:--';
  }

  const sec = Math.floor(seconds % 60);
  const min = Math.floor((seconds / 60) % 60);
  const hrs = Math.floor(seconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
  }
  return `${pad(min)}:${pad(sec)}`;
}

/**
 * Format timestamp into readable date time
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Extract clean hostname from a URL
 */
export function getDomainFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * Parse filename from Content-Disposition header
 */
export function parseFilenameFromContentDisposition(header?: string): string | null {
  if (!header) return null;
  // Match filename*="UTF-8''..." or filename="..." or filename=...
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

/**
 * Build sanitized filename using exact track title as requested
 */
export function buildSanitizedFilename(title: string, _artist?: string, ext = 'mp3'): string {
  return cleanFilename(title.trim(), ext);
}

/**
 * Sanitize filename to avoid invalid OS characters and ensure clean, readable song names
 */
export function cleanFilename(name: string, fallbackExt = 'mp3'): string {
  if (!name || !name.trim()) {
    name = `audio_${Date.now()}`;
  }

  // Remove URL query params / hashes if any
  let clean = name.split('?')[0].split('#')[0];

  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Keep as is if malformed
  }

  clean = clean.replace(/\\/g, '/');
  if (clean.includes('/')) {
    clean = clean.substring(clean.lastIndexOf('/') + 1);
  }

  // Replace pipes with a clean dash separator: "Song | Artist" -> "Song - Artist"
  clean = clean.replace(/\s*\|\s*/g, ' - ');

  // Replace illegal OS filename characters
  clean = clean.replace(/[<>:"/\\?*\x00-\x1F]/g, '_').trim();

  // Clean up multiple underscores or extra whitespace
  clean = clean.replace(/_+/g, '_').replace(/\s+/g, ' ').trim();

  // If no extension, add fallback
  if (!/\.[a-zA-Z0-9]{2,5}$/.test(clean)) {
    clean = `${clean}.${fallbackExt}`;
  }

  return clean || `audio_${Date.now()}.${fallbackExt}`;
}

/**
 * Get extension from URL or path
 */
export function getExtensionFromUrl(url: string): string {
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const match = cleanUrl.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

/**
 * Parse track title and artist from SoundCloud document/page title
 */
export function parseSoundCloudDocTitle(rawDocTitle: string): { title?: string; artist?: string } {
  if (!rawDocTitle) return {};
  let clean = rawDocTitle.trim();

  // Strip trailing site identifiers
  clean = clean.replace(/\s*\|\s*Listen online for free on SoundCloud.*$/i, '');
  clean = clean.replace(/\s*\|\s*Free Listening on SoundCloud.*$/i, '');
  clean = clean.replace(/\s*\|\s*SoundCloud.*$/i, '');
  clean = clean.replace(/\s*on SoundCloud.*$/i, '');
  clean = clean.replace(/^Stream\s+/i, '');
  clean = clean.replace(/^Listen to\s+/i, '');
  clean = clean.trim();

  // Pattern: "Song by Artist"
  const byMatch = clean.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch && byMatch[1] && byMatch[2]) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
  }

  // Pattern: "Artist - Song"
  const dashMatch = clean.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch && dashMatch[1] && dashMatch[2]) {
    return { artist: dashMatch[1].trim(), title: dashMatch[2].trim() };
  }

  if (clean && clean.toLowerCase() !== 'soundcloud') {
    return { title: clean };
  }

  return {};
}

/**
 * Parse title and artist from a browser tab title and URL
 */
export function parseTitleAndArtistFromTab(tabTitle: string, tabUrl: string): { title: string; artist?: string } {
  const domain = getDomainFromUrl(tabUrl);

  if (domain.includes('soundcloud.com')) {
    const scParsed = parseSoundCloudDocTitle(tabTitle);
    if (scParsed.title) {
      return { title: scParsed.title, artist: scParsed.artist };
    }
  }

  if (domain.includes('youtube.com')) {
    const ytTitle = tabTitle.replace(/\s*-\s*YouTube.*$/i, '').trim();
    if (ytTitle) return { title: ytTitle };
  }

  const generalTitle = tabTitle.replace(/[-|•].*$/, '').trim();
  return { title: generalTitle || `${domain} Media` };
}

/**
 * Extract format enum from mime type or extension
 * Note: Authoritative MIME type takes strict precedence over URL path!
 */
export function getFormatFromMimeOrExt(mimeType?: string, ext?: string): AudioFormat {
  const mime = (mimeType || '').toLowerCase();
  const e = (ext || '').toLowerCase().replace(/^\./, '');

  // 1. Authoritative MIME type check FIRST (determines actual audio encoding)
  if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) return 'mp3';
  if (mime.includes('audio/m4a') || mime.includes('audio/x-m4a')) return 'm4a';
  if (mime.includes('audio/aac') || mime.includes('audio/x-aac')) return 'aac';
  if (mime.includes('audio/wav') || mime.includes('audio/x-wav')) return 'wav';
  if (mime.includes('audio/flac') || mime.includes('audio/x-flac')) return 'flac';
  if (mime.includes('audio/ogg') || mime.includes('application/ogg')) return 'ogg';
  if (mime.includes('audio/opus')) return 'opus';
  if (mime.includes('audio/webm') || mime.includes('video/webm')) return 'webm';
  if (mime.includes('audio/mp4')) return 'm4a';
  if (mime.includes('video/mp4')) return 'mp4';
  if (mime.includes('application/vnd.apple.mpegurl') || mime.includes('application/x-mpegurl')) return 'hls';
  if (mime.includes('application/dash+xml')) return 'dash';

  // 2. Extension check if MIME is missing or generic (e.g. application/octet-stream)
  if (e === 'mp3') return 'mp3';
  if (e === 'm4a') return 'm4a';
  if (e === 'aac') return 'aac';
  if (e === 'wav') return 'wav';
  if (e === 'flac') return 'flac';
  if (e === 'ogg') return 'ogg';
  if (e === 'opus') return 'opus';
  if (e === 'm3u8') return 'hls';
  if (e === 'mpd') return 'dash';
  if (e === 'mp4') return 'mp4';
  if (e === 'webm') return 'webm';

  return 'unknown';
}
