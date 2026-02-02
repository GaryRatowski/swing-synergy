import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, Download, Trash2, File } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocumentsTabProps {
  clientId: string;
}

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "assessment", label: "Assessment" },
  { value: "form", label: "Form" },
  { value: "report", label: "Report" },
  { value: "program", label: "Program" },
  { value: "general", label: "General" },
];

const DocumentsTab = ({ clientId }: DocumentsTabProps) => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ category: "general", notes: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("client_documents")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
    } else {
      setDocuments(data || []);
    }
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile?.id) return;

    setIsUploading(true);
    const timestamp = Date.now();
    const filePath = `${clientId}/${timestamp}_${selectedFile.name}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(filePath, selectedFile);

    if (uploadError) {
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
      setIsUploading(false);
      return;
    }

    // Save metadata
    const { error: dbError } = await supabase.from("client_documents").insert({
      client_id: clientId,
      uploaded_by: profile.id,
      name: selectedFile.name,
      file_path: filePath,
      file_type: selectedFile.type,
      file_size: selectedFile.size,
      category: uploadData.category,
      notes: uploadData.notes || null,
    });

    if (dbError) {
      toast({ title: "Error", description: "Failed to save document info", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Document uploaded successfully" });
      setSelectedFile(null);
      setUploadData({ category: "general", notes: "" });
      setIsDialogOpen(false);
      fetchDocuments();
    }
    setIsUploading(false);
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .download(doc.file_path);

    if (error) {
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: Document) => {
    // Delete from storage
    await supabase.storage.from("client-documents").remove([doc.file_path]);
    
    // Delete from database
    const { error } = await supabase.from("client_documents").delete().eq("id", doc.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Document deleted" });
      fetchDocuments();
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "assessment": return "default";
      case "form": return "secondary";
      case "report": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-1" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>File</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <File className="h-5 w-5 text-primary" />
                      <span className="text-sm">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to select a file</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={uploadData.category} 
                  onValueChange={(v) => setUploadData({ ...uploadData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  value={uploadData.notes}
                  onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                  placeholder="Add notes about this document..."
                />
              </div>
              <Button 
                onClick={handleUpload} 
                className="w-full" 
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <Card key={doc.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary/60" />
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getCategoryColor(doc.category) as any}>
                      {doc.category}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {doc.notes && (
                  <p className="text-xs text-muted-foreground mt-2 pl-11">{doc.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;
