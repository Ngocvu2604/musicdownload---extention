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
        <Search className="w-3.5 h-3.5 text-content-secondary absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bài hát, tệp, website..."
          className="w-full bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark focus:border-brand text-xs text-content-light dark:text-content-dark rounded-lg pl-8 pr-3 py-1.5 outline-none transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[10px] text-content-secondary hover:text-content-light dark:hover:text-content-dark absolute right-3 top-1/2 -translate-y-1/2"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Format filters & Favorites toggle */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
        <div className="flex items-center gap-1 shrink-0">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                selectedFormat === fmt.id
                  ? 'bg-brand text-white font-semibold'
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
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 ${
            onlyFavorites
              ? 'bg-brand text-white font-semibold'
              : 'bg-surface-light dark:bg-surface-dark text-content-secondary hover:text-content-light dark:hover:text-content-dark border border-line-light dark:border-line-dark'
          }`}
        >
          <Heart className={`w-3 h-3 ${onlyFavorites ? 'fill-current' : ''}`} />
          <span>Yêu thích</span>
        </button>
      </div>

      {/* Action Header: Results count and Clear History */}
      <div className="flex items-center justify-between text-[11px] text-content-secondary px-0.5">
        <span>Hiển thị {filteredItems.length} mục</span>
        <button
          onClick={onClearAll}
          className="flex items-center gap-1 text-[10px] text-content-secondary hover:text-brand transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>Xóa tất cả</span>
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark rounded-lg p-3 transition-colors hover:border-content-secondary/40"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0 flex-1">
                <h4
                  className="text-xs font-semibold text-content-light dark:text-content-dark truncate"
                  title={item.title}
                >
                  {item.title}
                </h4>
                {item.artist && (
                  <p className="text-[10px] text-content-secondary truncate">
                    {item.artist}
                  </p>
                )}
                <p className="text-[10px] text-content-secondary font-mono truncate">
                  {item.filename}
                </p>
              </div>

              {/* Favorite Button */}
              <button
                onClick={() => onToggleFavorite(item.id)}
                title={item.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                className="p-1 rounded text-content-secondary hover:text-brand transition-colors"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    item.isFavorite ? 'fill-brand text-brand' : ''
                  }`}
                />
              </button>
            </div>

            {/* Bottom info & actions */}
            <div className="flex items-center justify-between pt-1 border-t border-line-light dark:border-line-dark text-[10px] text-content-secondary">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="uppercase font-bold text-content-light dark:text-content-dark">{item.format}</span>
                {item.size && <span>• {formatBytes(item.size)}</span>}
                <span>• {formatDate(item.downloadedAt)}</span>
              </div>

              <div className="flex items-center gap-1">
                {/* Play Preview */}
                <button
                  onClick={() => onPlay(item.url, item.title)}
                  title="Nghe lại"
                  className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                </button>

                {/* Redownload */}
                <button
                  onClick={() => onRedownload(item)}
                  title="Tải lại file"
                  className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                >
                  <Download className="w-3 h-3" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteItem(item.id)}
                  title="Xóa khỏi thư viện"
                  className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-hoverLight dark:hover:bg-surface-hoverDark transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
