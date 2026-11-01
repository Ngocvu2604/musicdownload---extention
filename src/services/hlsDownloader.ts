/**
 * AudioFlow HLS Stream Assembler & Downloader Engine
 *
 * Downloads all audio segments of an HLS (.m3u8) audio stream concurrently,
 * concatenates them into a single contiguous, high-quality audio file (M4A / MP3),
 * and delivers the complete song to the user.
 */

export interface HlsSegment {
  index: number;
  url: string;
  duration?: number;
  byteRange?: {
    length: number;
    offset: number;
  };
}

export interface HlsPlaylistInfo {
  isMaster: boolean;
  initSegmentUrl?: string;
  segments: HlsSegment[];
  targetDuration?: number;
  format: 'm4a' | 'mp3' | 'aac' | 'opus' | 'ts';
  mimeType: string;
  variantPlaylists?: string[];
}

export interface HlsProgressCallback {
  (progress: {
    percent: number;
    current: number;
    total: number;
    bytes: number;
  }): void;
}

export class HlsDownloader {
  /**
   * Parse an M3U8 playlist content
   */
  parsePlaylist(playlistUrl: string, content: string): HlsPlaylistInfo {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let isMaster = false;
    let initSegmentUrl: string | undefined = undefined;
    const segments: HlsSegment[] = [];
    const variantPlaylists: string[] = [];
    let currentDuration: number | undefined = undefined;
    let currentByteRange: { length: number; offset: number } | undefined = undefined;
    let lastByteOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Master Playlist variants
      if (line.startsWith('#EXT-X-STREAM-INF') || line.startsWith('#EXT-X-MEDIA:TYPE=AUDIO')) {
        isMaster = true;
        // Check for URI="..." in #EXT-X-MEDIA tag
        const uriMatch = line.match(/URI\s*=\s*["']([^"']+)["']/i);
        if (uriMatch && uriMatch[1]) {
          try {
            variantPlaylists.push(new URL(uriMatch[1], playlistUrl).href);
          } catch {
            variantPlaylists.push(uriMatch[1]);
          }
        }
        continue;
      }

      if (isMaster && !line.startsWith('#')) {
        try {
          variantPlaylists.push(new URL(line, playlistUrl).href);
        } catch {
          variantPlaylists.push(line);
        }
        continue;
      }

      // Media Playlist Initialization Segment (Fragmented MP4: ftyp + moov)
      if (line.startsWith('#EXT-X-MAP')) {
        const uriMatch = line.match(/URI\s*=\s*["']?([^"',\s]+)["']?/i);
        if (uriMatch && uriMatch[1]) {
          try {
            initSegmentUrl = new URL(uriMatch[1], playlistUrl).href;
          } catch {
            initSegmentUrl = uriMatch[1];
          }
        }
        continue;
      }

      // Segment duration
      if (line.startsWith('#EXTINF:')) {
        const durMatch = line.match(/#EXTINF:\s*([0-9.]+)/i);
        if (durMatch && durMatch[1]) {
          currentDuration = parseFloat(durMatch[1]);
        }
        continue;
      }

      // Byte range
      if (line.startsWith('#EXT-X-BYTERANGE:')) {
        const rangeMatch = line.match(/#EXT-X-BYTERANGE:\s*(\d+)(?:@(\d+))?/i);
        if (rangeMatch && rangeMatch[1]) {
          const length = parseInt(rangeMatch[1], 10);
          const offset = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : lastByteOffset;
          currentByteRange = { length, offset };
          lastByteOffset = offset + length;
        }
        continue;
      }

      // Media segment URI
      if (!line.startsWith('#')) {
        try {
          const segUrl = new URL(line, playlistUrl).href;
          segments.push({
            index: segments.length,
            url: segUrl,
            duration: currentDuration,
            byteRange: currentByteRange,
          });
        } catch {
          // If URL parsing fails, ignore invalid line
        }
        currentDuration = undefined;
        currentByteRange = undefined;
      }
    }

    // Determine audio format & mime type from segments or init url
    let format: 'm4a' | 'mp3' | 'aac' | 'opus' | 'ts' = 'm4a';
    let mimeType = 'audio/mp4';

    const testUrl = (initSegmentUrl || (segments[0] ? segments[0].url : '')).toLowerCase();
    if (testUrl.includes('.mp3')) {
      format = 'mp3';
      mimeType = 'audio/mpeg';
    } else if (testUrl.includes('.aac')) {
      format = 'aac';
      mimeType = 'audio/aac';
    } else if (testUrl.includes('.opus')) {
      format = 'opus';
      mimeType = 'audio/opus';
    } else if (testUrl.includes('.ts')) {
      format = 'ts';
      mimeType = 'audio/mp2t';
    } else {
      format = 'm4a';
      mimeType = 'audio/mp4';
    }

    return {
      isMaster,
      initSegmentUrl,
      segments,
      format,
      mimeType,
      variantPlaylists,
    };
  }

  /**
   * Fetch a single segment with retry logic
   */
  private async fetchSegmentWithRetry(
    url: string,
    byteRange?: { length: number; offset: number },
    retries = 3
  ): Promise<ArrayBuffer> {
    let lastError: any = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const headers: Record<string, string> = {};
        if (byteRange) {
          headers['Range'] = `bytes=${byteRange.offset}-${byteRange.offset + byteRange.length - 1}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok && res.status !== 206) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        return await res.arrayBuffer();
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }

    throw new Error(`Không thể tải phân đoạn sau 3 lần thử: ${url} (${lastError?.message || 'Network error'})`);
  }

  /**
   * Download all segments and stitch them into a complete playable Blob
   */
  async downloadAndStitchHls(params: {
    playlistUrl: string;
    onProgress?: HlsProgressCallback;
  }): Promise<{
    blob: Blob;
    mimeType: string;
    format: 'm4a' | 'mp3' | 'aac' | 'opus' | 'ts';
    totalBytes: number;
    segmentCount: number;
  }> {
    const { playlistUrl, onProgress } = params;

    // 1. Fetch the master or media playlist
    const res = await fetch(playlistUrl, {
      headers: {
        Accept: '*/*',
      },
    });
    if (!res.ok) {
      throw new Error(`Không thể tải danh sách phát HLS (HTTP ${res.status})`);
    }

    const playlistText = await res.text();
    let info = this.parsePlaylist(playlistUrl, playlistText);

    // If master playlist, fetch the first audio variant
    if (info.isMaster && info.variantPlaylists && info.variantPlaylists.length > 0) {
      const childUrl = info.variantPlaylists[0];
      const childRes = await fetch(childUrl, {
        headers: {
          Accept: '*/*',
        },
      });
      if (!childRes.ok) {
        throw new Error(`Không thể nạp luồng phát con từ Master Playlist (HTTP ${childRes.status})`);
      }
      const childText = await childRes.text();
      info = this.parsePlaylist(childUrl, childText);
    }

    if (info.segments.length === 0) {
      throw new Error('Danh sách phát HLS không chứa phân đoạn âm thanh nào');
    }

    let initBuffer: ArrayBuffer | null = null;
    let totalBytes = 0;

    // 2. Download initialization segment if present (fMP4)
    if (info.initSegmentUrl) {
      try {
        initBuffer = await this.fetchSegmentWithRetry(info.initSegmentUrl);
        totalBytes += initBuffer.byteLength;
      } catch (err: any) {
        console.warn('[AudioFlow] Warning: could not download init segment:', err);
      }
    }

    // 3. Concurrently download all segments
    const concurrency = 6;
    const totalSegments = info.segments.length;
    let nextIndex = 0;
    let completed = 0;
    const buffers: ArrayBuffer[] = new Array(totalSegments);

    const worker = async () => {
      while (nextIndex < totalSegments) {
        const currentIndex = nextIndex++;
        const segment = info.segments[currentIndex];
        const segBuffer = await this.fetchSegmentWithRetry(segment.url, segment.byteRange);
        buffers[currentIndex] = segBuffer;
        totalBytes += segBuffer.byteLength;
        completed++;

        if (onProgress) {
          const percent = Math.min(99, Math.round((completed / totalSegments) * 100));
          onProgress({
            percent,
            current: completed,
            total: totalSegments,
            bytes: totalBytes,
          });
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, totalSegments) },
      () => worker()
    );

    await Promise.all(workers);

    // 4. Stitch all buffers in exact order
    const allBuffers: ArrayBuffer[] = [];
    if (initBuffer) {
      allBuffers.push(initBuffer);
    }
    for (let i = 0; i < totalSegments; i++) {
      if (buffers[i]) {
        allBuffers.push(buffers[i]);
      }
    }

    const blob = new Blob(allBuffers, { type: info.mimeType });

    if (onProgress) {
      onProgress({
        percent: 100,
        current: totalSegments,
        total: totalSegments,
        bytes: totalBytes,
      });
    }

    return {
      blob,
      mimeType: info.mimeType,
      format: info.format,
      totalBytes,
      segmentCount: totalSegments,
    };
  }
}

export const hlsDownloader = new HlsDownloader();

