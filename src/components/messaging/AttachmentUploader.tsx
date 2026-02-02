import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Paperclip, X, Image as ImageIcon, FileText, File, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AttachmentUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function AttachmentUploader({
  onFileSelect,
  selectedFile,
  onClearFile,
  isUploading,
  uploadProgress,
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB",
      });
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Allowed: Images, PDF, TXT, DOC, DOCX",
      });
      return;
    }

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    onFileSelect(file);
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClearFile();
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type === "application/pdf") return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        disabled={isUploading}
      />

      {!selectedFile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      ) : (
        <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-lg max-w-[200px]">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            getFileIcon(selectedFile.type)
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{selectedFile.name}</p>
            {isUploading ? (
              <Progress value={uploadProgress} className="h-1 mt-1" />
            ) : (
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            )}
          </div>
          
          {!isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Image preview */}
      {previewUrl && !isUploading && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-10 w-10 rounded object-cover"
          />
        </div>
      )}
    </div>
  );
}
