import React, { useState, useMemo } from 'react';
import { HistoryItem } from '../types/audio';
import { formatBytes, formatDate } from '../utils/formatters';
import {
  Search,
  Heart,
  Trash2,
  Download,
  Play,
} from 'lucide-react';
import { EmptyState } from './EmptyState';

interface LibraryViewProps {
  history: HistoryItem[];
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onRedownload: (item: HistoryItem) => void;
  onPlay: (url: string, title: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  history,
  onToggleFavorite,
  onDeleteItem,
  onClearAll,
  onRedownload,
  onPlay,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'size-desc'>('date-desc');

  // Filter & Sort
  const filteredItems = useMemo(() => {
    return history
      .filter((item) => {
        // Search filter
        if (
          search.trim() &&
          !item.title.toLowerCase().includes(search.toLowerCase()) &&
          !item.filename.toLowerCase().includes(search.toLowerCase()) &&
          !item.domain.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }

        // Format filter
        if (selectedFormat !== 'all' && item.format !== selectedFormat) {
          return false;
        }

        // Favorites filter
        if (onlyFavorites && !item.isFavorite) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.downloadedAt - a.downloadedAt;
        if (sortBy === 'date-asc') return a.downloadedAt - b.downloadedAt;
        if (sortBy === 'size-desc') return (b.size || 0) - (a.size || 0);
        return 0;
      });
  }, [history, search, selectedFormat, onlyFavorites, sortBy]);

  if (history.length === 0) {
    return <EmptyState type="library" />;
  }

  const formats: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'mp3', label: 'MP3' },
    { id: 'wav', label: 'WAV' },
    { id: 'flac', label: 'FLAC' },
    { id: 'm4a', label: 'M4A' },
  ];

  return (
    <div className="p-3.5 space-y-3 animate-fade-in">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bài hát, file, website..."
          className="w-full bg-[#1A1B20] border border-[#2E303B] focus:border-[#A78BFA] text-xs text-white rounded-xl pl-8.5 pr-3 py-2 outline-none transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[10px] text-[#9CA3AF] hover:text-white absolute right-3 top-1/2 -translate-y-1/2"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Filter Chips & Controls */}
      <div className="flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[260px] no-scrollbar">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`px-2 py-0.8 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedFormat === fmt.id
                  ? 'bg-[#A78BFA] text-black font-semibold'
                  : 'bg-[#1A1B20] text-[#9CA3AF] hover:text-white border border-[#2E303B]'
              }`}
            >
              {fmt.label}
            </button>
          ))}

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            title="Chỉ hiển thị bài yêu thích"
            className={`px-2 py-0.8 text-[11px] font-medium rounded-lg flex items-center gap-1 whitespace-nowrap transition-colors ${
              onlyFavorites
                ? 'bg-rose-500 text-white'
                : 'bg-[#1A1B20] text-[#9CA3AF] hover:text-white border border-[#2E303B]'
            }`}
          >
            <Heart className={`w-3 h-3 ${onlyFavorites ? 'fill-current' : ''}`} />
            <span>Thích</span>
          </button>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#1A1B20] border border-[#2E303B] text-[10px] text-[#9CA3AF] rounded-lg px-1.5 py-1 outline-none cursor-pointer"
          >
            <option value="date-desc">Mới nhất</option>
            <option value="date-asc">Cũ nhất</option>
            <option value="size-desc">Dung lượng</option>
          </select>
        </div>
      </div>

      {/* Summary & Clear all */}
      <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] px-1">
        <span>Hiển thị {filteredItems.length} mục</span>
        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-rose-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      {/* History Items List */}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group bg-[#1A1B20] hover:bg-[#202229] border border-[#2E303B] hover:border-[#3F4250] rounded-xl p-2.5 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => onPlay(item.url, item.title || item.filename)}
                  title="Nghe lại"
                  className="w-7 h-7 rounded-lg bg-[#2E303B] group-hover:bg-[#7C3AED] text-white flex items-center justify-center shrink-0 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[170px]" title={item.title}>
                      {item.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30">
                      {item.format}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] mt-0.5">
                    <span>{formatBytes(item.size)}</span>
                    <span>•</span>
                    <span>{formatDate(item.downloadedAt)}</span>
                    <span>•</span>
                    <span className="truncate max-w-[70px]">{item.domain}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  title={item.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    item.isFavorite
                      ? 'text-rose-400 bg-rose-500/10'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#2E303B]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => onRedownload(item)}
                  title="Tải lại file này"
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#22D3EE] hover:bg-[#2E303B] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDeleteItem(item.id)}
                  title="Xóa khỏi lịch sử"
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-400 hover:bg-[#2E303B] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

