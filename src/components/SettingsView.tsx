import React, { useState } from 'react';
import { UserSettings } from '../types/audio';
import {
  Sliders,
  Folder,
  HardDrive,
  Check,
  RotateCcw,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onClearStorage: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onClearStorage,
}) => {
  const [subfolder, setSubfolder] = useState(settings.downloadSubfolder);
  const [minKB, setMinKB] = useState(settings.minFileSizeKB);
  const [savedBadge, setSavedBadge] = useState(false);

  const showSavedNotification = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1400);
  };

  const handleSubfolderChange = (val: string) => {
    setSubfolder(val);
    onUpdateSettings({ downloadSubfolder: val.trim() });
    showSavedNotification();
  };

  const handleMinKBChange = (val: number) => {
    setMinKB(val);
    onUpdateSettings({ minFileSizeKB: val });
    showSavedNotification();
  };

  return (
    <div className="p-3.5 space-y-3 animate-fade-in text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-content-light dark:text-content-dark flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-brand" />
          <span>Cấu hình tiện ích</span>
        </h2>
        {savedBadge && (
          <span className="text-[10px] text-brand flex items-center gap-1 font-medium">
            <Check className="w-3 h-3" />
            <span>Đã lưu!</span>
          </span>
        )}
      </div>

      {/* Unified Settings List without multiple boxed frames */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded divide-y divide-line-light dark:divide-line-dark overflow-hidden">
        {/* Row 1: Theme Mode */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-content-light dark:text-content-dark font-medium">
            <Palette className="w-3.5 h-3.5 text-brand" />
            <span>Giao diện hiển thị</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onUpdateSettings({ theme: 'dark' });
                showSavedNotification();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${settings.theme === 'dark'
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
                }`}
            >
              <Moon className="w-3 h-3" />
              <span>Tối</span>
            </button>

            <button
              onClick={() => {
                onUpdateSettings({ theme: 'light' });
                showSavedNotification();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${settings.theme === 'light'
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
                }`}
            >
              <Sun className="w-3 h-3" />
              <span>Sáng</span>
            </button>
          </div>
        </div>

        {/* Row 2: Auto Detection */}
        <div className="p-3 flex items-center justify-between">
          <span className="font-medium text-content-light dark:text-content-dark">
            Tự động phát hiện (Auto Detection)
          </span>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.autoDetect}
              onChange={(e) => {
                onUpdateSettings({ autoDetect: e.target.checked });
                showSavedNotification();
              }}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-surface-hoverLight dark:bg-surface-hoverDark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand"></div>
          </label>
        </div>

        {/* Row 3: Download Subfolder */}
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-content-light dark:text-content-dark font-medium shrink-0">
            <Folder className="w-3.5 h-3.5 text-brand" />
            <span>Thư mục lưu</span>
          </div>
          <div className="flex items-center gap-1.5 max-w-[210px] w-full">
            <span className="text-[11px] text-content-secondary font-mono shrink-0">Downloads /</span>
            <input
              type="text"
              value={subfolder}
              onChange={(e) => handleSubfolderChange(e.target.value)}
              placeholder="music"
              className="w-full bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark focus:border-brand text-content-light dark:text-content-dark text-xs rounded px-2 py-1 outline-none font-mono"
            />
          </div>
        </div>

        {/* Row 4: Minimum File Size filter */}
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-content-light dark:text-content-dark font-medium shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-brand" />
            <span>Lọc kích thước tối thiểu</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={minKB}
              onChange={(e) => handleMinKBChange(Number(e.target.value))}
              className="w-24 h-1 bg-surface-hoverLight dark:bg-surface-hoverDark rounded appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono text-brand font-bold shrink-0 w-12 text-right">
              {minKB} KB
            </span>
          </div>
        </div>

        {/* Row 5: Prompt for filename toggle */}
        <div className="p-3 flex items-center justify-between">
          <span className="font-medium text-content-light dark:text-content-dark">
            Hỏi vị trí & tên khi tải
          </span>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.promptFilename}
              onChange={(e) => {
                onUpdateSettings({ promptFilename: e.target.checked });
                showSavedNotification();
              }}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-surface-hoverLight dark:bg-surface-hoverDark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand"></div>
          </label>
        </div>
      </div>

      {/* Reset & Clear Data */}
      <div className="pt-1">
        <button
          onClick={onClearStorage}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-surface-light dark:bg-surface-dark hover:bg-brand/10 text-brand border border-brand/30 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Xóa dữ liệu bộ nhớ đệm tiện ích</span>
        </button>
      </div>

      {/* Footer Credit */}
      <div className="pt-3 pb-1 text-center select-none">
        <span className="text-[11px] text-content-secondary font-mono">
          cre: <span className="text-brand font-semibold">ngocvu2604</span>
        </span>
      </div>
    </div>
  );
};
