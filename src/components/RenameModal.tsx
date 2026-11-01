import React, { useState } from 'react';
import { X, Download, Tag } from 'lucide-react';
import { cleanFilename, getExtensionFromUrl } from '../utils/formatters';

interface RenameModalProps {
  initialFilename: string;
  url: string;
  onConfirm: (newFilename: string) => void;
  onClose: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  initialFilename,
  url,
  onConfirm,
  onClose,
}) => {
  const ext = getExtensionFromUrl(initialFilename) || getExtensionFromUrl(url) || 'mp3';
  const baseName = initialFilename.replace(/\.[a-zA-Z0-9]{2,5}$/, '');
  const [name, setName] = useState(baseName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalFilename = cleanFilename(`${name.trim()}.${ext}`);
    onConfirm(finalFilename);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1A1B20] border border-[#2E303B] rounded-2xl w-full max-w-[340px] p-4.5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#A78BFA]" />
            <h3 className="font-semibold text-sm text-white">Đổi tên tệp âm thanh</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs text-[#9CA3AF] mb-1.5 font-medium">
              Tên file lưu trên máy
            </label>
            <div className="flex items-center bg-[#101114] border border-[#2E303B] focus-within:border-[#A78BFA] rounded-xl px-3 py-2 transition-colors">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Nhập tên file..."
                className="w-full bg-transparent text-xs text-white outline-none"
              />
              <span className="text-xs font-mono text-[#A78BFA] font-medium shrink-0 ml-1">
                .{ext}
              </span>
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1.5">
              File sẽ được lưu với định dạng .{ext} chuẩn.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#9CA3AF] hover:text-white rounded-lg hover:bg-[#2E303B] transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] hover:opacity-90 text-white transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải xuống ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

