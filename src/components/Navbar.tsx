import React from 'react';
import { TabType } from '../types/audio';
import { Radio, Link2, ArrowDownToLine, FolderHeart, SlidersHorizontal } from 'lucide-react';

interface NavbarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  detectedCount: number;
  activeDownloadsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  detectedCount,
  activeDownloadsCount,
}) => {
  const tabs = [
    {
      id: 'home' as TabType,
      label: 'Phát hiện',
      icon: Radio,
      badge: detectedCount > 0 ? detectedCount : null,
    },
    {
      id: 'link' as TabType,
      label: 'Tải link',
      icon: Link2,
      badge: null,
    },
    {
      id: 'downloads' as TabType,
      label: 'Tải về',
      icon: ArrowDownToLine,
      badge: activeDownloadsCount > 0 ? activeDownloadsCount : null,
    },
    {
      id: 'library' as TabType,
      label: 'Thư viện',
      icon: FolderHeart,
      badge: null,
    },
    {
      id: 'settings' as TabType,
      label: 'Cài đặt',
      icon: SlidersHorizontal,
      badge: null,
    },
  ];

  return (
    <nav className="h-13 bg-bg-light dark:bg-bg-dark border-t border-line-light dark:border-line-dark px-2 flex items-center justify-around select-none z-20 shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`relative flex-1 flex flex-col items-center justify-center py-1.5 transition-colors group ${
              isActive
                ? 'text-brand font-semibold'
                : 'text-content-secondary hover:text-content-light dark:hover:text-content-dark'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-4 h-4 transition-transform ${
                  isActive ? 'scale-105 text-brand' : ''
                }`}
              />
              {tab.badge !== null && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-brand text-white">
                  {tab.badge}
                </span>
              )}
            </div>

            <span className="text-[10px] mt-1 tracking-tight">
              {tab.label}
            </span>

            {/* Flat Red Active Indicator */}
            {isActive && (
              <span className="absolute top-0 w-8 h-[2px] bg-brand rounded-full"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
