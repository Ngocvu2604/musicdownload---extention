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
  Disc3,
  Globe,
  Radio,
  FileAudio,
  RadioTower,
  Info,
  ListMusic,
  Layers,
  User,
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
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  };

  // Playback Status Badge
  const getPlaybackStatusBadge = (status: MediaPlaybackStatus) => {
    switch (status) {
      case 'PLAYING':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#22D3EE] border border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.3)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-ping"></span>
            <span>ĐANG PHÁT</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            TẠM DỪNG
          </span>
        );
      case 'BUFFERING':
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            BUFFERING...
          </span>
        );
      case 'ENDED':
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
            KẾT THÚC
          </span>
        );
      default:
        return null;
    }
  };

  // Source Type Badge
  const getSourceTypeBadge = (sourceType: MediaSourceType) => {
    switch (sourceType) {
      case 'DIRECT_FILE':
      case 'DIRECT':
        return (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            DIRECT FILE
          </span>
        );
      case 'STREAMING_MEDIA':
      case 'STREAMING':
        return (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
            STREAMING
          </span>
        );
      case 'BLOB_MEDIA':
      case 'BLOB':
        return (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            BLOB STREAM
          </span>
        );
      case 'PLAYLIST':
        return (
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <ListMusic className="w-2.5 h-2.5" />
            <span>PLAYLIST</span>
          </span>
        );
      case 'MEDIA_SEGMENT':
        return (
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
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
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            TẢI ĐƯỢC
          </span>
        );
      case 'STREAMING_ONLY':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
            STREAM ONLY
          </span>
        );
      case 'NOT_AVAILABLE':
        return (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">
            CHỈ PHÁT
          </span>
        );
      default:
        return null;
    }
  };

  const getFormatBadge = (fmt: AudioFormat) => {
    switch (fmt) {
      case 'flac':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'wav':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'm4a':
      case 'aac':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'ogg':
      case 'opus':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'mp4':
      case 'webm':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'hls':
      case 'dash':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mp3':
      default:
        return 'bg-[#7C3AED]/20 text-[#A78BFA] border-[#7C3AED]/30';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube-source':
        return <RadioTower className="w-3 h-3 text-rose-400" />;
      case 'soundcloud-source':
        return <Disc3 className="w-3 h-3 text-amber-400" />;
      case 'network-request':
        return <Radio className="w-3 h-3 text-[#22D3EE]" />;
      case 'dom-link':
      case 'performance-resource':
        return <Globe className="w-3 h-3 text-emerald-400" />;
      default:
        return <FileAudio className="w-3 h-3 text-[#A78BFA]" />;
    }
  };

  const canPreviewDirectly = Boolean(
    item.mediaUrl && item.mediaUrl.startsWith('http') && item.downloadable
  );

  return (
    <div
      className={`group relative bg-[#1A1B20] hover:bg-[#202229] border rounded-xl p-3 transition-all duration-200 ${
        item.status === 'PLAYING'
          ? 'border-cyan-500/40 shadow-[0_0_14px_rgba(34,211,238,0.12)]'
          : isSelected
          ? 'border-[#A78BFA] shadow-[0_0_12px_rgba(167,139,250,0.15)]'
          : 'border-[#2E303B] hover:border-[#3F4250]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Selection Checkbox */}
        <div className="pt-1">
          {item.downloadable ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-3.5 h-3.5 rounded border-[#3F4250] text-[#A78BFA] focus:ring-0 focus:ring-offset-0 bg-[#101114] cursor-pointer"
            />
          ) : (
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3F4250]"></span>
            </div>
          )}
        </div>

        {/* Play Preview Circle or Animated Disc */}
        <div className="shrink-0">
          {canPreviewDirectly ? (
            <button
              onClick={onPlayPreviewToggle}
              title={isPlayingPreview ? 'Dừng nghe thử' : 'Nghe thử trực tiếp'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isPlayingPreview
                  ? 'bg-[#22D3EE] text-black shadow-[0_0_12px_#22D3EE]'
                  : 'bg-[#2E303B] text-white hover:bg-[#7C3AED]'
              }`}
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          ) : (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                item.status === 'PLAYING'
                  ? 'bg-cyan-500/20 text-[#22D3EE] border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'bg-[#2E303B] text-[#9CA3AF]'
              }`}
              title={`Trạng thái: ${item.status}`}
            >
              {item.status === 'PLAYING' ? (
                <Disc3 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <FileAudio className="w-4 h-4" />
              )}
            </div>
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
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getFormatBadge(
                  item.format
                )}`}
              >
                {item.format}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-xs font-semibold text-white truncate max-w-[210px] mb-0.5"
            title={item.title}
          >
            {item.title}
          </h3>

          {/* Artist / Channel (if present) */}
          {item.artist && (
            <div className="flex items-center gap-1 text-[11px] text-[#A78BFA] font-medium truncate mb-1">
              <User className="w-3 h-3 shrink-0 opacity-80" />
              <span className="truncate">{item.artist}</span>
            </div>
          )}

          {/* Status Note / Reason */}
          {!item.downloadable ? (
            <p className="text-[10px] text-amber-300/90 leading-tight mb-2 flex items-center gap-1 bg-amber-500/10 p-1 rounded border border-amber-500/20">
              <Info className="w-3 h-3 shrink-0 text-amber-400" />
              <span className="truncate">{item.downloadReason}</span>
            </p>
          ) : (
            <p
              className="text-[11px] text-[#9CA3AF] truncate mb-2 font-mono"
              title={item.filename}
            >
              {item.filename}
            </p>
          )}

          {/* Metadata Chips: Time, Size, Website, Protocol */}
          <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-[#9CA3AF]">
            {item.duration && (
              <span className="flex items-center gap-1 bg-[#101114] px-1.5 py-0.5 rounded border border-[#2E303B]">
                {formatDuration(item.currentTime)} / {formatDuration(item.duration)}
              </span>
            )}

            {item.size && (
              <span className="bg-[#101114] px-1.5 py-0.5 rounded border border-[#2E303B]">
                {formatBytes(item.size)}
              </span>
            )}

            <span className="flex items-center gap-1 bg-[#101114] px-1.5 py-0.5 rounded border border-[#2E303B]">
              {getSourceIcon(item.source)}
              <span className="truncate max-w-[85px]">{item.website}</span>
            </span>

            {item.streamingProtocol && (
              <span className="bg-[#101114] text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30 truncate max-w-[120px]">
                {item.streamingProtocol}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-1 items-center shrink-0">
          {/* Download Button */}
          {item.downloadable ? (
            <button
              onClick={onDownload}
              title="Tải tệp âm thanh này về máy"
              className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] hover:opacity-95 text-white flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled
              title={item.downloadReason || 'Nguồn phát trực tuyến, không hỗ trợ tải trực tiếp'}
              className="w-8 h-8 rounded-lg bg-[#2E303B]/60 text-[#6B7280] flex items-center justify-center cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Rename Button (only for downloadable items) */}
          {item.downloadable && (
            <button
              onClick={onRename}
              title="Đổi tên file trước khi tải"
              className="w-7 h-7 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#2E303B] flex items-center justify-center transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          {/* Copy URL Button */}
          {item.mediaUrl && (
            <button
              onClick={handleCopyUrl}
              title={copied ? 'Đã sao chép liên kết!' : 'Sao chép đường dẫn nguồn'}
              className="w-7 h-7 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#2E303B] flex items-center justify-center transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
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
