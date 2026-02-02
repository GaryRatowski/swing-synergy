import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Save, Link2 } from "lucide-react";
import ExercisePicker from "./ExercisePicker";
import ProgramExerciseRow from "./program-detail/ProgramExerciseRow";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open && programId) {
      fetchProgramDetails();
      setSelectedExerciseIds(new Set());
    }
  }, [open, programId]);

  const fetchProgramDetails = async () => {
    setIsLoading(true);

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

    const { data: exercisesData, error: exercisesError } = await supabase
      .from("program_exercises")
      .select(`
        id,
        exercise_id,
        order_index,
        sets,
        reps,
        notes,
        superset_group,
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

  const handleAddExercise = async (exercise: Exercise) => {
    const nextOrderIndex = exercises.length;

    const { data, error } = await supabase
      .from("program_exercises")
      .insert({
        program_id: programId,
        exercise_id: exercise.id,
        order_index: nextOrderIndex,
        sets: 3,
        reps: "10",
      })
      .select(`
        id,
        exercise_id,
        order_index,
        sets,
        reps,
        notes,
        superset_group,
        exercises (
          id,
          name,
          body_part,
          exercise_type
        )
      `)
      .single();

    if (error) {
      console.error("Error adding exercise:", error);
      toast.error("Failed to add exercise");
      return;
    }

    const newExercise: ProgramExercise = {
      ...data,
      exercise: data.exercises as Exercise | null,
    };

    setExercises(prev => [...prev, newExercise]);
    toast.success(`Added ${exercise.name}`);
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
    setSelectedExerciseIds(prev => {
      const next = new Set(prev);
      next.delete(exerciseId);
      return next;
    });
    toast.success("Exercise removed");
  };

  const handleUpdateExercise = (id: string, updates: Partial<ProgramExercise>) => {
    setExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, ...updates } : ex)
    );
  };

  const handleSelectExercise = (id: string, selected: boolean) => {
    setSelectedExerciseIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleCreateSuperset = async () => {
    if (selectedExerciseIds.size < 2) {
      toast.error("Select at least 2 exercises to create a superset");
      return;
    }

    // Find the next available superset group letter
    const existingGroups = new Set(
      exercises
        .filter(ex => ex.superset_group)
        .map(ex => ex.superset_group!.charAt(0))
    );
    
    let nextLetter = "A";
    while (existingGroups.has(nextLetter) && nextLetter < "Z") {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
    }

    // Update all selected exercises with the new superset group
    const selectedIds = Array.from(selectedExerciseIds);
    
    const { error } = await supabase
      .from("program_exercises")
      .update({ superset_group: nextLetter })
      .in("id", selectedIds);

    if (error) {
      console.error("Error creating superset:", error);
      toast.error("Failed to create superset");
      return;
    }

    // Update local state
    setExercises(prev => 
      prev.map((ex, idx) => {
        if (selectedExerciseIds.has(ex.id)) {
          const indexInSuperset = selectedIds.indexOf(ex.id) + 1;
          return { ...ex, superset_group: nextLetter };
        }
        return ex;
      })
    );

    setSelectedExerciseIds(new Set());
    toast.success(`Created superset ${nextLetter}`);
  };

  const handleToggleSuperset = async (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const newSupersetGroup = exercise.superset_group ? null : undefined;
    
    if (exercise.superset_group) {
      // Remove from superset
      const { error } = await supabase
        .from("program_exercises")
        .update({ superset_group: null })
        .eq("id", exerciseId);

      if (error) {
        console.error("Error removing from superset:", error);
        toast.error("Failed to update");
        return;
      }

      setExercises(prev => 
        prev.map(ex => ex.id === exerciseId ? { ...ex, superset_group: null } : ex)
      );
      toast.success("Removed from superset");
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex((ex) => ex.id === active.id);
      const newIndex = exercises.findIndex((ex) => ex.id === over.id);

      const newExercises = arrayMove(exercises, oldIndex, newIndex);
      setExercises(newExercises);

      // Update order_index in database for all affected exercises
      const updates = newExercises.map((ex, index) => ({
        id: ex.id,
        order_index: index,
      }));

      // Batch update using Promise.all
      const updatePromises = updates.map(({ id, order_index }) =>
        supabase
          .from("program_exercises")
          .update({ order_index })
          .eq("id", id)
      );

      const results = await Promise.all(updatePromises);
      const hasError = results.some((r) => r.error);

      if (hasError) {
        console.error("Error updating exercise order");
        toast.error("Failed to save new order");
        // Refetch to restore correct order
        fetchProgramDetails();
      }
    }
  };

  // Calculate superset labels (A1, A2, B1, B2, etc.)
  const getSupersetLabel = (exercise: ProgramExercise): string | null => {
    if (!exercise.superset_group) return null;
    
    const group = exercise.superset_group;
    const exercisesInGroup = exercises.filter(ex => ex.superset_group === group);
    const indexInGroup = exercisesInGroup.findIndex(ex => ex.id === exercise.id) + 1;
    
    return `${group}${indexInGroup}`;
  };

  const existingExerciseIds = exercises
    .filter(ex => ex.exercise_id)
    .map(ex => ex.exercise_id!);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90svh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Program Details</DialogTitle>
          <DialogDescription>
            Edit program settings and manage exercises.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : program ? (
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="flex flex-col gap-6 pb-4">
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

              {/* Exercises Section */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">Exercises ({exercises.length})</h3>
                  <div className="flex items-center gap-2">
                    {selectedExerciseIds.size >= 2 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCreateSuperset}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Link as Superset ({selectedExerciseIds.size})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={showExercisePicker ? "secondary" : "outline"}
                      onClick={() => setShowExercisePicker(!showExercisePicker)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {showExercisePicker && (
                  <div className="mb-3">
                    <ExercisePicker
                      onAdd={handleAddExercise}
                      onClose={() => setShowExercisePicker(false)}
                      existingExerciseIds={existingExerciseIds}
                    />
                  </div>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="h-[300px] overflow-y-auto border rounded-lg p-2 space-y-2">
                    {exercises.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No exercises in this program yet. Click "Add" to get started.
                      </div>
                    ) : (
                      <SortableContext
                        items={exercises.map(ex => ex.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {exercises.map((ex, index) => (
                          <ProgramExerciseRow
                            key={ex.id}
                            exercise={ex}
                            index={index}
                            onRemove={handleRemoveExercise}
                            onUpdate={handleUpdateExercise}
                            supersetLabel={getSupersetLabel(ex)}
                            onToggleSuperset={handleToggleSuperset}
                            isSelected={selectedExerciseIds.has(ex.id)}
                            onSelect={handleSelectExercise}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </div>
                </DndContext>
              </div>
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
