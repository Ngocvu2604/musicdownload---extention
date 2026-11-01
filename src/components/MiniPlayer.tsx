import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, X, Volume2, VolumeX, AlertCircle } from 'lucide-react';
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
    // When URL changes, reset player
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
    <div className="bg-[#1A1B20] border-t border-[#2E303B] px-3.5 py-2 shadow-2xl animate-slide-up z-30">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
      />

      {/* Title & Close */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse"></span>
          <span className="text-xs font-medium text-white truncate max-w-[280px]">
            {title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#9CA3AF] hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasError ? (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 py-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Không thể phát trước luồng này (có thể do CORS). Bạn vẫn có thể tải về!</span>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-[#9CA3AF] font-mono min-w-[28px]">
              {formatDuration(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={duration === 0}
              className="w-full h-1 bg-[#2E303B] rounded-lg appearance-none cursor-pointer"
            />

            <span className="text-[10px] text-[#9CA3AF] font-mono min-w-[28px] text-right">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleMute}
              className="text-[#9CA3AF] hover:text-white transition-colors"
              title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={togglePlay}
              className="w-7 h-7 rounded-full bg-[#A78BFA] hover:bg-[#9065f8] text-black flex items-center justify-center transition-all shadow-md active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <div className="w-3.5"></div>
          </div>
        </>
      )}
    </div>
  );
};

