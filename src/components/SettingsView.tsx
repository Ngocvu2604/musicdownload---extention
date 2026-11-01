import React, { useState } from 'react';
import { UserSettings } from '../types/audio';
import {
  Sliders,
  Folder,
  HardDrive,
  ShieldCheck,
  Check,
  RotateCcw,
  Sun,
  Moon,
  Palette,
  Music,
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

  const handleSubfolderBlur = () => {
    onUpdateSettings({ downloadSubfolder: subfolder.trim() });
    showSavedNotification();
  };

  const handleMinKBBlur = () => {
    onUpdateSettings({ minFileSizeKB: Number(minKB) || 0 });
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1400);
  };

  return (
    <div className="p-3.5 space-y-3 animate-fade-in text-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-content-light dark:text-content-dark flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-brand" />
          <span>Cấu hình tiện ích</span>
        </h2>
        {savedBadge && (
          <span className="text-[10px] text-brand flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Đã lưu!</span>
          </span>
        )}
      </div>

      {/* Theme Mode Selector (Dark / Light) */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-content-light dark:text-content-dark font-semibold">
            <Palette className="w-3.5 h-3.5 text-brand" />
            <span>Giao diện hiển thị</span>
          </div>
          <span className="text-[10px] text-content-secondary">
            {settings.theme === 'dark' ? 'Chế độ Tối (Dark)' : 'Chế độ Sáng (Light)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              onUpdateSettings({ theme: 'dark' });
              showSavedNotification();
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
              settings.theme === 'dark'
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark Mode</span>
          </button>

          <button
            onClick={() => {
              onUpdateSettings({ theme: 'light' });
              showSavedNotification();
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
              settings.theme === 'light'
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light Mode</span>
          </button>
        </div>
      </div>

      {/* Preferred Download Audio Format */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-content-light dark:text-content-dark font-semibold">
            <Music className="w-3.5 h-3.5 text-brand" />
            <span>Định dạng file nhạc tải về</span>
          </div>
          <span className="text-[10px] text-content-secondary font-mono font-bold uppercase text-brand">
            {settings.preferredFormat || 'mp3'}
          </span>
        </div>
        <p className="text-[10px] text-content-secondary">
          Tự động chuyển đổi các luồng phát trực tuyến (AAC/HLS) sang định dạng nhạc bạn mong muốn.
        </p>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            onClick={() => {
              onUpdateSettings({ preferredFormat: 'mp3' });
              showSavedNotification();
            }}
            className={`py-2 px-1 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center transition-colors ${
              (settings.preferredFormat || 'mp3') === 'mp3'
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
            }`}
          >
            <span>MP3</span>
            <span className="text-[9px] opacity-80 font-normal">Khuyên dùng</span>
          </button>

          <button
            onClick={() => {
              onUpdateSettings({ preferredFormat: 'm4a' });
              showSavedNotification();
            }}
            className={`py-2 px-1 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center transition-colors ${
              settings.preferredFormat === 'm4a'
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
            }`}
          >
            <span>M4A</span>
            <span className="text-[9px] opacity-80 font-normal">AAC gốc</span>
          </button>

          <button
            onClick={() => {
              onUpdateSettings({ preferredFormat: 'wav' });
              showSavedNotification();
            }}
            className={`py-2 px-1 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center transition-colors ${
              settings.preferredFormat === 'wav'
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-hoverLight dark:bg-surface-hoverDark text-content-secondary border-line-light dark:border-line-dark hover:text-content-light dark:hover:text-content-dark'
            }`}
          >
            <span>WAV</span>
            <span className="text-[9px] opacity-80 font-normal">Lossless</span>
          </button>
        </div>
      </div>

      {/* Auto Detection Toggle */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-content-light dark:text-content-dark">
            Tự động phát hiện (Auto Detection)
          </p>
          <p className="text-[10px] text-content-secondary mt-0.5">
            Tự động quét và lắng nghe âm thanh khi tải trang web.
          </p>
        </div>
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
          <div className="w-9 h-5 bg-surface-hoverLight dark:bg-surface-hoverDark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
        </label>
      </div>

      {/* Download Subfolder */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-content-light dark:text-content-dark font-semibold">
          <Folder className="w-3.5 h-3.5 text-brand" />
          <span>Thư mục lưu trữ</span>
        </div>
        <p className="text-[10px] text-content-secondary">
          Tạo thư mục con bên trong thư mục Downloads của trình duyệt.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-content-secondary font-mono">Downloads /</span>
          <input
            type="text"
            value={subfolder}
            onChange={(e) => setSubfolder(e.target.value)}
            onBlur={handleSubfolderBlur}
            placeholder="AudioFlow"
            className="flex-1 bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark focus:border-brand text-content-light dark:text-content-dark text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono"
          />
        </div>
      </div>

      {/* Minimum File Size filter */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded-lg p-3 space-y-1.5">
        <div className="flex items-center justify-between text-content-light dark:text-content-dark font-semibold">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-brand" />
            <span>Lọc kích thước tối thiểu</span>
          </div>
          <span className="text-xs font-mono text-brand font-bold">{minKB} KB</span>
        </div>
        <p className="text-[10px] text-content-secondary">
          Bỏ qua âm thanh click, tiếng chuông ngắn hoặc icon sound dưới ngưỡng này.
        </p>
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={minKB}
          onChange={(e) => setMinKB(Number(e.target.value))}
          onMouseUp={handleMinKBBlur}
          className="w-full h-1.5 bg-surface-hoverLight dark:bg-surface-hoverDark rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Prompt for filename toggle */}
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-content-light dark:text-content-dark">
            Hỏi vị trí & tên file khi tải
          </p>
          <p className="text-[10px] text-content-secondary mt-0.5">
            Hiển thị hộp thoại Save As của hệ điều hành cho mỗi lần tải.
          </p>
        </div>
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
          <div className="w-9 h-5 bg-surface-hoverLight dark:bg-surface-hoverDark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
        </label>
      </div>

      {/* Privacy Note */}
      <div className="bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-content-secondary">
        <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-content-light dark:text-content-dark">100% An toàn & Riêng tư:</strong> AudioFlow xử lý trực tiếp trên trình duyệt, không gửi URL hay thông tin cá nhân ra ngoài.
        </p>
      </div>

      {/* Reset & Clear Data */}
      <div className="pt-1">
        <button
          onClick={onClearStorage}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-brand/10 text-brand border border-brand/30 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Xóa dữ liệu bộ nhớ đệm tiện ích</span>
        </button>
      </div>
    </div>
  );
};
