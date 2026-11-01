import React, { useState, useMemo } from 'react';
import { HistoryItem } from '../types/audio';
import { formatBytes, formatDate } from '../utils/formatters';
import {
  Search,
  Heart,
  Trash2,
  Download,
  Play,
  RotateCcw,
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

  // Filter items
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
      .sort((a, b) => b.downloadedAt - a.downloadedAt);
  }, [history, search, selectedFormat, onlyFavorites]);

  if (history.length === 0) {
    return <EmptyState type="library" />;
  }

  const formats: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'mp3', label: 'MP3' },
    { id: 'wav', label: 'WAV' },
    { id: 'm4a', label: 'M4A' },
  ];

  return (
    <div className="p-3.5 space-y-2.5 animate-fade-in max-w-full overflow-hidden select-none">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-content-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bài hát, nghệ sĩ, website..."
          className="w-full bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark focus:border-brand text-xs text-content-light dark:text-content-dark rounded pl-8 pr-12 h-8 outline-none transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[10px] text-content-secondary hover:text-content-light dark:hover:text-content-dark absolute right-2.5 top-1/2 -translate-y-1/2 px-1 py-0.5"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Filter Chips & Favorite Filter */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
        <div className="flex items-center gap-1 shrink-0">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                selectedFormat === fmt.id
                  ? 'bg-brand text-white font-semibold shadow-sm'
                  : 'bg-surface-light dark:bg-surface-dark text-content-secondary hover:text-content-light dark:hover:text-content-dark border border-line-light dark:border-line-dark'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          title="Lọc bài hát yêu thích"
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors shrink-0 ${
            onlyFavorites
              ? 'bg-brand text-white font-semibold shadow-sm'
              : 'bg-surface-light dark:bg-surface-dark text-content-secondary hover:text-content-light dark:hover:text-content-dark border border-line-light dark:border-line-dark'
          }`}
        >
          <Heart className={`w-3 h-3 ${onlyFavorites ? 'fill-current' : ''}`} />
          <span>Yêu thích</span>
        </button>
      </div>

      {/* Action Header: Results count and Clear History */}
      <div className="flex items-center justify-between text-[11px] text-content-secondary px-0.5">
        <span>Hiển thị {filteredItems.length} bài hát</span>
        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-[10px] text-content-secondary hover:text-brand transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Xóa tất cả</span>
          </button>
        )}
      </div>

      {/* Unified List Container (Single container with divider lines) */}
      {filteredItems.length > 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded divide-y divide-line-light dark:divide-line-dark overflow-hidden">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-2.5 flex items-center justify-between gap-2.5 hover:bg-surface-hoverLight/40 dark:hover:bg-surface-hoverDark/40 transition-colors"
            >
              {/* Left: Format badge & Title info */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-brand/10 text-brand dark:bg-brand/20 shrink-0">
                  {item.format}
                </span>

                <div className="min-w-0 flex-1">
                  <h4
                    className="text-xs font-semibold text-content-light dark:text-content-dark truncate"
                    title={item.title}
                  >
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] text-content-secondary truncate">
                    {item.artist && <span>{item.artist} •</span>}
                    {item.size && <span>{formatBytes(item.size)} •</span>}
                    <span>{formatDate(item.downloadedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Play Preview */}
                <button
                  onClick={() => onPlay(item.url, item.title)}
                  title="Nghe lại"
                  className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>

                {/* Favorite Toggle */}
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  title={item.isFavorite ? 'Bỏ thích' : 'Yêu thích'}
                  className="p-1 rounded text-content-secondary hover:text-brand transition-colors"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      item.isFavorite ? 'fill-brand text-brand' : ''
                    }`}
                  />
                </button>

                {/* Redownload */}
                <button
                  onClick={() => onRedownload(item)}
                  title="Tải lại file"
                  className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteItem(item.id)}
                  title="Xóa khỏi thư viện"
                  className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-content-secondary">
          Không tìm thấy bài hát nào phù hợp.
        </div>
      )}
    </div>
  );
};
