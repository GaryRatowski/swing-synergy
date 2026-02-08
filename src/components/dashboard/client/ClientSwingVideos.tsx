import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateWithUpgrade } from "@/components/EmptyStateWithUpgrade";
import { UPGRADE_PROMPTS } from "@/lib/upgradePrompts";
import { Video, Upload, Play, Lock } from "lucide-react";
import { format, parseISO } from "date-fns";
import SwingVideoUpload from "@/components/dashboard/coach/client-detail/SwingVideoUpload";
import SwingVideoDetail from "@/components/dashboard/coach/client-detail/SwingVideoDetail";

interface ClientSwingVideosProps {
  clientId: string;
}

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

const ClientSwingVideos = ({ clientId }: ClientSwingVideosProps) => {
  const { profile } = useAuth();
  const { hasVideoAnalysis } = useFeatureAccess();
  const { showUpgradePrompt, UpgradePromptModal } = useUpgradePrompt();
  const [videos, setVideos] = useState<SwingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SwingVideo | null>(null);

  useEffect(() => {
    if (hasVideoAnalysis) {
      fetchVideos();
    } else {
      setIsLoading(false);
    }
  }, [clientId, hasVideoAnalysis]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("swing_videos")
        .select("*")
        .eq("client_id", clientId)
        .order("recorded_date", { ascending: false })
        .limit(6);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Feature gate for video analysis
  if (!hasVideoAnalysis) {
    return (
      <>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="h-4 w-4" />
              Swing Videos
              <Lock className="h-3 w-3 text-muted-foreground ml-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyStateWithUpgrade
              icon={<Video className="h-8 w-8 text-muted-foreground" />}
              title="Video Analysis"
              description="Upload swing videos for side-by-side comparison and detailed feedback from your coach."
              requiredTier="Remote Coaching"
              onUpgrade={() => showUpgradePrompt(UPGRADE_PROMPTS.videoAnalysis)}
            />
          </CardContent>
        </Card>
        {UpgradePromptModal}
      </>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" />
            Swing Videos
          </CardTitle>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {videos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {videos.slice(0, 4).map((video) => (
              <div
                key={video.id}
                className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setSelectedVideo(video)}
              >
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Play className="h-5 w-5 ml-0.5" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {video.club_type}
                    </Badge>
                    <span className="text-xs text-white">
                      {format(parseISO(video.recorded_date), "MMM d")}
                    </span>
                  </div>
                </div>
                {video.uploaded_by === clientId && (
                  <Badge 
                    variant="outline" 
                    className="absolute top-2 right-2 text-xs bg-background/80"
                  >
                    My Upload
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No swing videos yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowUpload(true)}
            >
              Upload Your First Video
            </Button>
          </div>
        )}

        {videos.length > 4 && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            +{videos.length - 4} more videos
          </p>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <SwingVideoUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        clientId={clientId}
        onUploadComplete={fetchVideos}
      />

      {/* Video Detail Dialog */}
      {selectedVideo && (
        <SwingVideoDetail
          video={selectedVideo}
          open={!!selectedVideo}
          onOpenChange={(open) => !open && setSelectedVideo(null)}
          isCoach={false}
          onUpdate={fetchVideos}
          onDelete={() => {
            setSelectedVideo(null);
            fetchVideos();
          }}
        />
      )}
    </Card>
  );
};

export default ClientSwingVideos;
