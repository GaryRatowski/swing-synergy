import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  className?: string;
  syncRef?: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (currentTime: number) => void;
  externalSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

const PLAYBACK_SPEEDS = [
  { value: "0.25", label: "0.25x" },
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
  { value: "1.5", label: "1.5x" },
  { value: "2", label: "2x" },
];

const FRAME_DURATION = 1 / 30; // ~33ms for 30fps

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const VideoPlayer = ({
  src,
  className,
  syncRef,
  onTimeUpdate,
  externalSpeed,
  onSpeedChange,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState("1");
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Sync with external speed if provided
  useEffect(() => {
    if (externalSpeed !== undefined) {
      setSpeed(externalSpeed.toString());
      if (videoRef.current) {
        videoRef.current.playbackRate = externalSpeed;
      }
    }
  }, [externalSpeed]);

  // Apply speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(speed);
    }
  }, [speed]);

  const handleSpeedChange = (newSpeed: string) => {
    if (!newSpeed) return;
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(newSpeed);
    }
    onSpeedChange?.(parseFloat(newSpeed));
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      syncRef?.current?.pause();
    } else {
      videoRef.current.play();
      syncRef?.current?.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, syncRef]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
      
      // Sync other video if in comparison mode
      if (syncRef?.current) {
        syncRef.current.currentTime = value[0];
      }
    }
  };

  const handleFrameStep = (direction: "forward" | "back") => {
    if (!videoRef.current) return;
    
    // Pause video if playing
    if (isPlaying) {
      videoRef.current.pause();
      syncRef?.current?.pause();
      setIsPlaying(false);
    }
    
    const step = direction === "forward" ? FRAME_DURATION : -FRAME_DURATION;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + step));
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Sync other video
    if (syncRef?.current) {
      syncRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this video player is focused or in fullscreen
      if (!containerRef.current?.contains(document.activeElement) && !isFullscreen) return;
      
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleFrameStep("back");
          break;
        case "ArrowRight":
          e.preventDefault();
          handleFrameStep("forward");
          break;
        case "Escape":
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, isFullscreen]);

  // Auto-hide controls
  const resetHideTimeout = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    }
  }, [isPlaying]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        isFullscreen && "rounded-none",
        className
      )}
      onMouseMove={resetHideTimeout}
      onTouchStart={resetHideTimeout}
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      >
        Your browser does not support the video tag.
      </video>

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Timeline Scrubber */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.01}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-white/80 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {/* Frame Back */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/20"
              onClick={() => handleFrameStep("back")}
              title="Previous Frame (←)"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20"
              onClick={togglePlay}
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            {/* Frame Forward */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/20"
              onClick={() => handleFrameStep("forward")}
              title="Next Frame (→)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Mute Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Speed Selector */}
          <ToggleGroup
            type="single"
            value={speed}
            onValueChange={handleSpeedChange}
            className="bg-black/40 rounded-md p-0.5"
          >
            {PLAYBACK_SPEEDS.map((s) => (
              <ToggleGroupItem
                key={s.value}
                value={s.value}
                className={cn(
                  "h-7 px-2 text-xs text-white/70 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  "hover:text-white"
                )}
              >
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Play button overlay when paused */}
      {!isPlaying && showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
