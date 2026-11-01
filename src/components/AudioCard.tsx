import React, { useState } from 'react';
import {
  DetectedMedia,
  MediaPlaybackStatus,
  MediaSourceType,
  DownloadStatus,
  AudioFormat,
} from '../types/audio';
import { formatBytes, formatDuration } from '../utils/formatters';
import {
  Play,
  Pause,
  Download,
  Edit2,
  Copy,
  Check,
  Globe,
  Radio,
  FileAudio,
  RadioTower,
  Info,
  ListMusic,
  Layers,
  User,
  CheckSquare,
  Square,
} from 'lucide-react';

interface AudioCardProps {
  item: DetectedMedia;
  isPlayingPreview: boolean;
  onPlayPreviewToggle: () => void;
  onDownload: () => void;
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

  // Playback Status Badge (Minimalist)
  const getPlaybackStatusBadge = (status: MediaPlaybackStatus) => {
    switch (status) {
      case 'PLAYING':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand/10 dark:bg-brand/20 text-brand">
            <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
            <span>ĐANG PHÁT</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            TẠM DỪNG
          </span>
        );
      case 'BUFFERING':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            BUFFERING
          </span>
        );
      default:
        return null;
    }
  };

  // Source Type Badge (Flat, Neutral, Minimalist)
  const getSourceTypeBadge = (sourceType: MediaSourceType) => {
    switch (sourceType) {
      case 'DIRECT_FILE':
      case 'DIRECT':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            DIRECT
          </span>
        );
      case 'STREAMING_MEDIA':
      case 'STREAMING':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            STREAM
          </span>
        );
      case 'BLOB_MEDIA':
      case 'BLOB':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            BLOB
          </span>
        );
      case 'PLAYLIST':
        return (
          <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            <ListMusic className="w-2.5 h-2.5" />
            <span>PLAYLIST</span>
          </span>
        );
      case 'MEDIA_SEGMENT':
        return (
          <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            <Layers className="w-2.5 h-2.5" />
            <span>SEGMENT</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Download Status Badge
  const getDownloadStatusBadge = (status?: DownloadStatus) => {
    if (!status) return null;
    switch (status) {
      case 'READY_TO_DOWNLOAD':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand dark:bg-brand/20">
            TẢI ĐƯỢC
          </span>
        );
      case 'STREAMING_ONLY':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border border-line-light dark:border-line-dark">
            STREAM ONLY
          </span>
        );
      case 'NOT_AVAILABLE':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary">
            CHỈ PHÁT
          </span>
        );
      default:
        return null;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube-source':
        return <RadioTower className="w-3 h-3 text-brand" />;
      case 'soundcloud-source':
        return <Radio className="w-3 h-3 text-brand" />;
      case 'dom-video':
        return <FileAudio className="w-3 h-3 text-content-secondary" />;
      case 'dom-audio':
        return <FileAudio className="w-3 h-3 text-content-secondary" />;
      default:
        return <Globe className="w-3 h-3 text-content-secondary" />;
    }
  };

  return (
    <div
      className={`bg-surface-light dark:bg-surface-dark border rounded-lg p-3 transition-colors ${
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
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
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

        {/* Media Details */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Status, SourceType, Format, DownloadStatus */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {getPlaybackStatusBadge(item.status)}
            {getSourceTypeBadge(item.sourceType)}
            {getDownloadStatusBadge(item.downloadStatus)}
            {item.format && item.format !== 'unknown' && (
              <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-surface-hoverLight dark:bg-surface-hoverDark text-content-light dark:text-content-dark border border-line-light dark:border-line-dark">
                {item.format}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-xs font-semibold text-content-light dark:text-content-dark truncate mb-0.5"
            title={item.title}
          >
            {item.title}
          </h3>

          {/* Artist/Channel (SoundCloud, YouTube) */}
          {item.artist && (
            <div className="flex items-center gap-1 text-[11px] text-content-secondary truncate mb-1">
              <User className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">{item.artist}</span>
            </div>
          )}

          {/* Status Note / Reason */}
          {!item.downloadable ? (
            <p className="text-[10px] text-content-secondary mb-1.5 flex items-center gap-1 bg-surface-hoverLight dark:bg-surface-hoverDark px-1.5 py-0.5 rounded border border-line-light dark:border-line-dark">
              <Info className="w-3 h-3 shrink-0 text-brand" />
              <span className="truncate">{item.downloadReason}</span>
            </p>
          ) : (
            <p
              className="text-[10px] text-content-secondary truncate mb-1.5 font-mono"
              title={item.filename}
            >
              {item.filename}
            </p>
          )}

          {/* Metadata Chips: Time, Size, Website, Protocol */}
          <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-content-secondary">
            {item.duration && item.duration > 0 && (
              <span className="bg-surface-hoverLight dark:bg-surface-hoverDark px-1.5 py-0.5 rounded border border-line-light dark:border-line-dark">
                {formatDuration(item.currentTime)} / {formatDuration(item.duration)}
              </span>
            )}

            {item.size && item.size > 0 && (
              <span className="bg-surface-hoverLight dark:bg-surface-hoverDark px-1.5 py-0.5 rounded border border-line-light dark:border-line-dark">
                {formatBytes(item.size)}
              </span>
            )}

            <span className="flex items-center gap-1 bg-surface-hoverLight dark:bg-surface-hoverDark px-1.5 py-0.5 rounded border border-line-light dark:border-line-dark">
              {getSourceIcon(item.source)}
              <span className="truncate max-w-[85px]">{item.website}</span>
            </span>

            {item.streamingProtocol && (
              <span className="bg-surface-hoverLight dark:bg-surface-hoverDark px-1.5 py-0.5 rounded border border-line-light dark:border-line-dark truncate max-w-[110px]">
                {item.streamingProtocol}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-1 items-center shrink-0">
          {/* Download Button (Primary Red) */}
          {item.downloadable ? (
            <button
              onClick={onDownload}
              title="Tải tệp âm thanh này về máy"
              className="w-7 h-7 rounded-lg bg-brand hover:bg-brand-dark text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              disabled
              title={item.downloadReason || 'Nguồn phát trực tuyến, không hỗ trợ tải trực tiếp'}
              className="w-7 h-7 rounded-lg bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary/40 flex items-center justify-center cursor-not-allowed border border-line-light dark:border-line-dark"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Rename Button (only for downloadable items) */}
          {item.downloadable && (
            <button
              onClick={onRename}
              title="Đổi tên file trước khi tải"
              className="w-7 h-7 rounded-lg text-content-secondary hover:text-content-light dark:hover:text-content-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark flex items-center justify-center transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          {/* Copy URL Button */}
          {item.mediaUrl && (
            <button
              onClick={handleCopyUrl}
              title={copied ? 'Đã sao chép liên kết!' : 'Sao chép đường dẫn nguồn'}
              className="w-7 h-7 rounded-lg text-content-secondary hover:text-content-light dark:hover:text-content-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark flex items-center justify-center transition-colors"
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
