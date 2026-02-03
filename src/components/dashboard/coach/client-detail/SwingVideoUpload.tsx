import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Upload, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SwingVideoUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onUploadComplete: () => void;
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

const SwingVideoUpload = ({
  open,
  onOpenChange,
  clientId,
  onUploadComplete,
}: SwingVideoUploadProps) => {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [recordedDate, setRecordedDate] = useState<Date>(new Date());
  const [clubType, setClubType] = useState("driver");
  const [context, setContext] = useState("practice");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (100MB limit)
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 100MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !profile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("swing-videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("swing-videos")
        .getPublicUrl(filePath);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from("swing_videos")
        .insert({
          client_id: clientId,
          uploaded_by: profile.id,
          video_url: urlData.publicUrl,
          recorded_date: format(recordedDate, "yyyy-MM-dd"),
          club_type: clubType,
          context: context,
          notes: notes || null,
        });

      if (dbError) throw dbError;

      toast({
        title: "Video Uploaded",
        description: "Swing video has been uploaded successfully.",
      });

      // Reset form
      setFile(null);
      setRecordedDate(new Date());
      setClubType("driver");
      setContext("practice");
      setNotes("");
      onOpenChange(false);
      onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Swing Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Video File</label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              {file ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to select video or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4, MOV, WebM up to 100MB
                  </p>
                  <Input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

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
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Add notes about this swing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwingVideoUpload;
