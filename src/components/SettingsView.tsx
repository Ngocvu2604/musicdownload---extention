import React, { useState } from 'react';
import { UserSettings } from '../types/audio';
import {
  Sliders,
  Folder,
  Bell,
  HardDrive,
  FileText,
  ShieldCheck,
  Check,
  RotateCcw,
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
    setTimeout(() => setSavedBadge(false), 1500);
  };

  return (
    <div className="p-3.5 space-y-3.5 animate-fade-in text-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-[#A78BFA]" />
          <span>Cấu hình tiện ích</span>
        </h2>
        {savedBadge && (
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-fade-in">
            <Check className="w-3 h-3" />
            <span>Đã lưu!</span>
          </span>
        )}
      </div>

      {/* Auto Detection Toggle */}
      <div className="bg-[#1A1B20] border border-[#2E303B] rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">Tự động phát hiện (Auto Detection)</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
            Tự động quét và lắng nghe âm thanh khi tải trang web.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoDetect}
            onChange={(e) => {
              onUpdateSettings({ autoDetect: e.target.checked });
              showSavedNotification();
            }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[#2E303B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#A78BFA]"></div>
        </label>
      </div>

      {/* Download Subfolder */}
      <div className="bg-[#1A1B20] border border-[#2E303B] rounded-xl p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-white font-semibold">
          <Folder className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>Thư mục lưu trữ</span>
        </div>
        <p className="text-[10px] text-[#9CA3AF]">
          Tạo thư mục con bên trong thư mục Downloads của trình duyệt.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-[#9CA3AF] font-mono">Downloads /</span>
          <input
            type="text"
            value={subfolder}
            onChange={(e) => setSubfolder(e.target.value)}
            onBlur={handleSubfolderBlur}
            placeholder="AudioFlow"
            className="flex-1 bg-[#101114] border border-[#2E303B] focus:border-[#A78BFA] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono"
          />
        </div>
      </div>

      {/* Minimum File Size filter */}
      <div className="bg-[#1A1B20] border border-[#2E303B] rounded-xl p-3 space-y-1.5">
        <div className="flex items-center justify-between text-white font-semibold">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lọc kích thước tối thiểu</span>
          </div>
          <span className="text-xs font-mono text-[#A78BFA]">{minKB} KB</span>
        </div>
        <p className="text-[10px] text-[#9CA3AF]">
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
          className="w-full h-1.5 bg-[#101114] rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Prompt for filename toggle */}
      <div className="bg-[#1A1B20] border border-[#2E303B] rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">Hỏi vị trí & tên file khi tải</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
            Hiển thị hộp thoại Save As của hệ điều hành cho mỗi lần tải.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.promptFilename}
            onChange={(e) => {
              onUpdateSettings({ promptFilename: e.target.checked });
              showSavedNotification();
            }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[#2E303B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#A78BFA]"></div>
        </label>
      </div>

      {/* Audio Download Notification */}
      <div className="bg-[#1A1B20] border border-[#2E303B] rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">Thông báo khi tải hoàn tất</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
            Báo âm thanh hoặc thông báo badge khi file tải xong.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.audioNotification}
            onChange={(e) => {
              onUpdateSettings({ audioNotification: e.target.checked });
              showSavedNotification();
            }}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[#2E303B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#A78BFA]"></div>
        </label>
      </div>

      {/* Security & Privacy Note */}
      <div className="bg-[#101114] border border-[#2E303B] rounded-xl p-2.5 flex items-start gap-2 text-[10px] text-[#9CA3AF]">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>100% Riêng tư:</strong> AudioFlow xử lý trực tiếp trên trình duyệt máy bạn, không gửi URL hay thông tin cá nhân về máy chủ bên ngoài.
        </p>
      </div>

      {/* Reset & Clear Data */}
      <div className="pt-1">
        <button
          onClick={onClearStorage}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Xóa dữ liệu bộ nhớ đệm tiện ích</span>
        </button>
      </div>
    </div>
  );
};

