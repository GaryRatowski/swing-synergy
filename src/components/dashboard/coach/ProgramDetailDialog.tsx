import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, GripVertical, Trash2, Plus, Save } from "lucide-react";

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
  exercise: Exercise | null;
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  training_phase: string | null;
  duration_weeks: number | null;
  session_type: string | null;
}

interface ProgramDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  onUpdated: () => void;
}

const ProgramDetailDialog = ({ 
  open, 
  onOpenChange, 
  programId,
  onUpdated 
}: ProgramDetailDialogProps) => {
  const [program, setProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedProgram, setEditedProgram] = useState<Partial<Program>>({});

  useEffect(() => {
    if (open && programId) {
      fetchProgramDetails();
    }
  }, [open, programId]);

  const fetchProgramDetails = async () => {
    setIsLoading(true);

    // Fetch program details
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .single();

    if (programError) {
      console.error("Error fetching program:", programError);
      setIsLoading(false);
      return;
    }

    setProgram(programData);
    setEditedProgram(programData);

    // Fetch program exercises with exercise details
    const { data: exercisesData, error: exercisesError } = await supabase
      .from("program_exercises")
      .select(`
        id,
        exercise_id,
        order_index,
        sets,
        reps,
        notes,
        exercises (
          id,
          name,
          body_part,
          exercise_type
        )
      `)
      .eq("program_id", programId)
      .order("order_index");

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
    } else {
      const formattedExercises = (exercisesData || []).map(ex => ({
        ...ex,
        exercise: ex.exercises as Exercise | null,
      }));
      setExercises(formattedExercises);
    }

    setIsLoading(false);
  };

  const handleSaveProgram = async () => {
    if (!program) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("programs")
      .update({
        name: editedProgram.name,
        description: editedProgram.description,
        training_phase: editedProgram.training_phase,
        duration_weeks: editedProgram.duration_weeks,
        session_type: editedProgram.session_type,
      })
      .eq("id", programId);

    setIsSaving(false);

    if (error) {
      console.error("Error updating program:", error);
      toast.error("Failed to save program");
      return;
    }

    toast.success("Program saved successfully");
    onUpdated();
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    const { error } = await supabase
      .from("program_exercises")
      .delete()
      .eq("id", exerciseId);

    if (error) {
      console.error("Error removing exercise:", error);
      toast.error("Failed to remove exercise");
      return;
    }

    setExercises(prev => prev.filter(e => e.id !== exerciseId));
    toast.success("Exercise removed");
  };

  const getPhaseColor = (phase: string | null) => {
    switch (phase) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-100 text-blue-700 border-blue-200";
      case "maintenance": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Program Details</DialogTitle>
          <DialogDescription>
            View and edit program settings and exercises.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : program ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-6">
            {/* Program Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Program Name</Label>
                <Input
                  id="name"
                  value={editedProgram.name || ""}
                  onChange={(e) => setEditedProgram(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedProgram.description || ""}
                  onChange={(e) => setEditedProgram(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase">Training Phase</Label>
                <Select
                  value={editedProgram.training_phase || ""}
                  onValueChange={(value) => setEditedProgram(prev => ({ ...prev, training_phase: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="mobility">Mobility</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_type">Session Type</Label>
                <Select
                  value={editedProgram.session_type || ""}
                  onValueChange={(value) => setEditedProgram(prev => ({ ...prev, session_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gym">Gym</SelectItem>
                    <SelectItem value="at-home">At Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (weeks)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={editedProgram.duration_weeks || 1}
                  onChange={(e) => setEditedProgram(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleSaveProgram} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Exercises List */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Exercises ({exercises.length})</h3>
              </div>

              <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {exercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No exercises in this program yet.
                    </div>
                  ) : (
                    exercises.map((ex, index) => (
                      <div
                        key={ex.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                      >
                        <div className="text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ex.exercise?.name || "Unknown Exercise"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{ex.sets || 1} sets × {ex.reps || "10"}</span>
                            {ex.exercise?.body_part && (
                              <>
                                <span>•</span>
                                <span>{ex.exercise.body_part}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {ex.exercise?.exercise_type && (
                          <Badge variant="outline" className={getPhaseColor(ex.exercise.exercise_type)}>
                            {ex.exercise.exercise_type}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveExercise(ex.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Program not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProgramDetailDialog;
