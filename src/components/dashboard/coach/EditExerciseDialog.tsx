import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseCategory = Database["public"]["Enums"]["exercise_category"];
type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];

interface EditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onExerciseUpdated: () => void;
}

const exerciseCategories: { value: ExerciseCategory; label: string }[] = [
  { value: "power", label: "Power" },
  { value: "strength", label: "Strength" },
  { value: "mobility", label: "Mobility" },
  { value: "plyometric", label: "Plyometric" },
  { value: "speed", label: "Speed" },
  { value: "stability", label: "Stability" },
  { value: "rotation", label: "Rotation" },
  { value: "recovery", label: "Recovery" },
];

const difficultyLevels: { value: DifficultyLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const EditExerciseDialog = ({ open, onOpenChange, exercise, onExerciseUpdated }: EditExerciseDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    body_part: "",
    description: "",
    difficulty: "intermediate" as DifficultyLevel,
    equipment_needed: "",
    exercise_type: "strength" as ExerciseCategory,
    video_url: "",
    coaching_cues: "",
  });

  useEffect(() => {
    if (exercise) {
      setFormData({
        name: exercise.name || "",
        body_part: exercise.body_part || "",
        description: exercise.description || "",
        difficulty: exercise.difficulty || "intermediate",
        equipment_needed: exercise.equipment_needed || "",
        exercise_type: exercise.exercise_type || "strength",
        video_url: exercise.video_url || "",
        coaching_cues: exercise.coaching_cues || "",
      });
    }
  }, [exercise]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exercise) return;
    
    if (!formData.name.trim()) {
      toast.error("Exercise name is required");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("exercises")
      .update({
        name: formData.name.trim(),
        body_part: formData.body_part.trim() || null,
        description: formData.description.trim() || null,
        difficulty: formData.difficulty,
        equipment_needed: formData.equipment_needed.trim() || null,
        exercise_type: formData.exercise_type,
        video_url: formData.video_url.trim() || null,
        coaching_cues: formData.coaching_cues.trim() || null,
      })
      .eq("id", exercise.id);

    setIsSubmitting(false);

    if (error) {
      console.error("Error updating exercise:", error);
      toast.error("Failed to update exercise");
      return;
    }

    toast.success("Exercise updated successfully");
    onOpenChange(false);
    onExerciseUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            Update the exercise details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Exercise Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Kettlebell Swing"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-exercise_type">Category</Label>
              <Select
                value={formData.exercise_type}
                onValueChange={(value: ExerciseCategory) => 
                  setFormData({ ...formData, exercise_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exerciseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: DifficultyLevel) => 
                  setFormData({ ...formData, difficulty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-body_part">Body Part</Label>
              <Input
                id="edit-body_part"
                value={formData.body_part}
                onChange={(e) => setFormData({ ...formData, body_part: e.target.value })}
                placeholder="e.g., Core, Legs, Glutes"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-equipment">Equipment Needed</Label>
              <Input
                id="edit-equipment"
                value={formData.equipment_needed}
                onChange={(e) => setFormData({ ...formData, equipment_needed: e.target.value })}
                placeholder="e.g., Kettlebell, None"
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the exercise..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-coaching_cues">Coaching Cues</Label>
            <Textarea
              id="edit-coaching_cues"
              value={formData.coaching_cues}
              onChange={(e) => setFormData({ ...formData, coaching_cues: e.target.value })}
              placeholder="Key points for proper form..."
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-video_url">Video URL (optional)</Label>
            <Input
              id="edit-video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://..."
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditExerciseDialog;
