import React from 'react';
import { ShieldCheck, Info, ExternalLink, PlaySquare } from 'lucide-react';

interface YouTubeNoticeProps {
  pageTitle?: string;
  hasOfficialSource?: boolean;
}

export const YouTubeNotice: React.FC<YouTubeNoticeProps> = ({
  pageTitle,
  hasOfficialSource,
}) => {
  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-brand/30 rounded-lg p-3 text-xs mb-2.5">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20">
          <PlaySquare className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-semibold text-xs text-content-light dark:text-content-dark">
              YouTube Detection
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-brand/10 text-brand rounded border border-brand/20">
              Chính sách & An toàn
            </span>
          </div>

          <p className="text-[11px] text-content-secondary leading-relaxed mb-2">
            AudioFlow tuân thủ chính sách bản quyền và điều khoản của Google & YouTube.
          </p>

          {hasOfficialSource ? (
            <div className="bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark rounded-md p-2 text-[11px] text-content-light dark:text-content-dark flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-brand" />
              <span>Phát hiện liên kết tải chính thức / podcast công khai được cấp phép!</span>
            </div>
          ) : (
            <div className="bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark rounded-md p-2 text-[11px] space-y-1 text-content-secondary">
              <div className="flex items-start gap-1 text-content-light dark:text-content-dark">
                <Info className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span className="font-medium text-xs">Phương thức tải chính thức:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[10px]">
                <li>Sử dụng tính năng Download chính thức của YouTube (YouTube Premium).</li>
                <li>Sử dụng các liên kết podcast / audio bản quyền công khai của tác giả.</li>
                <li>AudioFlow không phá mã mã hóa DRM hoặc trích xuất luồng stream trái phép.</li>
              </ul>
            </div>
          )}

          <div className="mt-2 pt-1.5 border-t border-line-light dark:border-line-dark flex items-center justify-between text-[10px] text-content-secondary">
            <span className="truncate max-w-[200px]">Video: {pageTitle || 'YouTube Media'}</span>
            <a
              href="https://support.google.com/youtube/answer/6141269"
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>Trợ giúp</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
