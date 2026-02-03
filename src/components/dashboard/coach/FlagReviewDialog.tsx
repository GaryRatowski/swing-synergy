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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  MessageSquare,
  RefreshCw,
  ClipboardList,
  Calendar,
  User,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface ExerciseFlag {
  id: string;
  client_id: string;
  exercise_log_id: string | null;
  exercise_id: string | null;
  flag_type: string;
  description: string;
  flagged_date: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  coach_response: string | null;
  created_at: string;
  client?: {
    full_name: string;
  };
  exercise?: {
    name: string;
  };
}

interface FlagReviewDialogProps {
  flag: ExerciseFlag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const FlagReviewDialog = ({
  flag,
  open,
  onOpenChange,
  onUpdate,
}: FlagReviewDialogProps) => {
  const { profile } = useAuth();
  const [coachResponse, setCoachResponse] = useState(flag.coach_response || "");
  const [isSaving, setIsSaving] = useState(false);

  const getFlagTypeBadge = (type: string) => {
    const variants: Record<string, { variant: "destructive" | "secondary" | "outline" | "default"; label: string }> = {
      pain: { variant: "destructive", label: "Pain" },
      discomfort: { variant: "default", label: "Discomfort" },
      fatigue: { variant: "secondary", label: "Too Difficult" },
      other: { variant: "outline", label: "Other" },
    };
    return variants[type] || variants.other;
  };

  const handleMarkReviewed = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("exercise_flags")
        .update({
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          coach_response: coachResponse || null,
        })
        .eq("id", flag.id);

      if (error) throw error;

      toast({
        title: "Flag Reviewed",
        description: "The issue has been marked as reviewed.",
      });

      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating flag:", error);
      toast({
        title: "Error",
        description: "Failed to update flag. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwapExercise = () => {
    toast({
      title: "Coming Soon",
      description: "Exercise swap functionality will be available soon.",
    });
  };

  const handleNeedsAssessment = () => {
    toast({
      title: "Coming Soon",
      description: "Assessment task creation will be available soon.",
    });
  };

  const badgeInfo = getFlagTypeBadge(flag.flag_type);
  const isReviewed = !!flag.reviewed_by;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Review Flagged Exercise
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Flag Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{flag.client?.full_name || "Unknown Client"}</span>
              </div>
              <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Reported on {format(parseISO(flag.flagged_date), "MMMM d, yyyy")}</span>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Exercise</p>
              <p className="text-foreground">{flag.exercise?.name || "Unknown Exercise"}</p>
            </div>
          </div>

          <Separator />

          {/* Client Description */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Client's Description
            </p>
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {flag.description}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {isReviewed && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Reviewed on {format(parseISO(flag.reviewed_at!), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          )}

          <Separator />

          {/* Coach Response */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Coach Response / Action Plan
            </label>
            <Textarea
              placeholder="Provide your assessment and recommended action (e.g., modify weight, substitute exercise, schedule follow-up)..."
              value={coachResponse}
              onChange={(e) => setCoachResponse(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This response will be visible to the client
            </p>
          </div>

          {/* Quick Actions */}
          {!isReviewed && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwapExercise}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Swap Exercise
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNeedsAssessment}
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                Schedule Assessment
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isReviewed ? (
            <Button onClick={handleMarkReviewed} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Reviewed
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleMarkReviewed} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Response"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FlagReviewDialog;
