import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Clock, Dumbbell, Save } from "lucide-react";

interface WorkoutLog {
  id: string;
  workout_date: string | null;
  notes: string | null;
  overall_rpe: number | null;
  duration_minutes: number | null;
  completed_at: string | null;
}

interface SessionNotesDialogProps {
  workout: WorkoutLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotesUpdated: () => void;
}

const SessionNotesDialog = ({ workout, open, onOpenChange, onNotesUpdated }: SessionNotesDialogProps) => {
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (workout) {
      setNotes(workout.notes || "");
    }
  }, [workout]);

  if (!workout) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("workout_logs")
      .update({ notes })
      .eq("id", workout.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Notes saved successfully" });
      onNotesUpdated();
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Session Notes - {workout.workout_date 
              ? format(new Date(workout.workout_date), "MMMM d, yyyy")
              : "Unknown Date"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Session Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={workout.completed_at ? "default" : "outline"}>
              {workout.completed_at ? "Completed" : "Pending"}
            </Badge>
            {workout.overall_rpe && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                RPE {workout.overall_rpe}
              </Badge>
            )}
            {workout.duration_minutes && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {workout.duration_minutes} minutes
              </Badge>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Coach Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this training session..."
              className="mt-1.5 min-h-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              These notes are visible to you and the client.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionNotesDialog;
