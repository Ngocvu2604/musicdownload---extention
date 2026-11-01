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
    <div className="bg-gradient-to-br from-[#1A1B20] to-[#16171C] border border-rose-500/30 rounded-xl p-3.5 mb-3 shadow-lg relative overflow-hidden">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-start gap-2.5 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
          <PlaySquare className="w-[18px] h-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-semibold text-xs text-white">YouTube Detection Mode</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
              Chính sách & An toàn
            </span>
          </div>

          <p className="text-[11px] text-[#9CA3AF] leading-relaxed mb-2">
            AudioFlow tuân thủ nghiêm ngặt chính sách bảo vệ bản quyền của Google & YouTube.
          </p>

          {hasOfficialSource ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-[11px] text-emerald-300 flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Phát hiện liên kết tải chính thức / podcast công khai được cấp phép!</span>
            </div>
          ) : (
            <div className="bg-[#101114] border border-[#2E303B] rounded-lg p-2.5 text-[11px] space-y-1.5 text-[#9CA3AF]">
              <div className="flex items-start gap-1.5 text-white">
                <Info className="w-3.5 h-3.5 text-[#22D3EE] shrink-0 mt-0.5" />
                <span className="font-medium text-xs">Phương thức tải chính thức:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[10px]">
                <li>Sử dụng tính năng <strong>Download chính thức</strong> của YouTube (YouTube Premium).</li>
                <li>Sử dụng các liên kết podcast / audio bản quyền công khai trong phần mô tả của tác giả.</li>
                <li>AudioFlow không phá mã DRM hoặc trích xuất luồng stream trái phép.</li>
              </ul>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-[#2E303B] flex items-center justify-between text-[10px] text-[#9CA3AF]">
            <span>Đang xem: {pageTitle || 'YouTube Media'}</span>
            <a
              href="https://support.google.com/youtube/answer/6141269"
              target="_blank"
              rel="noreferrer"
              className="text-[#22D3EE] hover:underline flex items-center gap-0.5"
            >
              <span>Xem hướng dẫn tải</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
