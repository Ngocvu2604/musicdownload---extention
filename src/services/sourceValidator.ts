import { SourceValidationResult, AudioFormat } from '../types/audio';
import { getFormatFromMimeOrExt, parseFilenameFromContentDisposition, getExtensionFromUrl } from '../utils/formatters';
import { isStreamChunkOrFragment } from '../utils/audioDetector';

export class SourceValidator {
  /**
   * Validate a media source URL before downloading
   */
  async validateSource(url: string): Promise<SourceValidationResult> {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: 'URL không hợp lệ hoặc để trống',
      };
    }

    const isHlsPlaylist = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('/playlist');

    if (isStreamChunkOrFragment(url)) {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: 'Liên kết này là phân đoạn phát luồng ngắn (chunk), không phải tệp âm thanh hoàn chỉnh MP3/WAV để tải',
      };
    }

    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: 'Nguồn phát trực tuyến (Blob/Data URI), không hỗ trợ tải trực tiếp qua HTTP',
      };
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: 'Giao thức không được hỗ trợ (chỉ hỗ trợ http/https)',
      };
    }

    try {
      const lowerUrl = url.toLowerCase();
      const isKnownHeadBlockingCdn =
        lowerUrl.includes('tiktokcdn') ||
        lowerUrl.includes('tiktokv') ||
        lowerUrl.includes('byteoversea') ||
        lowerUrl.includes('ibytedtos');

      // 1. First attempt: HEAD request (skipped for CDNs known to reject HEAD with 503)
      let response: Response | null = null;
      let usedRangeGet = isKnownHeadBlockingCdn;

      if (!isKnownHeadBlockingCdn) {
        try {
          response = await fetch(url, {
            method: 'HEAD',
            credentials: 'omit',
            headers: {
              'Accept': 'audio/*, video/*, */*',
            },
          });
        } catch {
          usedRangeGet = true;
        }
      }

      // 2. Fallback to GET with Range (0-1 byte) if HEAD was skipped or returned non-2xx status (e.g. 503, 403, 405)
      if (usedRangeGet || !response || !response.ok) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Range': 'bytes=0-1',
              'Accept': 'audio/*, video/*, */*',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (e: any) {
          return {
            isValid: false,
            isAudioOrVideo: false,
            error: `Lỗi kết nối tới máy chủ nguồn: ${e?.message || 'Network error'}`,
          };
        }
      }

      if (!response) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          error: 'Không nhận được phản hồi từ máy chủ nguồn',
        };
      }

      const status = response.status;

      // Handle HTTP error codes
      if (status === 404 || status === 410) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          error: `Tài nguyên không tồn tại hoặc liên kết đã hết hạn (HTTP ${status})`,
        };
      }

      if (status === 401 || status === 403) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          error: `Máy chủ yêu cầu quyền truy cập hoặc xác thực (HTTP ${status})`,
        };
      }

      if (status >= 500) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          error: `Máy chủ nguồn gặp lỗi nội bộ (HTTP ${status})`,
        };
      }

      // Check Content-Type
      const rawContentType = response.headers.get('content-type') || '';
      const contentType = rawContentType.toLowerCase();

      // If HLS playlist (.m3u8), text/plain or mpegurl is expected and valid!
      if (isHlsPlaylist) {
        return {
          isValid: true,
          isAudioOrVideo: true,
          contentType: contentType || 'application/vnd.apple.mpegurl',
          httpStatus: status,
          suggestedFormat: 'm4a',
        };
      }

      // Detect HTML / JSON error responses disguised as audio files!
      if (
        contentType.includes('text/html') ||
        contentType.includes('application/json') ||
        contentType.includes('text/plain')
      ) {
        return {
          isValid: false,
          isAudioOrVideo: false,
          httpStatus: status,
          contentType,
          error: 'Liên kết trả về nội dung trang Web/HTML, không phải file âm thanh hợp lệ (URL có thể đã hết hạn)',
        };
      }

      const contentLengthHeader = response.headers.get('content-length');
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;
      const contentDisposition = response.headers.get('content-disposition');
      const filenameFromHeader = parseFilenameFromContentDisposition(contentDisposition || undefined);

      const ext = getExtensionFromUrl(url);
      const isMediaMime =
        contentType.startsWith('audio/') ||
        contentType.startsWith('video/') ||
        contentType.includes('application/ogg') ||
        contentType.includes('application/vnd.apple.mpegurl') ||
        contentType.includes('application/octet-stream');

      const suggestedFormat: AudioFormat = getFormatFromMimeOrExt(contentType, ext);

      return {
        isValid: true,
        isAudioOrVideo: isMediaMime || suggestedFormat !== 'unknown',
        contentType,
        contentLength: contentLength && contentLength > 0 ? contentLength : undefined,
        contentDispositionFilename: filenameFromHeader || undefined,
        httpStatus: status,
        suggestedFormat,
      };
    } catch (err: any) {
      return {
        isValid: false,
        isAudioOrVideo: false,
        error: `Không thể xác thực nguồn: ${err?.message || 'Network error'}`,
      };
    }
  }
}

export const sourceValidator = new SourceValidator();

