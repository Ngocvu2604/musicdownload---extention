import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, X, Volume2, VolumeX, AlertCircle, Radio } from 'lucide-react';
import { formatDuration } from '../utils/formatters';

interface MiniPlayerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ url, title, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);

    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border-t border-line-light dark:border-line-dark px-3 py-2 animate-slide-up z-30 shrink-0 shadow-lg">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
      />

      {/* Row 1: Title, Time & Close */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full bg-brand shrink-0 animate-pulse"></span>
          <span
            className="text-xs font-semibold text-content-light dark:text-content-dark truncate"
            title={title}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!hasError && (
            <span className="text-[10px] text-content-secondary font-mono">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          )}
          <button
            onClick={onClose}
            title="Đóng trình phát"
            className="text-content-secondary hover:text-content-light dark:hover:text-content-dark p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {hasError ? (
        <div className="flex items-center gap-1.5 text-[10px] text-brand py-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Không thể nghe thử luồng này do chính sách bảo vệ trang web (CORS).</span>
        </div>
      ) : (
        /* Row 2: Play/Pause, Slider, Mute */
        <div className="flex items-center gap-2.5">
          <button
            onClick={togglePlay}
            className="w-6 h-6 rounded-full bg-brand hover:bg-brand-dark text-white flex items-center justify-center shrink-0 transition-colors active:scale-95 shadow-sm"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>

          {/* Seek Slider */}
          <div className="flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={duration === 0}
              className="w-full h-1 bg-surface-hoverLight dark:bg-surface-hoverDark rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>

          <button
            onClick={toggleMute}
            className="text-content-secondary hover:text-content-light dark:hover:text-content-dark transition-colors shrink-0 p-0.5"
            title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-brand" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
