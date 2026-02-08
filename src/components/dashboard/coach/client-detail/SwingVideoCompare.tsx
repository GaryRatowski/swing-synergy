import React, { useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Link2,
  Unlink2,
  Maximize,
  Minimize,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface SwingVideo {
  id: string;
  client_id: string;
  uploaded_by: string;
  video_url: string;
  thumbnail_url: string | null;
  recorded_date: string;
  club_type: string;
  context: string;
  notes: string | null;
  created_at: string;
}

interface SwingVideoCompareProps {
  videos: SwingVideo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONTEXTS: Record<string, string> = {
  assessment: "Assessment",
  practice: "Practice",
  competition: "Competition",
  "post-drill": "Post-Drill",
};

const PLAYBACK_SPEEDS = [
  { value: "0.25", label: "0.25x" },
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
  { value: "1.5", label: "1.5x" },
  { value: "2", label: "2x" },
];

const FRAME_DURATION = 1 / 30;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const SwingVideoCompare = ({
  videos,
  open,
  onOpenChange,
}: SwingVideoCompareProps) => {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [speed, setSpeed] = useState("1");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      video1Ref.current?.pause();
      video2Ref.current?.pause();
    } else {
      video1Ref.current?.play();
      if (syncEnabled) {
        video2Ref.current?.play();
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, syncEnabled]);

  const handleRestart = () => {
    if (video1Ref.current) {
      video1Ref.current.currentTime = 0;
    }
    if (video2Ref.current) {
      video2Ref.current.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSpeedChange = (newSpeed: string) => {
    if (!newSpeed) return;
    setSpeed(newSpeed);
    const rate = parseFloat(newSpeed);
    if (video1Ref.current) video1Ref.current.playbackRate = rate;
    if (video2Ref.current) video2Ref.current.playbackRate = rate;
  };

  const handleFrameStep = (direction: "forward" | "back") => {
    // Pause if playing
    if (isPlaying) {
      video1Ref.current?.pause();
      video2Ref.current?.pause();
      setIsPlaying(false);
    }

    const step = direction === "forward" ? FRAME_DURATION : -FRAME_DURATION;

    if (video1Ref.current) {
      const newTime = Math.max(0, video1Ref.current.currentTime + step);
      video1Ref.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
    if (syncEnabled && video2Ref.current && video1Ref.current) {
      video2Ref.current.currentTime = video1Ref.current.currentTime;
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (video1Ref.current) {
      video1Ref.current.currentTime = newTime;
    }
    if (syncEnabled && video2Ref.current) {
      video2Ref.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleVideo1TimeUpdate = () => {
    if (video1Ref.current) {
      setCurrentTime(video1Ref.current.currentTime);
      if (syncEnabled && video2Ref.current) {
        if (Math.abs(video1Ref.current.currentTime - video2Ref.current.currentTime) > 0.1) {
          video2Ref.current.currentTime = video1Ref.current.currentTime;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (video1Ref.current) {
      setDuration(video1Ref.current.duration);
      video1Ref.current.playbackRate = parseFloat(speed);
    }
    if (video2Ref.current) {
      video2Ref.current.playbackRate = parseFloat(speed);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // Handle fullscreen changes
  // Handle fullscreen changes via useEffect
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-y-auto p-0">
        <div
          ref={containerRef}
          className={cn("flex flex-col", isFullscreen && "bg-black h-screen")}
        >
          <DialogHeader className={cn("p-4 pb-2", isFullscreen && "hidden")}>
            <DialogTitle>Compare Swings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4 pt-0">
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video, index) => (
                <div key={video.id} className="space-y-2">
                  {/* Video Player */}
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={index === 0 ? video1Ref : video2Ref}
                      src={video.video_url}
                      className="w-full h-full"
                      playsInline
                      muted
                      onTimeUpdate={index === 0 ? handleVideo1TimeUpdate : undefined}
                      onLoadedMetadata={index === 0 ? handleLoadedMetadata : undefined}
                      onEnded={handleVideoEnded}
                      onClick={handlePlayPause}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  {/* Metadata */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {format(parseISO(video.recorded_date), "MMM d, yyyy")}
                      </p>
                      <div className="flex gap-1">
                        <Badge variant="default" className="capitalize text-xs">
                          {video.club_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {CONTEXTS[video.context] || video.context}
                        </Badge>
                      </div>
                    </div>
                    {video.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {video.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Unified Controls */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-3">
              {/* Timeline Scrubber */}
              <div>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.01}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {/* Frame Back */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => handleFrameStep("back")}
                  title="Previous Frame"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                {/* Play/Pause */}
                <Button
                  size="lg"
                  className="h-12 px-6"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Play Both
                    </>
                  )}
                </Button>

                {/* Frame Forward */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => handleFrameStep("forward")}
                  title="Next Frame"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                {/* Restart */}
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart
                </Button>

                {/* Sync Toggle */}
                <Button
                  variant={syncEnabled ? "secondary" : "outline"}
                  onClick={() => setSyncEnabled(!syncEnabled)}
                >
                  {syncEnabled ? (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Synced
                    </>
                  ) : (
                    <>
                      <Unlink2 className="h-4 w-4 mr-2" />
                      Independent
                    </>
                  )}
                </Button>

                {/* Fullscreen */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
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

              {/* Speed Selector */}
              <div className="flex justify-center">
                <ToggleGroup
                  type="single"
                  value={speed}
                  onValueChange={handleSpeedChange}
                  className="bg-background border rounded-lg"
                >
                  {PLAYBACK_SPEEDS.map((s) => (
                    <ToggleGroupItem
                      key={s.value}
                      value={s.value}
                      className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {s.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>

            {/* Date Comparison */}
            {videos.length === 2 && (
              <div className="text-center text-sm text-muted-foreground">
                {(() => {
                  const date1 = parseISO(videos[0].recorded_date);
                  const date2 = parseISO(videos[1].recorded_date);
                  const diffDays = Math.abs(
                    Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))
                  );

                  if (diffDays === 0) {
                    return "Videos recorded on the same day";
                  } else if (diffDays === 1) {
                    return "1 day between videos";
                  } else {
                    return `${diffDays} days between videos`;
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SwingVideoCompare;
