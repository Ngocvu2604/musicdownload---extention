import React, { useState } from 'react';
import { ShieldCheck, X, ChevronDown, ChevronUp } from 'lucide-react';

interface YouTubeNoticeProps {
  pageTitle?: string;
  hasOfficialSource?: boolean;
}

export const YouTubeNotice: React.FC<YouTubeNoticeProps> = ({ pageTitle }) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded px-2.5 py-1.5 text-xs mb-2 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-brand shrink-0" />
          <span className="text-[11px] text-content-secondary truncate">
            YouTube: Luồng phát tuân thủ chính sách bản quyền
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-0.5 text-[10px] text-brand hover:underline font-medium"
          >
            <span>{expanded ? 'Thu gọn' : 'Chi tiết'}</span>
            {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            title="Đóng thông báo"
            className="text-content-secondary hover:text-content-light dark:hover:text-content-dark p-0.5 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-1.5 pt-1.5 border-t border-line-light dark:border-line-dark text-[10px] text-content-secondary space-y-1 animate-fade-in">
          <p>• AudioFlow không bẻ khóa mã hóa DRM hoặc trích xuất luồng stream trái phép.</p>
          <p>• Để tải ngoại tuyến, vui lòng sử dụng tính năng tải chính thức (YouTube Premium) hoặc link công khai của tác giả.</p>
          {pageTitle && (
            <p className="truncate font-medium text-content-light dark:text-content-dark">
              • Đang xem: {pageTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
