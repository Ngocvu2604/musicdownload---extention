import React from 'react';
import { RotateCw, Globe, Trash2 } from 'lucide-react';

interface HeaderProps {
  domain: string;
  count: number;
  isScanning: boolean;
  onScanAgain: () => void;
  onClear: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  domain,
  count,
  isScanning,
  onScanAgain,
  onClear,
  activeTab,
}) => {
  return (
    <header className="px-4 py-3 bg-[#101114]/90 backdrop-blur-md border-b border-[#2E303B] flex items-center justify-between select-none z-20">
      {/* Brand & Active Site */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] p-[1.5px] shadow-sm">
          <div className="w-full h-full bg-[#1A1B20] rounded-[7px] flex items-center justify-center gap-[2px]">
            <span className="w-[3px] h-3 bg-[#A78BFA] rounded-full animate-pulse"></span>
            <span className="w-[3px] h-[18px] bg-[#22D3EE] rounded-full"></span>
            <span className="w-[3px] h-2.5 bg-[#A78BFA] rounded-full animate-pulse"></span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white">AudioFlow</span>
            <span className="text-[10px] px-1.5 py-0.2 font-medium bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30 rounded">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF] truncate max-w-[170px]" title={domain}>
            <Globe className="w-3 h-3 text-[#22D3EE] shrink-0" />
            <span className="truncate">{domain || 'Đang chờ trang...'}</span>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {activeTab === 'home' && (
          <>
            {count > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40">
                {count} {count === 1 ? 'audio' : 'audios'}
              </span>
            )}

            {count > 0 && (
              <button
                onClick={onClear}
                title="Xóa danh sách trang này"
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-400 hover:bg-[#1A1B20] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onScanAgain}
              disabled={isScanning}
              title="Quét lại trang (Scan Again)"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#1A1B20] hover:bg-[#262830] text-white border border-[#2E303B] hover:border-[#A78BFA]/50 transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#22D3EE] ${isScanning ? 'animate-spin' : ''}`} />
              <span>Quét</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
