import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronLeft, ChevronRight, Camera, Video, Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";
import {
  calculateScores,
  evaluateCondition,
  getScoreInterpretation,
  type ConditionConfig,
  type ScoringFormula,
  type ScoringThresholds,
} from "@/lib/assessmentScoring";

interface ChecklistItem {
  name: string;
  type: "pass_fail" | "numeric" | "video" | "photo";
  instructions: string;
  unit?: string;
  condition?: ConditionConfig | null;
}

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  checklist_items: ChecklistItem[];
  scoring_formula?: ScoringFormula;
  scoring_thresholds?: ScoringThresholds;
}

interface RunAssessmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

const RunAssessmentWizard = ({ open, onOpenChange, clientId, clientName }: RunAssessmentWizardProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<{ type: string; url: string; name: string; itemName: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ["assessment-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_templates")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as unknown as AssessmentTemplate[];
    },
  });

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

  // Calculate visible items based on conditions
  const visibleItems = useMemo(() => {
    if (!selectedTemplate) return [];
    
    const itemNames = selectedTemplate.checklist_items.map((i) => i.name);
    
    return selectedTemplate.checklist_items.filter((item) => {
      return evaluateCondition(item.condition, results, itemNames);
    });
  }, [selectedTemplate, results]);

  const totalSteps = visibleItems.length + 1; // +1 for final notes
  const progress = selectedTemplate ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Calculate scores in real-time
  const calculatedScores = useMemo(() => {
    if (!selectedTemplate?.scoring_formula || Object.keys(selectedTemplate.scoring_formula).length === 0) {
      return {};
    }
    
    const itemNames = selectedTemplate.checklist_items.map((i) => i.name);
    return calculateScores(results, selectedTemplate.scoring_formula, itemNames);
  }, [selectedTemplate, results]);

  useEffect(() => {
    if (open) {
      setSelectedTemplateId("");
      setCurrentStep(0);
      setResults({});
      setAttachments([]);
      setNotes("");
    }
  }, [open]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !selectedTemplate) throw new Error("Missing data");

      const { error } = await supabase
        .from("assessment_logs")
        .insert({
          client_id: clientId,
          template_id: selectedTemplate.id,
          assessed_by: profile.id,
          results,
          attachments,
          notes: notes || null,
          calculated_scores: calculatedScores as unknown as any,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-logs", clientId] });
      toast.success("Assessment completed");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to save assessment");
      console.error(error);
    },
  });

  const handleFileUpload = async (file: File, itemName: string, type: "video" | "photo") => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${clientId}/${Date.now()}-${itemName.replace(/\s+/g, "-")}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("assessment-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setAttachments([
        ...attachments,
        {
          type,
          url: fileName,
          name: file.name,
          itemName,
        },
      ]);

      setResults({ ...results, [itemName]: fileName });
      toast.success("File uploaded");
    } catch (error) {
      toast.error("Failed to upload file");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const renderStepContent = () => {
    if (!selectedTemplate) {
      return (
        <div className="space-y-4">
          <Label>Select Assessment Template</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templates?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No templates available. Create one in the Assessment Templates section.
            </p>
          )}
        </div>
      );
    }

    // Final step: notes and scores
    if (currentStep >= visibleItems.length) {
      return (
        <div className="space-y-6">
          {/* Show calculated scores */}
          {Object.keys(calculatedScores).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Calculated Scores</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(calculatedScores).map(([key, value]) => {
                  const interpretation = getScoreInterpretation(
                    value,
                    selectedTemplate.scoring_thresholds
                  );
                  return (
                    <Card key={key}>
                      <CardContent className="p-3">
                        <p className="text-sm text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-bold">{value}</span>
                          <Badge variant={interpretation.variant}>
                            {interpretation.label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Final Notes</h3>
            <p className="text-muted-foreground text-sm">
              Add any additional observations or recommendations.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Overall observations, recommendations, areas to focus on..."
              rows={6}
            />
          </div>
        </div>
      );
    }

    const item = visibleItems[currentStep];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          {item.instructions && (
            <Card className="mt-3 bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{item.instructions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Label>Result</Label>
          {item.type === "pass_fail" && (
            <div className="flex gap-3">
              <Button
                type="button"
                variant={results[item.name] === "pass" ? "default" : "outline"}
                className={results[item.name] === "pass" ? "bg-primary text-primary-foreground" : ""}
                onClick={() => setResults({ ...results, [item.name]: "pass" })}
              >
                <Check className="h-4 w-4 mr-2" />
                Pass
              </Button>
              <Button
                type="button"
                variant={results[item.name] === "fail" ? "destructive" : "outline"}
                onClick={() => setResults({ ...results, [item.name]: "fail" })}
              >
                <X className="h-4 w-4 mr-2" />
                Fail
              </Button>
            </div>
          )}

          {item.type === "numeric" && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={results[item.name] || ""}
                onChange={(e) => setResults({ ...results, [item.name]: e.target.value })}
                placeholder="Enter value"
                className="max-w-[150px]"
              />
              {item.unit && <span className="text-muted-foreground">{item.unit}</span>}
            </div>
          )}

          {(item.type === "video" || item.type === "photo") && (
            <div className="space-y-3">
              <input
                type="file"
                accept={item.type === "video" ? "video/*" : "image/*"}
                capture={item.type === "photo" ? "environment" : undefined}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, item.name, item.type as "video" | "photo");
                }}
                className="hidden"
                id={`file-upload-${currentStep}`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(`file-upload-${currentStep}`)?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : item.type === "video" ? (
                  <Video className="h-4 w-4 mr-2" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {uploading ? "Uploading..." : `Upload ${item.type === "video" ? "Video" : "Photo"}`}
              </Button>
              {results[item.name] && (
                <p className="text-sm text-primary flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  File uploaded
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selectedTemplate ? selectedTemplate.name : "Run Assessment"}
          </DialogTitle>
          <DialogDescription>
            Assessment for {clientName}
          </DialogDescription>
        </DialogHeader>

        {selectedTemplate && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          <div className="py-4">{renderStepContent()}</div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2">
          {selectedTemplate && currentStep > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          )}
          <div className="flex-1" />
          {!selectedTemplate && (
            <Button
              onClick={() => setCurrentStep(0)}
              disabled={!selectedTemplateId}
            >
              Start Assessment
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {selectedTemplate && currentStep < visibleItems.length && (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {selectedTemplate && currentStep === visibleItems.length && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Saving..." : "Complete Assessment"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RunAssessmentWizard;
