import React, { useState, useEffect, useCallback } from 'react';
import {
  TabType,
  DetectedMedia,
  DownloadItem,
  HistoryItem,
  UserSettings,
} from '../types/audio';
import { storageService, DEFAULT_SETTINGS } from '../storage/storageService';
import { downloadManager } from '../services/downloadManager';
import { getDomainFromUrl } from '../utils/formatters';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { AudioCard } from '../components/AudioCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { RenameModal } from '../components/RenameModal';
import { YouTubeNotice } from '../components/YouTubeNotice';
import { EmptyState } from '../components/EmptyState';
import { DownloadsView } from '../components/DownloadsView';
import { LibraryView } from '../components/LibraryView';
import { SettingsView } from '../components/SettingsView';
import { LinkDownloadView } from '../components/LinkDownloadView';
import { Download, CheckSquare, Square, CheckCircle, RotateCw, Trash2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [detectedItems, setDetectedItems] = useState<DetectedMedia[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Tab & Domain info
  const [currentTabId, setCurrentTabId] = useState<number>(0);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [currentTabTitle, setCurrentTabTitle] = useState<string>('');
  const [isYouTube, setIsYouTube] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanToast, setScanToast] = useState<string | null>(null);

  // Audio Previewer
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);
  const [playingPreviewTitle, setPlayingPreviewTitle] = useState<string>('');

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<DetectedMedia | null>(null);

  /**
   * Actively scan the active tab for media
   */
  const triggerTabScan = useCallback(async (tabId: number) => {
    if (tabId <= 0) return;
    setIsScanning(true);

    try {
      // Send scan message to Background Service Worker to handle injection and scanning
      await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'SCAN_MEDIA', tabId },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false });
            } else {
              resolve(res || { success: false });
            }
          }
        );
      });

      // Retrieve freshest items from storage
      const items = await storageService.getTabAudio(tabId);
      setDetectedItems(items);

      const playingCount = items.filter((i) => i.status === 'PLAYING').length;
      if (items.length > 0) {
        setScanToast(
          `Tìm thấy ${items.length} nguồn media${playingCount > 0 ? ` (${playingCount} đang phát)` : ''
          }`
        );
      } else {
        setScanToast('Đã quét xong: Chưa có media đang phát');
      }
      setTimeout(() => setScanToast(null), 2500);
    } catch (err) {
      console.warn('[AudioFlow] Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Load active tab and perform initial live scan
   */
  const loadTabInfo = useCallback(async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          const tabId = tab.id;
          setCurrentTabId(tabId);

          const domain = tab.url ? getDomainFromUrl(tab.url) : 'web';
          setCurrentDomain(domain);
          setCurrentTabTitle(tab.title || '');
          setIsYouTube(domain.includes('youtube.com'));

          // Load cached items first for zero-delay UI
          const cachedItems = await storageService.getTabAudio(tabId);
          setDetectedItems(cachedItems);

          // If valid http(s) page, immediately run active live scan!
          if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
            triggerTabScan(tabId);
          }
        }
      }
    } catch (e) {
      console.warn('[AudioFlow] Tab query failed:', e);
    }
  }, [triggerTabScan]);

  /**
   * Load settings, history & active downloads
   */
  const loadInitialData = useCallback(async () => {
    const [savedSettings, savedHistory, chromeDownloads] = await Promise.all([
      storageService.getSettings(),
      storageService.getHistory(),
      downloadManager.getChromeDownloads(),
    ]);

    setSettings(savedSettings);
    setHistory(savedHistory);
    setDownloads(chromeDownloads);
  }, []);

  useEffect(() => {
    loadTabInfo();
    loadInitialData();

    // Listen to storage changes to update UI in real time
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (currentTabId && changes[`tab_audio_${currentTabId}`]) {
        setDetectedItems((changes[`tab_audio_${currentTabId}`].newValue as DetectedMedia[]) || []);
      }
      if (changes.audioflow_history) {
        setHistory((changes.audioflow_history.newValue as HistoryItem[]) || []);
      }
      if (changes.audioflow_settings) {
        setSettings((changes.audioflow_settings.newValue as UserSettings) || DEFAULT_SETTINGS);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
    }

    // Listen to live runtime messages for playback status changes
    const messageListener = (msg: any) => {
      if (msg.type === 'MEDIA_STATUS_UPDATE' && msg.payload) {
        const updatedItem: DetectedMedia = msg.payload;
        setDetectedItems((prev) => {
          const idx = prev.findIndex((i) => i.id === updatedItem.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedItem;
            return next;
          }
          return [updatedItem, ...prev];
        });
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }

    // Periodically update active downloads
    const interval = setInterval(async () => {
      const current = await downloadManager.getChromeDownloads();
      setDownloads(current);
    }, 1500);

    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
      clearInterval(interval);
    };
  }, [loadTabInfo, loadInitialData, currentTabId]);

  /**
   * Trigger scan on user demand (Scan button)
   */
  const handleScanAgain = async () => {
    if (!currentTabId || isScanning) return;
    if (
      currentDomain.startsWith('chrome') ||
      currentDomain.startsWith('edge') ||
      currentDomain.startsWith('about')
    ) {
      alert('AudioFlow hoạt động trên các trang web (http/https).');
      return;
    }
    await triggerTabScan(currentTabId);
  };

  /**
   * Clear audio detected on current tab
   */
  const handleClearCurrentTab = async () => {
    if (currentTabId) {
      await storageService.clearTabAudio(currentTabId);
      setDetectedItems([]);
      setSelectedIds(new Set());
    }
  };

  /**
   * Single audio / video download
   */
  const handleDownload = async (
    item: DetectedMedia,
    customFilename?: string,
    targetFormat?: 'mp3' | 'm4a' | 'wav' | 'mp4'
  ) => {
    if (!item.downloadable || !item.mediaUrl) {
      alert(item.downloadReason || 'Nguồn phát này không có file tải trực tiếp.');
      return;
    }

    try {
      const isVideo = item.mediaType === 'video' || item.format === 'mp4';
      const isHls = item.sourceType === 'PLAYLIST' || (item.mediaUrl ? item.mediaUrl.includes('.m3u8') : false);

      let fallbackFormat: 'mp3' | 'm4a' | 'wav' | 'mp4' = 'mp3';
      if (isVideo || item.format === 'mp4') fallbackFormat = 'mp4';
      else if (item.format === 'wav') fallbackFormat = 'wav';
      else if (item.format === 'm4a' || item.format === 'aac') fallbackFormat = 'm4a';

      const effectiveFormat: 'mp3' | 'm4a' | 'wav' | 'mp4' = targetFormat || (isHls ? 'mp3' : fallbackFormat);
      const isExplicit = !!targetFormat;

      await downloadManager.startDownload({
        url: item.mediaUrl,
        filename: customFilename || item.title || item.filename,
        audioId: item.id,
        domain: item.website,
        size: item.size,
        targetFormat: effectiveFormat,
        explicitFormatSelection: isExplicit,
      });

      setActiveTab('downloads');
      const updated = await downloadManager.getChromeDownloads();
      setDownloads(updated);
    } catch (err: any) {
      alert(`Không thể tải file: ${err?.message || 'Lỗi mạng hoặc liên kết hết hạn'}`);
    }
  };

  /**
   * Retry a failed download item
   */
  const handleRetryDownload = async (downloadId: number) => {
    try {
      await downloadManager.retryDownload(downloadId);
      const updated = await downloadManager.getChromeDownloads();
      setDownloads(updated);
    } catch (err: any) {
      alert(`Không thể thử lại: ${err?.message || 'Lỗi mạng hoặc liên kết hết hạn'}`);
    }
  };

  /**
   * Clear finished/interrupted downloads from list
   */
  const handleClearFinishedDownloads = async () => {
    await downloadManager.clearFinishedDownloads();
    const updated = await downloadManager.getChromeDownloads();
    setDownloads(updated);
  };

  /**
   * Batch download selected items (only downloadable items)
   */
  const handleBatchDownload = async () => {
    const selectedItems = detectedItems.filter(
      (i) => selectedIds.has(i.id) && i.downloadable && i.mediaUrl
    );
    if (selectedItems.length === 0) return;

    try {
      await downloadManager.batchDownload(
        selectedItems.map((i) => ({
          url: i.mediaUrl!,
          filename: i.title || i.filename,
          audioId: i.id,
          domain: i.website,
          size: i.size,
        }))
      );
      setSelectedIds(new Set());
      setActiveTab('downloads');
    } catch (e) {
      console.error('[AudioFlow] Batch download error:', e);
    }
  };

  /**
   * Toggle select all downloadable items
   */
  const downloadableItems = detectedItems.filter((i) => i.downloadable);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === downloadableItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(downloadableItems.map((i) => i.id)));
    }
  };

  /**
   * Toggle single item selection
   */
  const handleToggleSelect = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  /**
   * Audio Preview
   */
  const handlePlayPreviewToggle = (item: DetectedMedia) => {
    if (!item.mediaUrl) return;
    if (playingPreviewUrl === item.mediaUrl) {
      setPlayingPreviewUrl(null);
    } else {
      setPlayingPreviewUrl(item.mediaUrl);
      setPlayingPreviewTitle(item.title || item.filename);
    }
  };

  const handleLibraryPlay = (url: string, title: string) => {
    if (playingPreviewUrl === url) {
      setPlayingPreviewUrl(null);
    } else {
      setPlayingPreviewUrl(url);
      setPlayingPreviewTitle(title);
    }
  };

  /**
   * Library operations
   */
  const handleToggleFavorite = async (id: string) => {
    await storageService.toggleFavorite(id);
    const updated = await storageService.getHistory();
    setHistory(updated);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await storageService.removeFromHistory(id);
    const updated = await storageService.getHistory();
    setHistory(updated);
  };

  const handleClearAllHistory = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tải?')) {
      await storageService.clearAllHistory();
      setHistory([]);
    }
  };

  /**
   * Settings operations
   */
  const handleUpdateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = await storageService.saveSettings(newSettings);
    setSettings(updated);
  };

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    handleUpdateSettings({ theme: newTheme });
  };

  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme]);

  const handleClearStorage = async () => {
    if (confirm('Xóa bộ nhớ đệm và thiết lập lại cài đặt mặc định?')) {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.clear();
      } else {
        localStorage.clear();
      }
      setDetectedItems([]);
      setHistory([]);
      setSettings(DEFAULT_SETTINGS);
      alert('Đã xóa dữ liệu thành công!');
    }
  };

  const activeDownloadsCount = downloads.filter((d) => d.state === 'in_progress').length;
  const playingCount = detectedItems.filter((i) => i.status === 'PLAYING').length;

  return (
    <div
      className={`flex flex-col w-[390px] h-[570px] select-none overflow-hidden relative transition-colors ${settings.theme === 'light'
          ? 'light bg-bg-light text-content-light'
          : 'dark bg-bg-dark text-content-dark'
        }`}
    >
      {/* Top Header */}
      <Header
        domain={currentDomain}
        count={detectedItems.length}
        isScanning={isScanning}
        onScanAgain={handleScanAgain}
        onClear={handleClearCurrentTab}
        activeTab={activeTab}
        theme={settings.theme || 'dark'}
        onToggleTheme={handleToggleTheme}
      />

      {/* Red Tone Scanning Preloader (Top Accent) */}
      {isScanning && (
        <div className="h-0.5 w-full bg-brand/20 overflow-hidden z-20 shrink-0 relative">
          <div className="h-full bg-brand animate-pulse w-full"></div>
        </div>
      )}

      {/* Main Content Area (Scrollable) */}
      <main className="flex-1 overflow-y-auto min-h-0 relative">
        {/* TAB 1: HOME (DETECTION) */}
        {activeTab === 'home' && (
          <div className={`p-3.5 space-y-2.5 animate-fade-in ${detectedItems.length === 0 ? 'h-full flex flex-col justify-center' : ''}`}>
            {/* YouTube Notice Card */}
            {isYouTube && (
              <YouTubeNotice
                pageTitle={currentTabTitle}
                hasOfficialSource={detectedItems.some((i) => i.downloadable)}
              />
            )}

            {/* Currently Playing Status Summary Bar */}
            {detectedItems.length > 0 && (
              <div className="flex items-center justify-between px-1 text-[11px] text-content-secondary">
                <div className="flex items-center gap-1.5">
                  {playingCount > 0 ? (
                    <span className="flex items-center gap-1.5 text-brand font-semibold">
                      <span className="w-2 h-2 rounded-full bg-brand"></span>
                      <span>{playingCount} nguồn đang phát</span>
                    </span>
                  ) : (
                    <span>Tất cả nguồn ({detectedItems.length})</span>
                  )}
                </div>
                <span>
                  {downloadableItems.length > 0
                    ? `${downloadableItems.length} file tải được`
                    : 'Phát trực tuyến'}
                </span>
              </div>
            )}

            {/* Action Toolbar: Chọn tất cả (trái, không khung) - Quét lại & Xóa (phải) */}
                  {detectedItems.length > 0 && (
                    <div className="flex items-center justify-between px-1 py-0.5 text-xs select-none">
                      {/* Left: Checkbox Chọn tất cả (Không khung) */}
                      <div className="flex items-center gap-2 min-w-0">
                        {downloadableItems.length > 0 && (
                          <button
                            onClick={handleToggleSelectAll}
                            className="flex items-center gap-1.5 text-content-secondary hover:text-content-light dark:hover:text-content-dark transition-colors"
                          >
                            {selectedIds.size === downloadableItems.length && downloadableItems.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-brand" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                            <span className="text-[11px] font-medium">
                              Chọn tất cả ({selectedIds.size}/{downloadableItems.length})
                            </span>
                          </button>
                        )}

                        {
                          selectedIds.size > 0 && (
                            <button
                              onClick={handleBatchDownload}
                              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-brand hover:bg-brand-dark text-white font-semibold text-[11px] transition-colors active:scale-95 shadow-sm"
                            >
                              <Download className="w-3 h-3" />
                              <span>Tải {selectedIds.size} file</span>
                            </button>
                          )
                        }
                </div>

                {/* Right: Nút Quét lại & Xóa dời xuống dưới ngang hàng */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleScanAgain}
                      disabled={isScanning}
                      title="Quét lại tab hiện tại"
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-content-secondary hover:text-content-light dark:hover:text-content-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 text-brand ${isScanning ? 'animate-spin' : ''}`} />
                      <span>Quét lại</span>
                    </button>

                    <button
                      onClick={handleClearCurrentTab}
                      title="Xóa danh sách media trên trang này"
                      className="p-1 rounded text-content-secondary hover:text-brand hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
              </div>
            )}

            {/* List of Detected Media Items */}
            {detectedItems.length > 0 ? (
              <div className="space-y-2.5">
                {detectedItems.map((item) => (
                  <AudioCard
                    key={item.id}
                    item={item}
                    isPlayingPreview={playingPreviewUrl === item.mediaUrl}
                    isSelected={selectedIds.has(item.id)}
                    onPlayPreviewToggle={() => handlePlayPreviewToggle(item)}
                    onDownload={(fmt) => handleDownload(item, undefined, fmt)}
                    onRename={() => setRenameTarget(item)}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                type="home"
                onScan={handleScanAgain}
                domain={currentDomain}
              />
            )}
          </div>
        )}

        {/* TAB 2: LINK DOWNLOAD (TẢI BẰNG LIÊN KẾT) */}
        {activeTab === 'link' && (
          <div className="h-full">
            <LinkDownloadView
              onDownloadStarted={async () => {
                setActiveTab('downloads');
                const updated = await downloadManager.getChromeDownloads();
                setDownloads(updated);
              }}
            />
          </div>
        )}

        {/* TAB 3: DOWNLOADS */}
        {activeTab === 'downloads' && (
          <DownloadsView
            downloads={downloads}
            onPause={(id) => downloadManager.pauseDownload(id)}
            onResume={(id) => downloadManager.resumeDownload(id)}
            onCancel={(id) => downloadManager.cancelDownload(id)}
            onShowItem={(id) => downloadManager.showDownloadItem(id)}
            onOpenFolder={() => downloadManager.openDownloadsFolder()}
            onRetry={handleRetryDownload}
            onClearFinished={handleClearFinishedDownloads}
          />
        )}

        {/* TAB 3: LIBRARY */}
        {activeTab === 'library' && (
          <LibraryView
            history={history}
            onToggleFavorite={handleToggleFavorite}
            onDeleteItem={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
            onRedownload={(item) =>
              handleDownload({
                id: item.id,
                tabId: currentTabId,
                title: item.title,
                website: item.domain,
                pageUrl: item.url,
                mediaUrl: item.url,
                mediaType: 'audio',
                format: item.format,
                sourceType: 'DIRECT',
                status: 'UNKNOWN',
                downloadStatus: 'READY_TO_DOWNLOAD',
                size: item.size,
                downloadable: true,
                downloadReason: 'Tải lại từ thư viện',
                detectedAt: Date.now(),
                updatedAt: Date.now(),
                source: 'dom-link',
                filename: item.filename,
              })
            }
            onPlay={handleLibraryPlay}
          />
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClearStorage={handleClearStorage}
          />
        )}
      </main>

      {/* Bottom Scan Toast Feedback (Moved to Bottom) */}
      {scanToast && (
        <div className="bg-brand/10 border-t border-brand/20 px-3.5 py-1.5 flex items-center gap-2 text-xs text-brand animate-fade-in z-20 shrink-0 select-none">
          <CheckCircle className="w-3.5 h-3.5 text-brand shrink-0" />
          <span className="font-medium truncate">{scanToast}</span>
        </div>
      )}

      {/* Mini Audio Player (Docked above Navbar if active) */}
      {playingPreviewUrl && (
        <MiniPlayer
          url={playingPreviewUrl}
          title={playingPreviewTitle}
          onClose={() => setPlayingPreviewUrl(null)}
        />
      )}

      {/* Rename Dialog Modal */}
      {renameTarget && (
        <RenameModal
          initialFilename={renameTarget.filename}
          url={renameTarget.mediaUrl || ''}
          onClose={() => setRenameTarget(null)}
          onConfirm={(customName) => {
            const target = renameTarget;
            setRenameTarget(null);
            handleDownload(target, customName);
          }}
        />
      )}

      {/* Bottom Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        detectedCount={detectedItems.length}
        activeDownloadsCount={activeDownloadsCount}
      />
    </div>
  );
};

export default App;
