import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Upload, Search, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import SwingVideoUpload from "./SwingVideoUpload";
import SwingVideoCard from "./SwingVideoCard";
import SwingVideoDetail from "./SwingVideoDetail";
import SwingVideoCompare from "./SwingVideoCompare";

interface VideosTabProps {
  clientId: string;
  isCoach?: boolean;
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

const CLUB_TYPES = [
  { value: "all", label: "All Clubs" },
  { value: "driver", label: "Driver" },
  { value: "iron", label: "Iron" },
  { value: "wedge", label: "Wedge" },
  { value: "putter", label: "Putter" },
  { value: "other", label: "Other" },
];

const CONTEXTS = [
  { value: "all", label: "All Contexts" },
  { value: "assessment", label: "Assessment" },
  { value: "practice", label: "Practice" },
  { value: "competition", label: "Competition" },
  { value: "post-drill", label: "Post-Drill" },
];

const VideosTab = ({ clientId, isCoach = true }: VideosTabProps) => {
  const [videos, setVideos] = useState<SwingVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<SwingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SwingVideo | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [clubTypeFilter, setClubTypeFilter] = useState("all");
  const [contextFilter, setContextFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [clientId]);

  useEffect(() => {
    applyFilters();
  }, [videos, searchQuery, clubTypeFilter, contextFilter, dateRange]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("swing_videos")
        .select("*")
        .eq("client_id", clientId)
        .order("recorded_date", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...videos];

    // Search in notes
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.notes?.toLowerCase().includes(query)
      );
    }

    // Club type filter
    if (clubTypeFilter !== "all") {
      filtered = filtered.filter(v => v.club_type === clubTypeFilter);
    }

    // Context filter
    if (contextFilter !== "all") {
      filtered = filtered.filter(v => v.context === contextFilter);
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(v => 
        new Date(v.recorded_date) >= dateRange.from!
      );
    }
    if (dateRange.to) {
      filtered = filtered.filter(v => 
        new Date(v.recorded_date) <= dateRange.to!
      );
    }

    setFilteredVideos(filtered);
  };

  const handleSelectForCompare = (videoId: string, selected: boolean) => {
    if (selected) {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare([...selectedForCompare, videoId]);
      }
    } else {
      setSelectedForCompare(selectedForCompare.filter(id => id !== videoId));
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setClubTypeFilter("all");
    setContextFilter("all");
    setDateRange({});
  };

  const hasActiveFilters = searchQuery || clubTypeFilter !== "all" || contextFilter !== "all" || dateRange.from || dateRange.to;

  const compareVideos = videos.filter(v => selectedForCompare.includes(v.id));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {selectedForCompare.length === 2 && (
            <Button onClick={() => setShowCompare(true)}>
              Compare ({selectedForCompare.length})
            </Button>
          )}
          {selectedForCompare.length > 0 && selectedForCompare.length < 2 && (
            <Badge variant="secondary" className="self-center">
              Select {2 - selectedForCompare.length} more to compare
            </Badge>
          )}
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
          <Select value={clubTypeFilter} onValueChange={setClubTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Club Type" />
            </SelectTrigger>
            <SelectContent>
              {CLUB_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Context" />
            </SelectTrigger>
            <SelectContent>
              {CONTEXTS.map((ctx) => (
                <SelectItem key={ctx.value} value={ctx.value}>
                  {ctx.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Video Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <SwingVideoCard
              key={video.id}
              video={video}
              isSelected={selectedForCompare.includes(video.id)}
              onSelect={(selected) => handleSelectForCompare(video.id, selected)}
              onClick={() => setSelectedVideo(video)}
              canSelect={selectedForCompare.length < 2 || selectedForCompare.includes(video.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {videos.length === 0 ? (
            <>
              <p>No swing videos uploaded yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First Video
              </Button>
            </>
          ) : (
            <p>No videos match your filters</p>
          )}
        </div>
      )}

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
          isCoach={isCoach}
          onUpdate={fetchVideos}
          onDelete={() => {
            setSelectedVideo(null);
            fetchVideos();
          }}
        />
      )}

      {/* Compare View */}
      {showCompare && compareVideos.length === 2 && (
        <SwingVideoCompare
          videos={compareVideos}
          open={showCompare}
          onOpenChange={setShowCompare}
        />
      )}
    </div>
  );
};

export default VideosTab;
