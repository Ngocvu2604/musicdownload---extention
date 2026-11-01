export type AudioFormat =
  | 'mp3'
  | 'wav'
  | 'flac'
  | 'aac'
  | 'm4a'
  | 'ogg'
  | 'opus'
  | 'webm'
  | 'mp4'
  | 'hls'
  | 'dash'
  | 'unknown';

export type MediaSourceType =
  | 'DIRECT_FILE'
  | 'STREAMING_MEDIA'
  | 'BLOB_MEDIA'
  | 'PLAYLIST'
  | 'MEDIA_SEGMENT'
  | 'UNKNOWN'
  // Backward compatibility aliases:
  | 'DIRECT'
  | 'BLOB'
  | 'STREAMING';

export type MediaPlaybackStatus =
  | 'PLAYING'
  | 'PAUSED'
  | 'BUFFERING'
  | 'ENDED'
  | 'UNKNOWN';

export type DownloadStatus =
  | 'READY_TO_DOWNLOAD'
  | 'DOWNLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'NOT_AVAILABLE'
  | 'STREAMING_ONLY';

export type DetectionSource =
  | 'dom-audio'
  | 'dom-video'
  | 'dom-link'
  | 'network-request'
  | 'youtube-source'
  | 'soundcloud-source'
  | 'performance-resource'
  | 'hls-manifest'
  | 'dash-manifest';

/**
 * Advanced Unified Media Interface for V2 Engine
 */
export interface DetectedMedia {
  id: string;
  tabId: number;
  title: string;
  artist?: string; // Channel name, Creator, Singer, Band
  website: string;
  pageUrl: string;

  mediaUrl?: string;
  mediaType: 'audio' | 'video' | 'stream' | 'unknown';
  format: AudioFormat;
  sourceType: MediaSourceType;

  status: MediaPlaybackStatus;
  downloadStatus?: DownloadStatus;

  duration?: number;
  currentTime?: number;
  size?: number; // In bytes if known

  downloadable: boolean;
  downloadReason?: string;
  streamingProtocol?: string; // 'HLS' | 'DASH' | 'Blob MediaSource' | 'Direct HTTP'

  detectedAt: number;
  updatedAt: number;
  isFavorite?: boolean;

  // Metadata for advanced UI & download
  source: DetectionSource;
  mimeType?: string;
  filename: string;
  lastError?: string;
}

export type DetectedAudioItem = DetectedMedia;

export interface DownloadItem {
  downloadId: number;
  audioId?: string;
  url: string;
  pageUrl?: string;
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
  speed?: number; // bytes/sec
  speedFormatted?: string;
  downloadStatus?: DownloadStatus;
  retryCount?: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  artist?: string;
  filename: string;
  url: string;
  format: AudioFormat;
  size?: number;
  duration?: number;
  domain: string;
  downloadedAt: number;
  isFavorite: boolean;
}

export interface SourceValidationResult {
  isValid: boolean;
  isAudioOrVideo: boolean;
  contentType?: string;
  contentLength?: number;
  contentDispositionFilename?: string;
  httpStatus?: number;
  error?: string;
  suggestedFormat?: AudioFormat;
}

export interface UserSettings {
  autoDetect: boolean;
  minFileSizeKB: number;
  minDurationSeconds: number;
  downloadSubfolder: string;
  promptFilename: boolean;
  audioNotification: boolean;
  theme: 'dark' | 'light';
  preferredFormat: 'mp3' | 'm4a' | 'wav';
}

export type TabType = 'home' | 'link' | 'downloads' | 'library' | 'settings';

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
  | 'VALIDATE_AND_DOWNLOAD'
  | 'PAUSE_DOWNLOAD'
  | 'RESUME_DOWNLOAD'
  | 'CANCEL_DOWNLOAD'
  | 'RETRY_DOWNLOAD'
  | 'SHOW_DOWNLOAD_ITEM'
  | 'OPEN_DOWNLOADS_FOLDER'
  | 'GET_DOWNLOADS'
  | 'DOWNLOADS_STATUS_UPDATE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'REGISTER_PENDING_DOWNLOAD'
  | 'INJECT_CONTENT_SCRIPT';

export interface ExtensionMessage<T = any> {
  type: MessageType;
  tabId?: number;
  payload?: T;
}
