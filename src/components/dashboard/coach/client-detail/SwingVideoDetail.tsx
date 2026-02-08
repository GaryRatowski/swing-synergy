import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { Pencil, Trash2, Calendar as CalendarIcon, X, Save, Loader2 } from "lucide-react";
import VideoPlayer from "@/components/video/VideoPlayer";
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

interface SwingVideoDetailProps {
  video: SwingVideo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCoach: boolean;
  onUpdate: () => void;
  onDelete: () => void;
}

const CLUB_TYPES = [
  { value: "driver", label: "Driver" },
  { value: "iron", label: "Iron" },
  { value: "wedge", label: "Wedge" },
  { value: "putter", label: "Putter" },
  { value: "other", label: "Other" },
];

const CONTEXTS = [
  { value: "assessment", label: "Assessment" },
  { value: "practice", label: "Practice" },
  { value: "competition", label: "Competition" },
  { value: "post-drill", label: "Post-Drill" },
];

const SwingVideoDetail = ({
  video,
  open,
  onOpenChange,
  isCoach,
  onUpdate,
  onDelete,
}: SwingVideoDetailProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [recordedDate, setRecordedDate] = useState<Date>(parseISO(video.recorded_date));
  const [clubType, setClubType] = useState(video.club_type);
  const [context, setContext] = useState(video.context);
  const [notes, setNotes] = useState(video.notes || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("swing_videos")
        .update({
          recorded_date: format(recordedDate, "yyyy-MM-dd"),
          club_type: clubType,
          context: context,
          notes: notes || null,
        })
        .eq("id", video.id);

      if (error) throw error;

      toast({
        title: "Video Updated",
        description: "Video details have been updated.",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update video details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Extract file path from URL
      const urlParts = video.video_url.split("/swing-videos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        // Delete from storage
        await supabase.storage.from("swing-videos").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("swing_videos")
        .delete()
        .eq("id", video.id);

      if (error) throw error;

      toast({
        title: "Video Deleted",
        description: "Swing video has been deleted.",
      });

      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDelete();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete video.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelEdit = () => {
    setRecordedDate(parseISO(video.recorded_date));
    setClubType(video.club_type);
    setContext(video.context);
    setNotes(video.notes || "");
    setIsEditing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Swing Video</DialogTitle>
              {isCoach && !isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Video Player with Advanced Controls */}
            <VideoPlayer
              src={video.video_url}
              className="aspect-video"
            />

            {/* Metadata */}
            {isEditing ? (
              <div className="space-y-4">
                {/* Recorded Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recorded Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(recordedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={recordedDate}
                        onSelect={(date) => date && setRecordedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Club Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Club Type</label>
                  <Select value={clubType} onValueChange={setClubType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLUB_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Context */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Context</label>
                  <Select value={context} onValueChange={setContext}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXTS.map((ctx) => (
                        <SelectItem key={ctx.value} value={ctx.value}>
                          {ctx.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" className="capitalize">
                    {video.club_type}
                  </Badge>
                  <Badge variant="secondary">
                    {CONTEXTS.find(c => c.value === video.context)?.label || video.context}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Recorded</p>
                    <p className="font-medium">
                      {format(parseISO(video.recorded_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uploaded</p>
                    <p className="font-medium">
                      {format(parseISO(video.created_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {video.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {video.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Swing Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The video will be permanently deleted
              from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SwingVideoDetail;
