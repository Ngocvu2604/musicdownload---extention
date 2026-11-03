/**
 * AudioFlow Universal Link Media Resolver
 * Resolves media download links from SoundCloud, TikTok, YouTube, and direct web sources.
 */

import { cleanFilename } from '../utils/formatters';

export interface ResolvedMediaResult {
  url: string;
  title: string;
  artist?: string;
  format: 'mp4' | 'mp3' | 'wav';
  source: string;
  isStream?: boolean;
}

// Known working SoundCloud client IDs (with dynamic fallback)
const KNOWN_SC_CLIENT_IDS = [
  'OGA0P5R5U4CpyooNe9OUcnjIMxao2hB2',
  'a3dd183dc579bc1bfc8579f1a084197b',
  '2t9loNfh0ekOfbnFeO3wEiHGMIjv3mt2',
];

class LinkResolver {
  private cachedScClientId: string | null = null;

  /**
   * Identify platform from URL
   */
  getPlatform(rawUrl: string): 'youtube' | 'tiktok' | 'soundcloud' | 'direct' {
    const lower = rawUrl.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return 'youtube';
    }
    if (lower.includes('tiktok.com') || lower.includes('douyin.com')) {
      return 'tiktok';
    }
    if (lower.includes('soundcloud.com') || lower.includes('on.soundcloud.com')) {
      return 'soundcloud';
    }
    return 'direct';
  }

  /**
   * Scrape active SoundCloud Client ID from asset scripts
   */
  private async getSoundCloudClientId(html: string): Promise<string> {
    if (this.cachedScClientId) return this.cachedScClientId;

    try {
      const scriptUrls = [...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(
        (m) => m[1]
      );

      for (let i = scriptUrls.length - 1; i >= 0 && i >= scriptUrls.length - 4; i--) {
        try {
          const resp = await fetch(scriptUrls[i]);
          if (resp.ok) {
            const text = await resp.text();
            const idMatch = text.match(/client_id[:=]"([a-zA-Z0-9]{32})"/);
            if (idMatch && idMatch[1]) {
              this.cachedScClientId = idMatch[1];
              return this.cachedScClientId;
            }
          }
        } catch {}
      }
    } catch {}

    // Fallback to verified active client ID
    return KNOWN_SC_CLIENT_IDS[0];
  }

  /**
   * Resolve SoundCloud track natively using SoundCloud's internal streaming APIs
   */
  async resolveSoundCloud(
    url: string,
    targetFormat: 'mp4' | 'mp3' | 'wav' = 'mp3'
  ): Promise<ResolvedMediaResult> {
    try {
      let soundData: any = null;
      let clientId = this.cachedScClientId || KNOWN_SC_CLIENT_IDS[0];
      let html = '';

      // 1. Fetch the SoundCloud track page HTML
      try {
        const resp = await fetch(url, {
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        if (resp.ok) {
          html = await resp.text();
          clientId = await this.getSoundCloudClientId(html);

          // 2. Extract hydration JSON state
          const hydMatch = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);/s);
          if (hydMatch) {
            try {
              const parsed = JSON.parse(hydMatch[1]);
              const found = parsed.find((item: any) => item.hydratable === 'sound');
              if (found && found.data) {
                soundData = found.data;
              }
            } catch {}
          }
        }
      } catch (fetchErr) {
        console.warn('[AudioFlow] HTML fetch failed for SoundCloud track:', fetchErr);
      }

      // Fallback: If hydration didn't find soundData, resolve via SoundCloud V2 API
      if (!soundData) {
        try {
          const resolveApiUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${clientId}`;
          const apiRes = await fetch(resolveApiUrl);
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData && (apiData.kind === 'track' || apiData.media?.transcodings)) {
              soundData = apiData;
            }
          }
        } catch {}
      }

      if (!soundData) {
        throw new Error('Không thể tìm thấy thông tin bài hát trên trang SoundCloud này');
      }

      const rawTitle = soundData.title || 'SoundCloud Track';
      const artist = soundData.user?.username || soundData.user?.permalink || 'SoundCloud Artist';
      const cleanTitle = cleanFilename(`${rawTitle} - ${artist}`);

      // 3. Find optimal audio transcoding
      const transcodings: any[] = soundData.media?.transcodings || [];
      if (transcodings.length === 0) {
        throw new Error('Bài hát không có luồng phát trực tuyến công khai');
      }

      // Sort transcodings: Prioritize working AAC/MP4 HLS, avoid broken legacy abr_sq (which gives 404)
      const sortedTrans = [...transcodings].sort((a, b) => {
        const aIsAac = (a.preset?.includes('aac') || a.format?.mime_type?.includes('mp4')) && a.format?.protocol === 'hls';
        const bIsAac = (b.preset?.includes('aac') || b.format?.mime_type?.includes('mp4')) && b.format?.protocol === 'hls';
        if (aIsAac && !bIsAac) return -1;
        if (!aIsAac && bIsAac) return 1;

        const aIsHls = a.format?.protocol === 'hls';
        const bIsHls = b.format?.protocol === 'hls';
        if (aIsHls && !bIsHls) return -1;
        if (!aIsHls && bIsHls) return 1;

        const aIsAbr = a.preset?.includes('abr');
        const bIsAbr = b.preset?.includes('abr');
        if (aIsAbr && !bIsAbr) return 1;
        if (!aIsAbr && bIsAbr) return -1;

        return 0;
      });

      // 4. Try available transcodings until a stream URL is successfully acquired
      let streamJson: any = null;
      let lastStatus = 404;

      for (const trans of sortedTrans) {
        try {
          const streamEndpoint = `${trans.url}?client_id=${clientId}`;
          const streamResp = await fetch(streamEndpoint);
          if (streamResp.ok) {
            const json = await streamResp.json();
            if (json && json.url) {
              streamJson = json;
              break;
            }
          } else {
            lastStatus = streamResp.status;
          }
        } catch {}
      }

      if (!streamJson || !streamJson.url) {
        throw new Error(`SoundCloud từ chối cấp luồng (${lastStatus})`);
      }

      const finalFmt = targetFormat === 'wav' ? 'wav' : 'mp3';

      return {
        url: streamJson.url,
        title: cleanTitle,
        artist,
        format: finalFmt,
        source: 'soundcloud',
        isStream: true,
      };
    } catch (e: any) {
      if (e?.message && e.message.includes('Failed to fetch')) {
        throw new Error('Lỗi kết nối mạng: Không thể tải dữ liệu từ SoundCloud. Vui lòng kiểm tra lại đường dẫn.');
      }
      throw e;
    }
  }

  /**
   * Search track on SoundCloud and resolve fresh HLS stream directly
   */
  async resolveSoundCloudByQuery(
    query: string,
    targetFormat: 'mp4' | 'mp3' | 'wav' = 'mp3'
  ): Promise<ResolvedMediaResult | null> {
    try {
      const clientId = this.cachedScClientId || KNOWN_SC_CLIENT_IDS[0];
      const cleanQ = query.replace(/\.[a-zA-Z0-9]{2,5}$/, '').replace(/[_+-]+/g, ' ').trim();
      if (!cleanQ) return null;

      const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(cleanQ)}&client_id=${clientId}&limit=3`;
      const res = await fetch(searchUrl);
      if (!res.ok) return null;
      const data = await res.json();
      const track = data.collection && data.collection[0];
      if (!track || !track.media?.transcodings?.length) return null;

      const transcodings = track.media.transcodings;
      const sortedTrans = [...transcodings].sort((a: any, b: any) => {
        const aIsAac = (a.preset?.includes('aac') || a.format?.mime_type?.includes('mp4')) && a.format?.protocol === 'hls';
        const bIsAac = (b.preset?.includes('aac') || b.format?.mime_type?.includes('mp4')) && b.format?.protocol === 'hls';
        if (aIsAac && !bIsAac) return -1;
        if (!aIsAac && bIsAac) return 1;

        const aIsHls = a.format?.protocol === 'hls';
        const bIsHls = b.format?.protocol === 'hls';
        if (aIsHls && !bIsHls) return -1;
        if (!aIsHls && bIsHls) return 1;

        const aIsAbr = a.preset?.includes('abr');
        const bIsAbr = b.preset?.includes('abr');
        if (aIsAbr && !bIsAbr) return 1;
        if (!aIsAbr && bIsAbr) return -1;

        return 0;
      });

      let streamJson: any = null;
      for (const trans of sortedTrans) {
        try {
          const streamResp = await fetch(`${trans.url}?client_id=${clientId}`);
          if (streamResp.ok) {
            const json = await streamResp.json();
            if (json && json.url) {
              streamJson = json;
              break;
            }
          }
        } catch {}
      }

      if (!streamJson || !streamJson.url) return null;

      const rawTitle = track.title || cleanQ;
      const artist = track.user?.username || track.user?.permalink || 'SoundCloud Artist';

      return {
        url: streamJson.url,
        title: cleanFilename(`${rawTitle} - ${artist}`),
        artist,
        format: targetFormat === 'wav' ? 'wav' : 'mp3',
        source: 'soundcloud',
        isStream: true,
      };
    } catch {
      return null;
    }
  }

  /**
   * Resolve a TikTok video/music URL using TikWM API (Fast, no watermark, free)
   */
  async resolveTikTok(
    url: string,
    targetFormat: 'mp4' | 'mp3' | 'wav'
  ): Promise<ResolvedMediaResult> {
    try {
      let cleanUrl = url.trim();

      // Resolve redirect for mobile shortlinks (vt.tiktok.com / vm.tiktok.com)
      if (cleanUrl.includes('vt.tiktok.com') || cleanUrl.includes('vm.tiktok.com')) {
        try {
          const redirectResp = await fetch(cleanUrl, {
            redirect: 'follow',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
          if (redirectResp.ok && redirectResp.url && !redirectResp.url.includes('tiktok.com/?_r=1')) {
            cleanUrl = redirectResp.url;
          }
        } catch {}
      }

      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`;
      const resp = await fetch(apiUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!resp.ok) {
        throw new Error(`Lỗi kết nối máy chủ TikTok (${resp.status})`);
      }

      const json = await resp.json();
      if (json.code === 0 && json.data) {
        const title =
          (json.data.title || 'TikTok Video').replace(/[#@][\w]+/g, '').trim() || 'TikTok Media';
        const artist = json.data.author?.nickname || json.data.author?.unique_id || 'TikTok Creator';

        let downloadUrl = json.data.play;
        let finalFormat: 'mp4' | 'mp3' | 'wav' = targetFormat;

        if (targetFormat === 'mp3' || targetFormat === 'wav') {
          downloadUrl = json.data.music || json.data.play;
          finalFormat = targetFormat;
        } else {
          downloadUrl = json.data.play || json.data.wmplay;
          finalFormat = 'mp4';
        }

        if (downloadUrl.startsWith('//')) {
          downloadUrl = `https:${downloadUrl}`;
        } else if (downloadUrl.startsWith('/')) {
          downloadUrl = `https://www.tikwm.com${downloadUrl}`;
        }

        return {
          url: downloadUrl,
          title: cleanFilename(title, finalFormat),
          artist,
          format: finalFormat,
          source: 'tiktok',
        };
      } else {
        throw new Error(json.msg || 'Không thể lấy dữ liệu video TikTok. Vui lòng kiểm tra lại URL.');
      }
    } catch (e: any) {
      if (e?.message && e.message.includes('Failed to fetch')) {
        throw new Error('Lỗi kết nối mạng khi tải TikTok. Vui lòng kiểm tra kết nối Internet.');
      }
      throw e;
    }
  }

  /**
   * Resolve YouTube video/audio
   */
  async resolveYouTube(
    url: string,
    targetFormat: 'mp4' | 'mp3' | 'wav'
  ): Promise<ResolvedMediaResult> {
    // Extract video ID
    let videoId = '';
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) {
        videoId = parsed.pathname.replace('/', '');
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
    } catch {}

    if (!videoId) {
      throw new Error('Không thể nhận diện mã video YouTube từ liên kết này.');
    }

    // Try public Invidious instances
    const invidiousInstances = [
      'https://invidious.nerdvpn.de',
      'https://inv.nadeko.net',
      'https://yewtu.be',
      'https://invidious.protokolla.fi',
    ];

    for (const inst of invidiousInstances) {
      try {
        const resp = await fetch(`${inst}/api/v1/videos/${videoId}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.title) {
            const isAudio = targetFormat === 'mp3' || targetFormat === 'wav';
            let mediaUrl = '';

            if (isAudio && data.adaptiveFormats && data.adaptiveFormats.length > 0) {
              const audioStream = data.adaptiveFormats.find((f: any) => f.type?.includes('audio'));
              if (audioStream?.url) mediaUrl = audioStream.url;
            }

            if (!mediaUrl && data.formatStreams && data.formatStreams.length > 0) {
              mediaUrl = data.formatStreams[0]?.url || '';
            }

            if (mediaUrl) {
              return {
                url: mediaUrl,
                title: cleanFilename(data.title),
                artist: data.author,
                format: isAudio ? targetFormat : 'mp4',
                source: 'youtube',
              };
            }
          }
        }
      } catch {}
    }

    // Inform user of browser tab alternative
    throw new Error(
      'YouTube chặn trích xuất qua liên kết ngoài. Bạn hãy mở video trên tab trình duyệt, AudioFlow sẽ tự động bắt luồng để tải tại tab "Phát hiện"!'
    );
  }

  /**
   * Main resolver entrypoint
   */
  async resolveUrl(url: string, targetFormat: 'mp4' | 'mp3' | 'wav'): Promise<ResolvedMediaResult> {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      throw new Error('Đường dẫn không hợp lệ. Vui lòng bắt đầu bằng http:// hoặc https://');
    }

    const platform = this.getPlatform(cleanUrl);

    if (platform === 'soundcloud') {
      return await this.resolveSoundCloud(cleanUrl, targetFormat);
    }

    if (platform === 'tiktok') {
      return await this.resolveTikTok(cleanUrl, targetFormat);
    }

    if (platform === 'youtube') {
      return await this.resolveYouTube(cleanUrl, targetFormat);
    }

    // Direct file URL
    let title = 'media_file';
    try {
      const parsed = new URL(cleanUrl);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        title = segments[segments.length - 1].replace(/\.[a-zA-Z0-9]{2,5}$/, '');
      }
    } catch {}

    const isVideo = cleanUrl.toLowerCase().includes('.mp4') || cleanUrl.toLowerCase().includes('.webm');
    const format = targetFormat || (isVideo ? 'mp4' : 'mp3');

    return {
      url: cleanUrl,
      title: cleanFilename(title),
      format,
      source: 'direct',
    };
  }
}

export const linkResolver = new LinkResolver();
