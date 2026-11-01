export type AudioFormat =
  | 'mp3'
  | 'wav'
  | 'flac'
  | 'aac'
  | 'm4a'
  | 'ogg'
  | 'opus'
  | 'webm'
  | 'unknown';

export type MediaSourceType = 'DIRECT' | 'BLOB' | 'STREAMING' | 'UNKNOWN';

export type MediaPlaybackStatus =
  | 'PLAYING'
  | 'PAUSED'
  | 'BUFFERING'
  | 'ENDED'
  | 'UNKNOWN';

export type DetectionSource =
  | 'dom-audio'
  | 'dom-video'
  | 'dom-link'
  | 'network-request'
  | 'youtube-source'
  | 'soundcloud-source'
  | 'performance-resource';

/**
 * Unified Media Interface as requested in Section 6
 */
export interface DetectedMedia {
  id: string;
  tabId: number;
  title: string;
  website: string;
  pageUrl: string;

  mediaUrl?: string;
  mediaType: 'audio' | 'video' | 'stream' | 'unknown';
  format: AudioFormat;
  sourceType: MediaSourceType;

  status: MediaPlaybackStatus;

  duration?: number;
  currentTime?: number;
  size?: number; // In bytes if known

  downloadable: boolean;
  downloadReason?: string;

  detectedAt: number;
  updatedAt: number;
  isFavorite?: boolean;

  // Metadata for advanced UI
  source: DetectionSource;
  mimeType?: string;
  filename: string;
}

// Backward-compatibility alias
export type DetectedAudioItem = DetectedMedia;

export interface DownloadItem {
  downloadId: number;
  audioId?: string;
  url: string;
  filename: string;
  format: AudioFormat;
  size?: number;
  bytesReceived: number;
  totalBytes: number;
  state: 'in_progress' | 'interrupted' | 'complete';
  canResume: boolean;
  paused: boolean;
  error?: string;
  startTime: number;
  domain: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  filename: string;
  url: string;
  format: AudioFormat;
  size?: number;
  duration?: number;
  domain: string;
  downloadedAt: number;
  isFavorite: boolean;
}

export interface UserSettings {
  autoDetect: boolean;
  minFileSizeKB: number;
  minDurationSeconds: number;
  downloadSubfolder: string;
  promptFilename: boolean;
  audioNotification: boolean;
  theme: 'dark';
}

export type TabType = 'home' | 'downloads' | 'library' | 'settings';

export type MessageType =
  | 'AUDIO_DETECTED'
  | 'MEDIA_DETECTED'
  | 'MEDIA_STATUS_UPDATE'
  | 'SCAN_PAGE'
  | 'SCAN_MEDIA'
  | 'GET_TAB_AUDIO'
  | 'GET_TAB_MEDIA'
  | 'CLEAR_TAB_AUDIO'
  | 'START_DOWNLOAD'
  | 'PAUSE_DOWNLOAD'
  | 'RESUME_DOWNLOAD'
  | 'CANCEL_DOWNLOAD'
  | 'SHOW_DOWNLOAD_ITEM'
  | 'OPEN_DOWNLOADS_FOLDER'
  | 'GET_DOWNLOADS'
  | 'DOWNLOADS_STATUS_UPDATE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'INJECT_CONTENT_SCRIPT';

export interface ExtensionMessage<T = any> {
  type: MessageType;
  tabId?: number;
  payload?: T;
}
