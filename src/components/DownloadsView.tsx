import React from 'react';
import { DownloadItem } from '../types/audio';
import { formatBytes } from '../utils/formatters';
import {
  FolderOpen,
  Pause,
  Play,
  X,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { EmptyState } from './EmptyState';

interface DownloadsViewProps {
  downloads: DownloadItem[];
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onCancel: (id: number) => void;
  onShowItem: (id: number) => void;
  onOpenFolder: () => void;
  onRetry?: (id: number) => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  downloads,
  onPause,
  onResume,
  onCancel,
  onShowItem,
  onOpenFolder,
  onRetry,
}) => {
  if (downloads.length === 0) {
    return <EmptyState type="downloads" />;
  }

  return (
    <div className="p-3.5 space-y-3 animate-fade-in">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">
          Tệp tải về ({downloads.length})
        </span>

        <button
          onClick={onOpenFolder}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#1A1B20] hover:bg-[#262830] text-[#22D3EE] border border-[#2E303B] transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Mở thư mục</span>
        </button>
      </div>

      {/* Downloads list */}
      <div className="space-y-2">
        {downloads.map((item) => {
          const isComplete = item.state === 'complete';
          const isInterrupted = item.state === 'interrupted';
          const isInProgress = item.state === 'in_progress';

          const percent =
            item.totalBytes > 0
              ? Math.min(100, Math.round((item.bytesReceived / item.totalBytes) * 100))
              : isComplete
              ? 100
              : 0;

          return (
            <div
              key={item.downloadId}
              className="bg-[#1A1B20] border border-[#2E303B] rounded-xl p-3 transition-all hover:border-[#3E4250]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#2E303B] flex items-center justify-center shrink-0">
                    <FileAudio className="w-4 h-4 text-[#A78BFA]" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-xs font-semibold text-white truncate max-w-[190px]"
                      title={item.filename}
                    >
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                      <span>
                        {formatBytes(item.bytesReceived)}
                        {item.totalBytes > 0 && ` / ${formatBytes(item.totalBytes)}`}
                      </span>

                      {/* Realtime Download Speed */}
                      {isInProgress && item.speedFormatted && !item.paused && (
                        <span className="flex items-center gap-0.5 text-[#22D3EE] font-mono">
                          <Zap className="w-2.5 h-2.5" />
                          {item.speedFormatted}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status or Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isComplete && (
                    <button
                      onClick={() => onShowItem(item.downloadId)}
                      title="Mở tệp trong thư mục"
                      className="flex items-center gap-1 text-[11px] text-[#22D3EE] hover:underline px-2 py-0.5 rounded bg-[#22D3EE]/10 border border-[#22D3EE]/20 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Xem tệp</span>
                    </button>
                  )}

                  {isInProgress && (
                    <>
                      {item.paused ? (
                        <button
                          onClick={() => onResume(item.downloadId)}
                          title="Tiếp tục tải"
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-[#2E303B] transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onPause(item.downloadId)}
                          title="Tạm dừng"
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-[#2E303B] transition-colors"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}

                      <button
                        onClick={() => onCancel(item.downloadId)}
                        title="Hủy tải xuống"
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-[#2E303B] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {isInterrupted && (
                    <div className="flex items-center gap-1.5">
                      {onRetry && (
                        <button
                          onClick={() => onRetry(item.downloadId)}
                          title="Thử tải lại"
                          className="flex items-center gap-1 text-[11px] font-medium text-amber-300 hover:text-white px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Thử lại</span>
                        </button>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                        <AlertCircle className="w-3 h-3" />
                        <span>Thất bại</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isInProgress && (
                <div className="space-y-1">
                  <div className="w-full bg-[#101114] h-1.5 rounded-full overflow-hidden border border-[#2E303B]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        item.paused
                          ? 'bg-amber-400'
                          : 'bg-gradient-to-r from-[#7C3AED] to-[#22D3EE]'
                      }`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-[#6B7280]">
                    <span>{item.paused ? 'Đã tạm dừng' : 'Đang tải...'}</span>
                    <span>{percent}%</span>
                  </div>
                </div>
              )}

              {/* Error message detail if failed */}
              {isInterrupted && item.error && (
                <p className="mt-1.5 text-[10px] text-rose-400/90 bg-rose-950/20 border border-rose-900/30 rounded p-1 truncate">
                  Lý do: {item.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
