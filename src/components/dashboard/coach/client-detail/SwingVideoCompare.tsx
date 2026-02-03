import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";

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

const SwingVideoCompare = ({
  videos,
  open,
  onOpenChange,
}: SwingVideoCompareProps) => {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);

  const handlePlayPause = () => {
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
  };

  const handleRestart = () => {
    if (video1Ref.current) {
      video1Ref.current.currentTime = 0;
    }
    if (video2Ref.current) {
      video2Ref.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleVideo1TimeUpdate = () => {
    if (syncEnabled && video1Ref.current && video2Ref.current) {
      // Only sync if difference is more than 0.1 seconds
      if (Math.abs(video1Ref.current.currentTime - video2Ref.current.currentTime) > 0.1) {
        video2Ref.current.currentTime = video1Ref.current.currentTime;
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Swings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button onClick={handlePlayPause} size="lg">
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
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
            <Button
              variant={syncEnabled ? "secondary" : "outline"}
              onClick={() => setSyncEnabled(!syncEnabled)}
            >
              {syncEnabled ? "Synced ✓" : "Not Synced"}
            </Button>
          </div>

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
                    onTimeUpdate={index === 0 ? handleVideo1TimeUpdate : undefined}
                    onEnded={handleVideoEnded}
                    controls={!syncEnabled}
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

          {/* Date Comparison */}
          {videos.length === 2 && (
            <div className="text-center text-sm text-muted-foreground">
              {(() => {
                const date1 = parseISO(videos[0].recorded_date);
                const date2 = parseISO(videos[1].recorded_date);
                const diffDays = Math.abs(Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)));
                
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
      </DialogContent>
    </Dialog>
  );
};

export default SwingVideoCompare;
