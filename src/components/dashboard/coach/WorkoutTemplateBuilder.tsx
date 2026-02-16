import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Loader2, Dumbbell } from "lucide-react";
import ExercisePicker from "./ExercisePicker";
import type { WorkoutTemplate, WorkoutTemplateExercise } from "@/hooks/useWorkoutTemplates";

interface ExerciseRow {
  tempId: string;
  exercise_id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  tempo: string;
  notes: string;
  superset_group: string;
  body_part?: string | null;
  exercise_type?: string | null;
}

interface WorkoutTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    name: string,
    description: string | null,
    category: string,
    exercises: Omit<WorkoutTemplateExercise, "id" | "name">[]
  ) => Promise<void>;
  editingTemplate?: WorkoutTemplate | null;
  isSaving?: boolean;
}

const CATEGORIES = ["general", "upper_body", "lower_body", "full_body", "power", "mobility", "recovery", "speed"];

const WorkoutTemplateBuilder = ({
  open,
  onOpenChange,
  onSave,
  editingTemplate,
  isSaving,
}: WorkoutTemplateBuilderProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description || "");
      setCategory(editingTemplate.category || "general");
      setExercises(
        editingTemplate.exercises.map((ex, i) => ({
          tempId: `existing-${i}`,
          exercise_id: ex.exercise_id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo || "",
          notes: ex.notes || "",
          superset_group: ex.superset_group || "",
          body_part: ex.body_part,
          exercise_type: ex.exercise_type,
        }))
      );
    } else {
      setName("");
      setDescription("");
      setCategory("general");
      setExercises([]);
    }
  }, [editingTemplate, open]);

  const handleAddExercise = (exercise: { id: string; name: string; body_part: string | null; exercise_type: string | null }) => {
    setExercises((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}`,
        exercise_id: exercise.id,
        name: exercise.name,
        sets: 3,
        reps: "10",
        rest_seconds: 60,
        tempo: "",
        notes: "",
        superset_group: "",
        body_part: exercise.body_part,
        exercise_type: exercise.exercise_type,
      },
    ]);
  };

  const handleUpdateExercise = (tempId: string, field: keyof ExerciseRow, value: string | number) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.tempId === tempId ? { ...ex, [field]: value } : ex))
    );
  };

  const handleRemoveExercise = (tempId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.tempId !== tempId));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(
      name.trim(),
      description.trim() || null,
      category,
      exercises.map((ex, i) => ({
        exercise_id: ex.exercise_id,
        order_index: i,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        tempo: ex.tempo || null,
        notes: ex.notes || null,
        superset_group: ex.superset_group || null,
      }))
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTemplate ? "Edit Workout Template" : "Create Workout Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Upper Body Power Day" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this workout" rows={2} />
          </div>

          {/* Exercise list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exercises ({exercises.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPicker(!showPicker)}>
                <Plus className="h-4 w-4 mr-1" /> Add Exercise
              </Button>
            </div>

            {showPicker && (
              <ExercisePicker
                onAdd={handleAddExercise}
                onClose={() => setShowPicker(false)}
                existingExerciseIds={exercises.map((e) => e.exercise_id)}
              />
            )}

            {exercises.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No exercises added yet. Click "Add Exercise" above.
              </div>
            ) : (
              <div className="space-y-2">
                {exercises.map((ex) => (
                  <div key={ex.tempId} className="flex items-start gap-2 p-3 border rounded-lg bg-card">
                    <GripVertical className="h-4 w-4 mt-2 text-muted-foreground/50 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{ex.name}</span>
                        {ex.exercise_type && (
                          <Badge variant="outline" className="text-[10px] shrink-0">{ex.exercise_type}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Sets</Label>
                          <Input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => handleUpdateExercise(ex.tempId, "sets", parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Reps</Label>
                          <Input
                            value={ex.reps}
                            onChange={(e) => handleUpdateExercise(ex.tempId, "reps", e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Rest (s)</Label>
                          <Input
                            type="number"
                            value={ex.rest_seconds}
                            onChange={(e) => handleUpdateExercise(ex.tempId, "rest_seconds", parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Superset</Label>
                          <Input
                            value={ex.superset_group}
                            onChange={(e) => handleUpdateExercise(ex.tempId, "superset_group", e.target.value)}
                            placeholder="A1"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Input
                        value={ex.notes}
                        onChange={(e) => handleUpdateExercise(ex.tempId, "notes", e.target.value)}
                        placeholder="Notes (optional)"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveExercise(ex.tempId)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutTemplateBuilder;
