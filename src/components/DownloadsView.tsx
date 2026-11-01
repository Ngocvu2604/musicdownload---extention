import React from 'react';
import { DownloadItem } from '../types/audio';
import { formatBytes } from '../utils/formatters';
import {
  FolderOpen,
  Pause,
  Play,
  X,
  FileAudio,
  RotateCcw,
  Trash2,
  ExternalLink,
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
  onClearFinished?: () => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  downloads,
  onPause,
  onResume,
  onCancel,
  onShowItem,
  onOpenFolder,
  onRetry,
  onClearFinished,
}) => {
  if (downloads.length === 0) {
    return <EmptyState type="downloads" />;
  }

  const hasFinished = downloads.some((d) => d.state !== 'in_progress');

  return (
    <div className="p-3.5 space-y-2.5 animate-fade-in max-w-full overflow-hidden">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-content-light dark:text-content-dark">
          Tệp tải về ({downloads.length})
        </span>

        <div className="flex items-center gap-1.5">
          {hasFinished && onClearFinished && (
            <button
              onClick={onClearFinished}
              title="Xóa các tệp đã tải xong hoặc đã hủy khỏi danh sách"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded text-content-secondary hover:text-brand hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Dọn dẹp</span>
            </button>
          )}

          <button
            onClick={onOpenFolder}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-surface-light dark:bg-surface-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark text-content-light dark:text-content-dark border border-line-light dark:border-line-dark transition-colors"
          >
            <FolderOpen className="w-3 h-3 text-brand" />
            <span>Mở thư mục</span>
          </button>
        </div>
      </div>

      {/* Unified Downloads List (Single Container - No separate heavy boxes) */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded divide-y divide-line-light dark:divide-line-dark overflow-hidden">
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
              className="relative p-2.5 hover:bg-surface-hoverLight/40 dark:hover:bg-surface-hoverDark/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                {/* Left: Icon & File Info */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileAudio className="w-4 h-4 text-brand shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-medium text-content-light dark:text-content-dark truncate"
                      title={item.filename}
                    >
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-content-secondary truncate">
                      <span>{formatBytes(item.bytesReceived || item.totalBytes)}</span>
                      {isComplete && (
                        <span className="text-emerald-500 font-medium">• Hoàn thành</span>
                      )}
                      {isInterrupted && (
                        <span className="text-brand font-medium">
                          • {item.error === 'USER_CANCELED' ? 'Đã hủy' : 'Thất bại'}
                        </span>
                      )}
                      {isInProgress && (
                        <span className="text-brand font-medium">
                          • {percent}% {item.speedFormatted && `(${item.speedFormatted})`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isComplete && (
                    <button
                      onClick={() => onShowItem(item.downloadId)}
                      title="Mở tệp trong thư mục"
                      className="flex items-center gap-1 text-[10px] font-medium text-content-secondary hover:text-brand px-1.5 py-0.5 rounded transition-colors"
                    >
                      <span>Xem tệp</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}

                  {isInProgress && (
                    <>
                      {item.paused ? (
                        <button
                          onClick={() => onResume(item.downloadId)}
                          title="Tiếp tục tải"
                          className="p-1 rounded text-content-light dark:text-content-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onPause(item.downloadId)}
                          title="Tạm dừng"
                          className="p-1 rounded text-content-secondary hover:text-content-light dark:hover:text-content-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                        >
                          <Pause className="w-3 h-3 fill-current" />
                        </button>
                      )}

                      <button
                        onClick={() => onCancel(item.downloadId)}
                        title="Hủy tải xuống"
                        className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}

                  {isInterrupted && onRetry && (
                    <button
                      onClick={() => onRetry(item.downloadId)}
                      title="Thử tải lại"
                      className="flex items-center gap-1 text-[10px] font-medium text-brand hover:bg-brand hover:text-white px-2 py-0.5 rounded border border-brand/30 transition-colors"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Thử lại</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress line directly under active row */}
              {isInProgress && (
                <div className="w-full bg-line-light dark:bg-line-dark h-1 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.paused ? 'bg-content-secondary' : 'bg-brand'
                    }`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
