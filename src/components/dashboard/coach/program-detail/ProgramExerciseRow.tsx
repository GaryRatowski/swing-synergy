import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  body_part: string | null;
  exercise_type: string | null;
}

interface ProgramExercise {
  id: string;
  exercise_id: string | null;
  order_index: number | null;
  sets: number | null;
  reps: string | null;
  notes: string | null;
  superset_group: string | null;
  exercise: Exercise | null;
}

interface ProgramExerciseRowProps {
  exercise: ProgramExercise;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ProgramExercise>) => void;
  supersetLabel: string | null;
  onToggleSuperset: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

const ProgramExerciseRow = ({
  exercise,
  index,
  onRemove,
  onUpdate,
  supersetLabel,
  onToggleSuperset,
  isSelected,
  onSelect,
}: ProgramExerciseRowProps) => {
  const [localSets, setLocalSets] = useState(exercise.sets?.toString() || "3");
  const [localReps, setLocalReps] = useState(exercise.reps || "10");
  const [localNotes, setLocalNotes] = useState(exercise.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when exercise prop changes
  useEffect(() => {
    setLocalSets(exercise.sets?.toString() || "3");
    setLocalReps(exercise.reps || "10");
    setLocalNotes(exercise.notes || "");
  }, [exercise.sets, exercise.reps, exercise.notes]);

  const saveChanges = useCallback(async (field: string, value: string | number) => {
    setIsSaving(true);
    const updates: Record<string, string | number | null> = {};
    
    if (field === "sets") {
      updates.sets = parseInt(value as string) || 1;
    } else if (field === "reps") {
      updates.reps = value as string;
    } else if (field === "notes") {
      updates.notes = (value as string) || null;
    }

    const { error } = await supabase
      .from("program_exercises")
      .update(updates)
      .eq("id", exercise.id);

    setIsSaving(false);

    if (error) {
      console.error("Error updating exercise:", error);
      toast.error("Failed to save changes");
    } else {
      onUpdate(exercise.id, updates as Partial<ProgramExercise>);
    }
  }, [exercise.id, onUpdate]);

  const getPhaseColor = (phase: string | null) => {
    switch (phase) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const hasSupersetGroup = !!exercise.superset_group;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg group transition-colors ${
        hasSupersetGroup 
          ? "bg-primary/5 border border-primary/20" 
          : "bg-muted/50"
      } ${isSelected ? "ring-2 ring-primary" : ""}`}
    >
      <div className="text-muted-foreground cursor-grab">
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div 
        className={`w-8 h-6 rounded text-xs font-medium flex items-center justify-center cursor-pointer ${
          hasSupersetGroup 
            ? "bg-primary text-primary-foreground" 
            : "bg-primary/10 text-primary"
        }`}
        onClick={() => onSelect(exercise.id, !isSelected)}
        title="Click to select for superset"
      >
        {supersetLabel || (index + 1)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {exercise.exercise?.name || "Unknown Exercise"}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {exercise.exercise?.body_part && (
            <span>{exercise.exercise.body_part}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            value={localSets}
            onChange={(e) => setLocalSets(e.target.value)}
            onBlur={() => saveChanges("sets", localSets)}
            className="w-12 h-7 text-xs text-center p-1"
          />
          <span className="text-xs text-muted-foreground">×</span>
          <Input
            type="text"
            value={localReps}
            onChange={(e) => setLocalReps(e.target.value)}
            onBlur={() => saveChanges("reps", localReps)}
            className="w-16 h-7 text-xs text-center p-1"
            placeholder="10"
          />
        </div>

        <Input
          type="text"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => saveChanges("notes", localNotes)}
          className="w-24 h-7 text-xs p-1"
          placeholder="Notes..."
        />

        {exercise.exercise?.exercise_type && (
          <Badge variant="outline" className={`text-xs ${getPhaseColor(exercise.exercise.exercise_type)}`}>
            {exercise.exercise.exercise_type}
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${hasSupersetGroup ? "text-primary" : "opacity-0 group-hover:opacity-100"}`}
          onClick={() => onToggleSuperset(exercise.id)}
          title={hasSupersetGroup ? "Remove from superset" : "Add to superset"}
        >
          {hasSupersetGroup ? <Unlink className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
          onClick={() => onRemove(exercise.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default ProgramExerciseRow;
