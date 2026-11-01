import React from 'react';
import { Music, ArrowDownToLine, FolderHeart, RotateCw, Radio } from 'lucide-react';

interface EmptyStateProps {
  type: 'home' | 'downloads' | 'library';
  onScan?: () => void;
  domain?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onScan, domain }) => {
  if (type === 'home') {
    return (
      <div className="flex flex-col items-center justify-center py-9 px-6 text-center select-none animate-fade-in">
        <div className="relative w-14 h-14 rounded-2xl bg-[#1A1B20] border border-[#2E303B] flex items-center justify-center mb-3 shadow-inner">
          <Music className="w-7 h-7 text-[#A78BFA] opacity-80" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#22D3EE] rounded-full animate-ping"></span>
        </div>

        <h3 className="text-sm font-semibold text-white mb-1.5">
          Chưa phát hiện media đang phát
        </h3>

        <p className="text-xs text-[#9CA3AF] max-w-[270px] leading-relaxed mb-4">
          Hãy nhấn <strong>Play (▶)</strong> bài hát hoặc video trên <strong>{domain || 'trang web'}</strong>, sau đó AudioFlow sẽ tự động bắt luồng.
        </p>

        {onScan && (
          <button
            onClick={onScan}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED]/20 to-[#22D3EE]/20 hover:from-[#7C3AED]/30 hover:to-[#22D3EE]/30 border border-[#A78BFA]/40 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Quét lại tab hiện tại</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'downloads') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center select-none animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-[#1A1B20] border border-[#2E303B] flex items-center justify-center mb-3 shadow-inner">
          <ArrowDownToLine className="w-7 h-7 text-[#22D3EE] opacity-80" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">
          Không có tệp đang tải
        </h3>
        <p className="text-xs text-[#9CA3AF] max-w-[260px] leading-relaxed">
          Bấm nút tải tại bất kỳ audio nào có file trực tiếp để bắt đầu tải xuống.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center select-none animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-[#1A1B20] border border-[#2E303B] flex items-center justify-center mb-3 shadow-inner">
        <FolderHeart className="w-7 h-7 text-[#A78BFA] opacity-80" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">
        Thư viện trống
      </h3>
      <p className="text-xs text-[#9CA3AF] max-w-[260px] leading-relaxed">
        Các file âm thanh bạn tải về sẽ được lưu trữ lịch sử và quản lý tiện lợi tại đây.
      </p>
    </div>
  );
};
