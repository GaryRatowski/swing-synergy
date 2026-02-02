import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Loader2,
  File,
  X
} from "lucide-react";
import { useMessageAttachments, MessageAttachment as AttachmentType } from "@/hooks/useMessageAttachments";

interface MessageAttachmentProps {
  attachment: AttachmentType;
  isOwn: boolean;
}

export function MessageAttachment({ attachment, isOwn }: MessageAttachmentProps) {
  const { getSignedUrl } = useMessageAttachments();
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isImage = attachment.file_type?.startsWith("image/");
  const isPdf = attachment.file_type === "application/pdf";

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsDownloading(true);
    try {
      const url = await getSignedUrl(attachment.file_path);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const loadPreview = async () => {
    if (previewUrl || isLoadingPreview) return;
    setIsLoadingPreview(true);
    try {
      const url = await getSignedUrl(attachment.file_path);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Failed to load preview:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Load image preview automatically
  if (isImage && !previewUrl && !isLoadingPreview) {
    loadPreview();
  }

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-4 w-4" />;
    if (isPdf) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <>
      <div className={`mt-2 ${isOwn ? "text-primary-foreground" : "text-foreground"}`}>
        {isImage && previewUrl ? (
          <div className="relative group">
            <img
              src={previewUrl}
              alt={attachment.file_name}
              className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
            </Button>
          </div>
        ) : isImage && isLoadingPreview ? (
          <div className="w-[200px] h-[150px] rounded-lg bg-muted/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <button
            onClick={() => handleDownload()}
            disabled={isDownloading}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              isOwn
                ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              getFileIcon()
            )}
            <div className="text-left">
              <p className="text-xs font-medium truncate max-w-[150px]">
                {attachment.file_name}
              </p>
              <p className={`text-[10px] ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {formatFileSize(attachment.file_size)}
              </p>
            </div>
            <Download className="h-3 w-3 ml-1" />
          </button>
        )}
      </div>

      {/* Image Lightbox Dialog */}
      {isImage && previewUrl && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
            <DialogTitle className="sr-only">{attachment.file_name}</DialogTitle>
            <div className="relative flex items-center justify-center w-full h-full min-h-[300px]">
              <img
                src={previewUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-[85vh] object-contain"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="absolute bottom-4 left-4 text-white/70 text-sm">
                {attachment.file_name}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
