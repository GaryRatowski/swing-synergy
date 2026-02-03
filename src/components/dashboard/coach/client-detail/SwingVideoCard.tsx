import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Play } from "lucide-react";
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

interface SwingVideoCardProps {
  video: SwingVideo;
  isSelected: boolean;
  canSelect: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
}

const getClubBadgeVariant = (clubType: string): "default" | "secondary" | "outline" => {
  switch (clubType) {
    case "driver":
      return "default";
    case "iron":
      return "secondary";
    default:
      return "outline";
  }
};

const getContextLabel = (context: string) => {
  const labels: Record<string, string> = {
    assessment: "Assessment",
    practice: "Practice",
    competition: "Competition",
    "post-drill": "Post-Drill",
  };
  return labels[context] || context;
};

const SwingVideoCard = ({
  video,
  isSelected,
  canSelect,
  onSelect,
  onClick,
}: SwingVideoCardProps) => {
  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
    >
      {/* Video Thumbnail / Placeholder */}
      <div 
        className="relative aspect-video bg-muted flex items-center justify-center group"
        onClick={onClick}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Play className="h-8 w-8 ml-1" />
            </div>
          </div>
        )}

        {/* Compare Checkbox */}
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 bg-background/90 rounded-md px-2 py-1.5">
            <Checkbox
              id={`compare-${video.id}`}
              checked={isSelected}
              onCheckedChange={(checked) => canSelect && onSelect(checked as boolean)}
              disabled={!canSelect && !isSelected}
            />
            <label
              htmlFor={`compare-${video.id}`}
              className="text-xs font-medium cursor-pointer"
            >
              Compare
            </label>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="p-3" onClick={onClick}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-foreground">
            {format(parseISO(video.recorded_date), "MMM d, yyyy")}
          </p>
          <div className="flex gap-1">
            <Badge variant={getClubBadgeVariant(video.club_type)} className="text-xs capitalize">
              {video.club_type}
            </Badge>
          </div>
        </div>
        
        <Badge variant="outline" className="text-xs mb-2">
          {getContextLabel(video.context)}
        </Badge>

        {video.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
            {video.notes.length > 50 ? `${video.notes.slice(0, 50)}...` : video.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SwingVideoCard;
