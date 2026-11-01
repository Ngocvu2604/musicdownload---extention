import React from 'react';
import { Music, ArrowDownToLine, FolderHeart, RotateCw } from 'lucide-react';

interface EmptyStateProps {
  type: 'home' | 'downloads' | 'library';
  onScan?: () => void;
  domain?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onScan, domain }) => {
  if (type === 'home') {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark flex items-center justify-center mb-3">
          <Music className="w-6 h-6 text-brand" />
        </div>

        <h3 className="text-xs font-semibold text-content-light dark:text-content-dark mb-1">
          Chưa phát hiện media đang phát
        </h3>

        <p className="text-[11px] text-content-secondary max-w-[260px] leading-relaxed mb-4">
          Hãy nhấn <strong>Play (▶)</strong> bài hát hoặc video trên <strong>{domain || 'trang web'}</strong>, AudioFlow sẽ tự động bắt luồng.
        </p>

        {onScan && (
          <button
            onClick={onScan}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-semibold transition-colors active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Quét lại tab hiện tại</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'downloads') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center select-none animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark flex items-center justify-center mb-3">
          <ArrowDownToLine className="w-6 h-6 text-content-secondary" />
        </div>
        <h3 className="text-xs font-semibold text-content-light dark:text-content-dark mb-1">
          Không có tệp đang tải
        </h3>
        <p className="text-[11px] text-content-secondary max-w-[240px] leading-relaxed">
          Nhấn nút tải tại bất kỳ audio nào có file trực tiếp để bắt đầu tải xuống.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center select-none animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark flex items-center justify-center mb-3">
        <FolderHeart className="w-6 h-6 text-content-secondary" />
      </div>
      <h3 className="text-xs font-semibold text-content-light dark:text-content-dark mb-1">
        Thư viện trống
      </h3>
      <p className="text-[11px] text-content-secondary max-w-[240px] leading-relaxed">
        Các file bạn tải về hoặc thêm vào yêu thích sẽ được lưu trữ tại đây.
      </p>
    </div>
  );
};
