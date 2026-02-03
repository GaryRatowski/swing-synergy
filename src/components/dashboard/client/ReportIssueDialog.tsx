import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: string;
  exerciseName: string;
  exerciseLogId?: string;
  clientId: string;
  onReported: () => void;
}

const FLAG_TYPES = [
  { value: "pain", label: "Pain", description: "Sharp or acute pain during exercise" },
  { value: "discomfort", label: "Discomfort", description: "Unusual discomfort or tightness" },
  { value: "fatigue", label: "Too Difficult", description: "Exercise felt too challenging" },
  { value: "other", label: "Other", description: "Something else to report" },
];

const ReportIssueDialog = ({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  exerciseLogId,
  clientId,
  onReported,
}: ReportIssueDialogProps) => {
  const { profile } = useAuth();
  const [flagType, setFlagType] = useState("discomfort");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = description.trim().length >= 20;

  const handleSubmit = async () => {
    if (!isValid || !profile) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("exercise_flags").insert({
        client_id: clientId,
        exercise_log_id: exerciseLogId || null,
        exercise_id: exerciseId,
        flag_type: flagType,
        description: description.trim(),
        flagged_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast({
        title: "Issue Reported",
        description: "Your coach will review this and respond soon.",
      });

      setDescription("");
      setFlagType("discomfort");
      onOpenChange(false);
      onReported();
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast({
        title: "Error",
        description: "Failed to report issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Report Issue
          </DialogTitle>
          <DialogDescription>
            Report a problem with <span className="font-medium">{exerciseName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Flag Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What type of issue?</Label>
            <RadioGroup value={flagType} onValueChange={setFlagType}>
              {FLAG_TYPES.map((type) => (
                <div key={type.value} className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={type.value} className="font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Describe what you felt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Please describe the issue in detail (e.g., where you felt pain, when it started, how intense it was)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={description.length > 0 && description.length < 20 ? "border-warning" : ""}
            />
            <div className="flex justify-between text-xs">
              <span className={description.length < 20 ? "text-warning" : "text-muted-foreground"}>
                {description.length < 20 ? `At least ${20 - description.length} more characters needed` : "✓ Description complete"}
              </span>
              <span className="text-muted-foreground">{description.length} characters</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Report Issue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueDialog;
