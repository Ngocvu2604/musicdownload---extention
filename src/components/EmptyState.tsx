import React from 'react';
import { Music, ArrowDownToLine, FolderHeart, RotateCw } from 'lucide-react';

interface EmptyStateProps {
  type: 'home' | 'downloads' | 'library';
  onScan?: () => void;
  domain?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onScan, domain }) => {
  if (type === 'home') {
    const isSpecial =
      !domain ||
      domain === 'newtab' ||
      domain.includes('newtab') ||
      domain.includes('extensions') ||
      domain.includes('chrome://') ||
      domain.includes('brave://');

    return (
      <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
        {/* Minimal Music Icon */}
        <div className="w-12 h-12 rounded bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark flex items-center justify-center mb-3 shadow-sm">
          <Music className="w-6 h-6 text-brand" />
        </div>

        {/* Clean Centered Title */}
        <h3 className="text-sm font-bold text-content-light dark:text-content-dark mb-1.5">
          Chưa phát hiện âm thanh
        </h3>

        {/* Informative Natural Description */}
        <p className="text-xs text-content-secondary max-w-[260px] leading-relaxed mb-5">
          {isSpecial
            ? 'Hãy mở một trang web và phát nhạc hoặc video, AudioFlow sẽ tự động bắt luồng âm thanh.'
            : 'Hãy phát bài hát hoặc video trên trang web này để tiện ích tự động bắt luồng tải về.'}
        </p>

        {/* Centered Scan Action Button */}
        {onScan && (
          <button
            onClick={onScan}
            className="flex items-center gap-2 px-4 py-2 rounded bg-brand hover:bg-brand-dark text-white text-xs font-semibold transition-colors shadow-sm active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Quét lại trang</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'downloads') {
    return (
      <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
        <div className="w-12 h-12 rounded bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark flex items-center justify-center mb-3">
          <ArrowDownToLine className="w-6 h-6 text-content-secondary" />
        </div>
        <h3 className="text-sm font-bold text-content-light dark:text-content-dark mb-1.5">
          Không có tệp đang tải
        </h3>
        <p className="text-xs text-content-secondary max-w-[240px] leading-relaxed">
          Nhấn nút tải tại tab Phát hiện hoặc Tải link để bắt đầu tải xuống.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
      <div className="w-12 h-12 rounded bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark flex items-center justify-center mb-3">
        <FolderHeart className="w-6 h-6 text-content-secondary" />
      </div>
      <h3 className="text-sm font-bold text-content-light dark:text-content-dark mb-1.5">
        Thư viện trống
      </h3>
      <p className="text-xs text-content-secondary max-w-[240px] leading-relaxed">
        Các bài hát bạn đã tải về hoặc đánh dấu yêu thích sẽ xuất hiện tại đây.
      </p>
    </div>
  );
};
