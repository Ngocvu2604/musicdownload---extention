import React from 'react';
import { TabType } from '../types/audio';
import { Radio, ArrowDownToLine, FolderHeart, SlidersHorizontal } from 'lucide-react';

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
      id: 'downloads' as TabType,
      label: 'Đang tải',
      icon: ArrowDownToLine,
      badge: activeDownloadsCount > 0 ? activeDownloadsCount : null,
      pulseBadge: activeDownloadsCount > 0,
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
    <nav className="h-14 bg-[#101114]/95 backdrop-blur-md border-t border-[#2E303B] px-3 flex items-center justify-around z-20 shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all duration-200 group ${
              isActive
                ? 'text-[#A78BFA]'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1A1B20]/60'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-[18px] h-[18px] transition-transform duration-200 ${
                  isActive ? 'scale-110 text-[#A78BFA]' : 'group-hover:scale-105'
                }`}
              />
              {tab.badge !== null && (
                <span
                  className={`absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full ${
                    tab.pulseBadge
                      ? 'bg-[#22D3EE] text-black animate-pulse'
                      : 'bg-[#7C3AED] text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium transition-colors ${
                isActive ? 'text-white font-semibold' : 'text-[#9CA3AF]'
              }`}
            >
              {tab.label}
            </span>

            {/* Active underline indicator */}
            {isActive && (
              <span className="absolute bottom-0 w-6 h-[2px] bg-[#A78BFA] rounded-full shadow-[0_0_8px_#A78BFA]"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
