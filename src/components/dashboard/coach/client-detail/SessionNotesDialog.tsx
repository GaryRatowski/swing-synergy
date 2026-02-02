import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Clock, Dumbbell, Save, Target, TrendingUp, AlertCircle, Zap, Trash2 } from "lucide-react";

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

const FOCUS_AREAS = [
  { id: "power", label: "Power Development" },
  { id: "mobility", label: "Mobility & Flexibility" },
  { id: "strength", label: "Strength Training" },
  { id: "stability", label: "Core Stability" },
  { id: "rotation", label: "Rotational Power" },
  { id: "speed", label: "Speed Training" },
  { id: "recovery", label: "Recovery & Regeneration" },
  { id: "technique", label: "Swing Technique" },
];

const SESSION_TYPES = [
  { value: "training", label: "Training Session" },
  { value: "assessment", label: "Assessment" },
  { value: "lesson", label: "Golf Lesson" },
  { value: "warmup", label: "Warm-up / Activation" },
  { value: "recovery", label: "Recovery Session" },
  { value: "competition", label: "Competition Prep" },
];

interface StructuredNotes {
  sessionType: string;
  focusAreas: string[];
  clientEnergy: number;
  exerciseSummary: string;
  keyAchievements: string;
  areasToImprove: string;
  coachNotes: string;
}

const parseNotes = (notes: string | null): StructuredNotes => {
  if (!notes) {
    return {
      sessionType: "training",
      focusAreas: [],
      clientEnergy: 7,
      exerciseSummary: "",
      keyAchievements: "",
      areasToImprove: "",
      coachNotes: "",
    };
  }

  try {
    const parsed = JSON.parse(notes);
    return {
      sessionType: parsed.sessionType || "training",
      focusAreas: parsed.focusAreas || [],
      clientEnergy: parsed.clientEnergy || 7,
      exerciseSummary: parsed.exerciseSummary || "",
      keyAchievements: parsed.keyAchievements || "",
      areasToImprove: parsed.areasToImprove || "",
      coachNotes: parsed.coachNotes || notes,
    };
  } catch {
    // Legacy plain text notes
    return {
      sessionType: "training",
      focusAreas: [],
      clientEnergy: 7,
      exerciseSummary: "",
      keyAchievements: "",
      areasToImprove: "",
      coachNotes: notes,
    };
  }
};

const SessionNotesDialog = ({ workout, open, onOpenChange, onNotesUpdated }: SessionNotesDialogProps) => {
  const [structuredNotes, setStructuredNotes] = useState<StructuredNotes>(parseNotes(null));
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<number>(60);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (workout) {
      setStructuredNotes(parseNotes(workout.notes));
      setRpe(workout.overall_rpe || 5);
      setDuration(workout.duration_minutes || 60);
    }
  }, [workout]);

  if (!workout) return null;

  const updateField = <K extends keyof StructuredNotes>(field: K, value: StructuredNotes[K]) => {
    setStructuredNotes(prev => ({ ...prev, [field]: value }));
  };

  const toggleFocusArea = (areaId: string) => {
    setStructuredNotes(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(areaId)
        ? prev.focusAreas.filter(id => id !== areaId)
        : [...prev.focusAreas, areaId],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const notesJson = JSON.stringify(structuredNotes);
    
    const { error } = await supabase
      .from("workout_logs")
      .update({ 
        notes: notesJson,
        overall_rpe: rpe,
        duration_minutes: duration,
        completed_at: workout.completed_at || new Date().toISOString(),
      })
      .eq("id", workout.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save session notes", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Session notes saved successfully" });
      onNotesUpdated();
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("id", workout.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Session deleted successfully" });
      onNotesUpdated();
      onOpenChange(false);
    }
    setIsDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              Session Notes - {workout.workout_date 
                ? format(new Date(workout.workout_date), "MMMM d, yyyy")
                : "Unknown Date"}
            </DialogTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Session</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this session? This action cannot be undone.
                    All notes and data for this session will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete Session"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Session Status */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={workout.completed_at ? "default" : "outline"}>
              {workout.completed_at ? "Completed" : "Pending"}
            </Badge>
          </div>

          {/* Session Type & Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Session Type</Label>
              <Select 
                value={structuredNotes.sessionType} 
                onValueChange={(v) => updateField("sessionType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                min={0}
                max={300}
              />
            </div>
          </div>

          {/* RPE & Client Energy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Session RPE: {rpe}/10
              </Label>
              <Slider
                value={[rpe]}
                onValueChange={([v]) => setRpe(v)}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Client Energy: {structuredNotes.clientEnergy}/10
              </Label>
              <Slider
                value={[structuredNotes.clientEnergy]}
                onValueChange={([v]) => updateField("clientEnergy", v)}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
            </div>
          </div>

          {/* Focus Areas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Focus Areas
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map(area => (
                <div key={area.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={area.id}
                    checked={structuredNotes.focusAreas.includes(area.id)}
                    onCheckedChange={() => toggleFocusArea(area.id)}
                  />
                  <label
                    htmlFor={area.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {area.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Summary */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Exercise Summary
            </Label>
            <Textarea
              value={structuredNotes.exerciseSummary}
              onChange={(e) => updateField("exerciseSummary", e.target.value)}
              placeholder="List the main exercises performed (e.g., Med ball rotations 3x10, Hip mobility drills, Band pull-aparts...)"
              className="min-h-20"
            />
          </div>

          {/* Key Achievements */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Key Achievements
            </Label>
            <Textarea
              value={structuredNotes.keyAchievements}
              onChange={(e) => updateField("keyAchievements", e.target.value)}
              placeholder="What went well? Any PRs, breakthroughs, or improvements noted?"
              className="min-h-16"
            />
          </div>

          {/* Areas to Improve */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Areas to Improve
            </Label>
            <Textarea
              value={structuredNotes.areasToImprove}
              onChange={(e) => updateField("areasToImprove", e.target.value)}
              placeholder="What needs work? Any limitations, pain points, or technique issues?"
              className="min-h-16"
            />
          </div>

          {/* Additional Coach Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={structuredNotes.coachNotes}
              onChange={(e) => updateField("coachNotes", e.target.value)}
              placeholder="Any other observations, recommendations, or follow-up items..."
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              These notes are visible to you and the client.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Session Notes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionNotesDialog;
