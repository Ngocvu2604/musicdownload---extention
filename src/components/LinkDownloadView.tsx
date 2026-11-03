import React, { useState } from 'react';
import { linkResolver } from '../services/linkResolver';
import { downloadManager } from '../services/downloadManager';
import {
  Link2,
  Download,
  Clipboard,
  Loader2,
  Video,
  Music,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Music2,
  FolderDown,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LinkDownloadViewProps {
  onDownloadStarted: () => void;
}

export const LinkDownloadView: React.FC<LinkDownloadViewProps> = ({ onDownloadStarted }) => {
  const [url, setUrl] = useState('');
  const [targetFormat, setTargetFormat] = useState<'mp4' | 'mp3' | 'wav'>('mp3');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith('http')) {
        const clean = text.trim();
        setUrl(clean);
        setErrorMessage(null);

        // Auto-detect format based on URL
        if (clean.includes('soundcloud.com')) {
          setTargetFormat('mp3');
        } else if (clean.includes('tiktok.com') || clean.includes('youtube.com') || clean.includes('youtu.be')) {
          setTargetFormat('mp4');
        }
      }
    } catch {}
  };

  const handleDownload = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      setErrorMessage('Vui lòng nhập đường dẫn hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage('Đang phân giải liên kết...');

    try {
      // 1. Resolve media from URL
      setStatusMessage('Đang trích xuất nguồn phát...');
      const resolved = await linkResolver.resolveUrl(cleanUrl, targetFormat);

      setStatusMessage('Đang khởi tạo tải xuống...');

      // 2. Start download into configured subfolder (Downloads/music/)
      await downloadManager.startDownload({
        url: resolved.url,
        filename: `${resolved.title}.${resolved.format}`,
        domain: resolved.source || 'media',
        pageUrl: cleanUrl,
        targetFormat: resolved.format,
        explicitFormatSelection: true,
        skipValidation: true,
      });

      setSuccessMessage(`Bắt đầu tải "${resolved.title}"`);
      setUrl('');
      setStatusMessage(null);

      // Transition to downloads tab
      setTimeout(() => {
        onDownloadStarted();
      }, 600);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải liên kết này. Vui lòng kiểm tra lại URL.'
      );
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-3.5 animate-fade-in max-w-full overflow-hidden select-none">
      {/* Title */}
      <div className="flex items-center justify-between pb-0.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-content-light dark:text-content-dark">
              Tải từ liên kết
            </h2>
            <p className="text-[10px] text-content-secondary">
              Dán URL video hoặc bài hát để tải về máy
            </p>
          </div>
        </div>
        <span className="text-[10px] text-content-secondary font-mono">
          SoundCloud • TikTok
        </span>
      </div>

      {/* Input Field (Enlarged & Comfortable) */}
      <div className="flex items-center bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark focus-within:border-brand rounded px-3 h-10 transition-colors gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setErrorMessage(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleDownload();
          }}
          placeholder="Dán link SoundCloud, TikTok, YouTube..."
          className="flex-1 bg-transparent text-xs text-content-light dark:text-content-dark outline-none font-mono placeholder:text-content-secondary/50 min-w-0"
        />

        {url ? (
          <button
            type="button"
            onClick={() => {
              setUrl('');
              setErrorMessage(null);
            }}
            className="text-[11px] text-content-secondary hover:text-content-light dark:hover:text-content-dark px-1.5 py-1 rounded transition-colors"
          >
            Xóa
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePaste}
            title="Dán từ khay nhớ tạm"
            className="flex items-center gap-1 text-[11px] text-content-secondary hover:text-brand px-1.5 py-1 rounded transition-colors font-medium"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Dán</span>
          </button>
        )}
      </div>

      {/* 3 Format Buttons (Enlarged & Equal Size) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setTargetFormat('mp3')}
          className={`flex items-center justify-center gap-1.5 h-9 rounded text-xs font-medium border transition-colors ${
            targetFormat === 'mp3'
              ? 'bg-brand text-white border-brand font-semibold shadow-sm'
              : 'bg-surface-light dark:bg-surface-dark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
          }`}
        >
          <Music className="w-3.5 h-3.5 shrink-0" />
          <span>MP3</span>
        </button>

        <button
          type="button"
          onClick={() => setTargetFormat('mp4')}
          className={`flex items-center justify-center gap-1.5 h-9 rounded text-xs font-medium border transition-colors ${
            targetFormat === 'mp4'
              ? 'bg-brand text-white border-brand font-semibold shadow-sm'
              : 'bg-surface-light dark:bg-surface-dark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
          }`}
        >
          <Video className="w-3.5 h-3.5 shrink-0" />
          <span>MP4</span>
        </button>

        <button
          type="button"
          onClick={() => setTargetFormat('wav')}
          className={`flex items-center justify-center gap-1.5 h-9 rounded text-xs font-medium border transition-colors ${
            targetFormat === 'wav'
              ? 'bg-brand text-white border-brand font-semibold shadow-sm'
              : 'bg-surface-light dark:bg-surface-dark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>WAV</span>
        </button>
      </div>

      {/* Primary Download Button (Enlarged h-10) */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={!url.trim() || isLoading}
        className="w-full h-10 rounded bg-brand hover:bg-brand-dark text-white font-semibold text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4 shrink-0" />
            <span>Tải ngay</span>
          </>
        )}
      </button>

      {/* Collapsible Support Section: NO BOX, PLACED DIRECTLY BELOW DOWNLOAD BUTTON, EXPANDS DOWNWARDS */}
      <div className="pt-0.5 select-none">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center justify-between w-full py-1 text-[11px] font-medium text-content-secondary hover:text-content-light dark:hover:text-content-dark transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-brand" />
            <span>Hỗ trợ & Lưu ý tải tệp</span>
          </div>
          {showGuide ? (
            <ChevronUp className="w-3.5 h-3.5 text-content-secondary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-content-secondary" />
          )}
        </button>

        {showGuide && (
          <div className="pt-1.5 space-y-1.5 text-[11px] text-content-secondary leading-relaxed animate-fade-in pl-1">
            <div className="flex items-start gap-2">
              <Music2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
              <span><strong>SoundCloud:</strong> Tự động bóc tách luồng phát gốc chất lượng cao sang MP3 / WAV.</span>
            </div>
            <div className="flex items-start gap-2">
              <Video className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
              <span><strong>TikTok:</strong> Tải video MP4 HD không logo hoặc tách âm thanh gốc.</span>
            </div>
            <div className="flex items-start gap-2">
              <FolderDown className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
              <span><strong>Vị trí lưu:</strong> Tệp được tự động lưu vào <code>Downloads/music/</code>.</span>
            </div>
          </div>
        )}
      </div>

      {/* Status / Loading / Success / Error Notifications */}
      {statusMessage && (
        <div className="bg-brand/10 border border-brand/20 rounded p-2.5 flex items-center gap-2 text-xs text-brand animate-fade-in">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="font-medium leading-tight truncate">{statusMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2.5 flex items-center gap-2 text-xs text-emerald-500 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium truncate">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2.5 text-xs text-red-500 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="leading-snug text-[11px]">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
