import React, { useState, useRef } from 'react';
import { DetectedMedia } from '../types/audio';
import { formatBytes, formatDuration } from '../utils/formatters';
import {
  Play,
  Pause,
  Download,
  Edit2,
  Copy,
  Check,
  Info,
  CheckSquare,
  Square,
  Film,
} from 'lucide-react';

interface AudioCardProps {
  item: DetectedMedia;
  isPlayingPreview: boolean;
  onPlayPreviewToggle: () => void;
  onDownload: (format?: 'mp3' | 'm4a' | 'wav' | 'mp4') => void;
  onRename: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const AudioCard: React.FC<AudioCardProps> = ({
  item,
  isPlayingPreview,
  onPlayPreviewToggle,
  onDownload,
  onRename,
  isSelected,
  onToggleSelect,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const menuTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isVideo =
    item.mediaType === 'video' ||
    item.format === 'mp4' ||
    (item.mediaUrl ? item.mediaUrl.toLowerCase().includes('.mp4') : false);

  const handleMouseEnter = () => {
    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current);
      menuTimerRef.current = null;
    }
    setShowFormatMenu(true);
  };

  const handleMouseLeave = () => {
    menuTimerRef.current = setTimeout(() => {
      setShowFormatMenu(false);
    }, 220);
  };

  // 3 distinct format choices for hover menu
  const formatOptions: Array<{
    id: 'mp3' | 'm4a' | 'wav' | 'mp4';
    label: string;
    sublabel: string;
    badge: string;
    isPrimary?: boolean;
  }> = isVideo
    ? [
        {
          id: 'mp4',
          label: 'MP4 Video',
          sublabel: 'Video gốc có hình & tiếng',
          badge: 'MP4',
          isPrimary: true,
        },
        {
          id: 'mp3',
          label: 'MP3 Audio',
          sublabel: 'Tách nhạc MP3 (192 kbps)',
          badge: 'MP3',
        },
        {
          id: 'wav',
          label: 'WAV Lossless',
          sublabel: 'Âm thanh phòng thu PCM',
          badge: 'WAV',
        },
      ]
    : [
        {
          id: 'mp3',
          label: 'MP3 Audio',
          sublabel: '192 kbps • Phổ biến nhất',
          badge: 'MP3',
          isPrimary: true,
        },
        {
          id: 'm4a',
          label: 'M4A (AAC)',
          sublabel: 'Chất lượng gốc từ máy chủ',
          badge: 'M4A',
        },
        {
          id: 'wav',
          label: 'WAV Lossless',
          sublabel: 'Âm thanh không nén (PCM)',
          badge: 'WAV',
        },
      ];

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.mediaUrl) return;
    try {
      await navigator.clipboard.writeText(item.mediaUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={`bg-surface-light dark:bg-surface-dark border rounded p-2.5 transition-colors ${
        isSelected
          ? 'border-brand'
          : 'border-line-light dark:border-line-dark hover:border-content-secondary/40'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Left column: Selection checkbox & Play preview */}
        <div className="flex flex-col items-center gap-2 pt-0.5 shrink-0">
          {/* Checkbox (if downloadable) */}
          {item.downloadable ? (
            <button
              onClick={onToggleSelect}
              title={isSelected ? 'Bỏ chọn' : 'Chọn tải hàng loạt'}
              className="text-content-secondary hover:text-brand transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-brand" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4"></div>
          )}

          {/* Audio Preview Button */}
          {item.mediaUrl && (
            <button
              onClick={onPlayPreviewToggle}
              title={isPlayingPreview ? 'Dừng nghe thử' : 'Nghe thử trực tiếp'}
              className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${
                isPlayingPreview
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface-light dark:bg-surface-dark text-content-light dark:text-content-dark border-line-light dark:border-line-dark hover:border-brand hover:text-brand'
              }`}
            >
              {isPlayingPreview ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* Media Details: Clean, Neatly Arranged, No redundant frames */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Header Row: Format Tag + Status Tag */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {isVideo ? (
              <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-brand text-white font-mono">
                <Film className="w-2.5 h-2.5" />
                <span>MP4 VIDEO</span>
              </span>
            ) : (
              <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm bg-brand/10 text-brand dark:bg-brand/20 border border-brand/20">
                {item.format && item.format !== 'unknown' ? item.format : 'MP3'}
              </span>
            )}

            {item.status === 'PLAYING' && (
              <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-brand text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span>ĐANG PHÁT</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-xs font-semibold text-content-light dark:text-content-dark truncate leading-snug"
            title={item.title}
          >
            {item.title}
          </h3>

          {/* Clean Subtitle / Metadata in ONE single text line (dot-separated, no redundant boxes!) */}
          <div className="flex items-center gap-1 text-[11px] text-content-secondary truncate mt-1">
            {item.artist && (
              <>
                <span className="truncate max-w-[130px] font-medium text-content-light/80 dark:text-content-dark/80">
                  {item.artist}
                </span>
                <span>•</span>
              </>
            )}
            <span className="truncate">{item.website}</span>
            {item.duration && item.duration > 0 && (
              <>
                <span>•</span>
                <span className="font-mono">{formatDuration(item.duration)}</span>
              </>
            )}
            {item.size && item.size > 0 && (
              <>
                <span>•</span>
                <span className="font-mono">{formatBytes(item.size)}</span>
              </>
            )}
          </div>

          {/* Notice ONLY if not downloadable */}
          {!item.downloadable && (
            <p className="text-[10px] text-brand/90 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.downloadReason || 'Nguồn phát trực tuyến'}</span>
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-1 items-center shrink-0">
          {/* Download Button with Hover Menu (3 choices) */}
          {item.downloadable ? (
            <div
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => onDownload(isVideo ? 'mp4' : 'mp3')}
                title={
                  isVideo
                    ? 'Nhấp để tải Video MP4 (rê chuột để chọn MP3 / WAV)'
                    : 'Nhấp để tải MP3 (rê chuột để chọn M4A / WAV)'
                }
                className="w-7 h-7 rounded bg-brand hover:bg-brand-dark text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Hover Dropdown Menu with 3 Format Choices */}
              {showFormatMenu && (
                <div
                  className="absolute right-0 top-full pt-1 z-50 animate-fade-in"
                  style={{ width: '168px' }}
                >
                  <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded shadow-2xl py-1 text-xs overflow-hidden">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-content-secondary uppercase tracking-wider border-b border-line-light dark:border-line-dark flex items-center justify-between">
                      <span>CHỌN ĐỊNH DẠNG</span>
                      <span className="text-[8px] font-semibold text-brand">3 tùy chọn</span>
                    </div>

                    <div className="py-0.5 divide-y divide-line-light/40 dark:divide-line-dark/40">
                      {formatOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFormatMenu(false);
                            onDownload(opt.id);
                          }}
                          className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-brand/10 dark:hover:bg-brand/20 transition-colors group/opt"
                        >
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="text-[11px] font-semibold text-content-light dark:text-content-dark group-hover/opt:text-brand transition-colors truncate">
                              {opt.label}
                            </span>
                            <span className="text-[9px] text-content-secondary truncate">
                              {opt.sublabel}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm font-mono shrink-0 transition-colors ${
                              opt.isPrimary
                                ? 'bg-brand text-white'
                                : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark group-hover/opt:border-brand/40 group-hover/opt:text-brand'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              disabled
              title={item.downloadReason || 'Nguồn phát trực tuyến, không hỗ trợ tải trực tiếp'}
              className="w-7 h-7 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary/40 flex items-center justify-center cursor-not-allowed border border-line-light dark:border-line-dark"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Rename Button */}
          {item.downloadable && (
            <button
              onClick={onRename}
              title="Đổi tên file trước khi tải"
              className="w-7 h-7 rounded text-content-secondary hover:text-content-light dark:hover:text-content-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark flex items-center justify-center transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          {/* Copy URL Button */}
          {item.mediaUrl && (
            <button
              onClick={handleCopyUrl}
              title={copied ? 'Đã sao chép liên kết!' : 'Sao chép đường dẫn nguồn'}
              className="w-7 h-7 rounded text-content-secondary hover:text-content-light dark:hover:text-content-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark flex items-center justify-center transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-brand" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
