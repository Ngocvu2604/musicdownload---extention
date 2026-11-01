import React from 'react';
import { RotateCw, Globe, Trash2, Sun, Moon, Volume2 } from 'lucide-react';

interface HeaderProps {
  domain: string;
  count: number;
  isScanning: boolean;
  onScanAgain: () => void;
  onClear: () => void;
  activeTab: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  domain,
  count,
  isScanning,
  onScanAgain,
  onClear,
  activeTab,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-line-light dark:border-line-dark flex items-center justify-between select-none z-20 shrink-0">
      {/* Brand & Active Site */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Red Minimalist Logo Icon */}
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <Volume2 className="w-4 h-4 text-white" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-content-light dark:text-content-dark">
              AudioFlow
            </span>
            <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light">
              v2.0
            </span>
          </div>

          <div
            className="flex items-center gap-1 text-[11px] text-content-secondary truncate max-w-[150px]"
            title={domain}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{domain || 'Đang chờ trang...'}</span>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Quick Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          className="p-1.5 rounded-lg text-content-secondary hover:text-content-light dark:hover:text-content-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-content-secondary" />
          )}
        </button>

        {activeTab === 'home' && (
          <>
            {count > 0 && (
              <button
                onClick={onClear}
                title="Xóa danh sách media trên trang này"
                className="p-1.5 rounded-lg text-content-secondary hover:text-brand hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onScanAgain}
              disabled={isScanning}
              title="Quét lại tab hiện tại"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark text-content-light dark:text-content-dark border border-line-light dark:border-line-dark transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 text-brand ${isScanning ? 'animate-spin' : ''}`} />
              <span>Quét</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
