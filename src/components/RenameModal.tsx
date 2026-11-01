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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded w-full max-w-[320px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-line-light dark:border-line-dark">
          <div className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-brand" />
            <h3 className="font-semibold text-xs text-content-light dark:text-content-dark">
              Đổi tên tệp âm thanh
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-content-secondary hover:text-content-light dark:hover:text-content-dark transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] text-content-secondary mb-1 font-medium">
              Tên file tải về
            </label>
            <div className="flex items-center bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark focus-within:border-brand rounded px-2.5 py-1.5 transition-colors">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Nhập tên file..."
                className="w-full bg-transparent text-xs text-content-light dark:text-content-dark outline-none font-mono"
              />
              <span className="text-[11px] text-content-secondary font-mono pl-1">
                .{ext}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-content-secondary hover:text-content-light dark:hover:text-content-dark bg-surface-hoverLight dark:bg-surface-hoverDark border border-line-light dark:border-line-dark transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-brand hover:bg-brand-dark text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xác nhận & Tải</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
