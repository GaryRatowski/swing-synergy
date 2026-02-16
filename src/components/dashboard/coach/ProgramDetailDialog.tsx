import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Save, Copy, LayoutGrid, List, Link2, PanelLeft } from "lucide-react";
import ExercisePicker from "./ExercisePicker";
import DuplicateProgramDialog from "./DuplicateProgramDialog";
import ProgramExerciseRow from "./program-detail/ProgramExerciseRow";
import WeekDaySelector from "./program-detail/WeekDaySelector";
import ProgramOverview from "./program-detail/ProgramOverview";
import CopyDayDialog from "./program-detail/CopyDayDialog";
import CopyWeekDialog from "./program-detail/CopyWeekDialog";
import ProgramScheduleTree from "./program-detail/ProgramScheduleTree";
import CheckinTemplateSection from "./program-detail/CheckinTemplateSection";
import { useAuth } from "@/hooks/useAuth";
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
  week_number: number | null;
  day_number: number | null;
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
  const { profile } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedProgram, setEditedProgram] = useState<Partial<Program>>({});
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  
  // Week/Day state
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [viewMode, setViewMode] = useState<"schedule" | "overview">("schedule");
  const [showCopyDayDialog, setShowCopyDayDialog] = useState(false);
  const [showCopyWeekDialog, setShowCopyWeekDialog] = useState(false);
  const [copyWeekSource, setCopyWeekSource] = useState(1);
  const [showScheduleTree, setShowScheduleTree] = useState(true);

  const totalWeeks = editedProgram.duration_weeks || 4;

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
      setSelectedWeek(1);
      setSelectedDay(1);
    }
  }, [open, programId]);

  // Filter exercises for current week/day
  const currentDayExercises = useMemo(() => {
    return exercises
      .filter(ex => ex.week_number === selectedWeek && ex.day_number === selectedDay)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [exercises, selectedWeek, selectedDay]);

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
        week_number,
        day_number,
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
        week_number: ex.week_number || 1,
        day_number: ex.day_number || 1,
      }));
      setExercises(formattedExercises);

      // Detect days per week from existing data
      const maxDay = Math.max(1, ...formattedExercises.map(ex => ex.day_number || 1));
      setDaysPerWeek(Math.max(3, maxDay));
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
    const currentDayMax = currentDayExercises.length > 0 
      ? Math.max(...currentDayExercises.map(ex => ex.order_index || 0)) + 1
      : 0;

    const { data, error } = await supabase
      .from("program_exercises")
      .insert({
        program_id: programId,
        exercise_id: exercise.id,
        order_index: currentDayMax,
        sets: 3,
        reps: "10",
        week_number: selectedWeek,
        day_number: selectedDay,
      })
      .select(`
        id,
        exercise_id,
        order_index,
        sets,
        reps,
        notes,
        superset_group,
        week_number,
        day_number,
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
    toast.success(`Added ${exercise.name} to Week ${selectedWeek}, Day ${selectedDay}`);
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

    const existingGroups = new Set(
      currentDayExercises
        .filter(ex => ex.superset_group)
        .map(ex => ex.superset_group!.charAt(0))
    );
    
    let nextLetter = "A";
    while (existingGroups.has(nextLetter) && nextLetter < "Z") {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
    }

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

    setExercises(prev => 
      prev.map((ex) => {
        if (selectedExerciseIds.has(ex.id)) {
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
    if (!exercise || !exercise.superset_group) return;

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
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = currentDayExercises.findIndex((ex) => ex.id === active.id);
      const newIndex = currentDayExercises.findIndex((ex) => ex.id === over.id);

      const newOrder = arrayMove(currentDayExercises, oldIndex, newIndex);
      
      // Update all exercises with new order for this day
      setExercises(prev => {
        const otherDays = prev.filter(ex => 
          ex.week_number !== selectedWeek || ex.day_number !== selectedDay
        );
        const reordered = newOrder.map((ex, index) => ({
          ...ex,
          order_index: index,
        }));
        return [...otherDays, ...reordered];
      });

      // Batch update
      const updatePromises = newOrder.map((ex, index) =>
        supabase
          .from("program_exercises")
          .update({ order_index: index })
          .eq("id", ex.id)
      );

      const results = await Promise.all(updatePromises);
      if (results.some((r) => r.error)) {
        toast.error("Failed to save new order");
        fetchProgramDetails();
      }
    }
  };

  const handleCopyDay = async (targetWeek: number, targetDay: number) => {
    const exercisesToCopy = currentDayExercises;
    
    if (exercisesToCopy.length === 0) {
      toast.error("No exercises to copy");
      return;
    }

    const newExercises = exercisesToCopy.map((ex, index) => ({
      program_id: programId,
      exercise_id: ex.exercise_id,
      order_index: index,
      sets: ex.sets,
      reps: ex.reps,
      notes: ex.notes,
      superset_group: ex.superset_group,
      week_number: targetWeek,
      day_number: targetDay,
    }));

    const { data, error } = await supabase
      .from("program_exercises")
      .insert(newExercises)
      .select(`
        id,
        exercise_id,
        order_index,
        sets,
        reps,
        notes,
        superset_group,
        week_number,
        day_number,
        exercises (
          id,
          name,
          body_part,
          exercise_type
        )
      `);

    if (error) {
      console.error("Error copying day:", error);
      toast.error("Failed to copy exercises");
      return;
    }

    const formatted = (data || []).map(ex => ({
      ...ex,
      exercise: ex.exercises as Exercise | null,
    }));

    setExercises(prev => [...prev, ...formatted]);
    toast.success(`Copied ${exercisesToCopy.length} exercises to Week ${targetWeek}, Day ${targetDay}`);
    setSelectedWeek(targetWeek);
    setSelectedDay(targetDay);
  };

  const handleAddWeek = () => {
    setEditedProgram(prev => ({
      ...prev,
      duration_weeks: (prev.duration_weeks || 4) + 1,
    }));
  };

  const handleRemoveWeek = () => {
    if (totalWeeks <= 1) return;
    
    // Check if there are exercises in the last week
    const exercisesInLastWeek = exercises.filter(ex => ex.week_number === totalWeeks);
    if (exercisesInLastWeek.length > 0) {
      toast.error(`Cannot remove Week ${totalWeeks}: it contains ${exercisesInLastWeek.length} exercises`);
      return;
    }

    setEditedProgram(prev => ({
      ...prev,
      duration_weeks: (prev.duration_weeks || 4) - 1,
    }));
    
    if (selectedWeek > totalWeeks - 1) {
      setSelectedWeek(totalWeeks - 1);
    }
  };

  const getSupersetLabel = (exercise: ProgramExercise): string | null => {
    if (!exercise.superset_group) return null;
    
    const group = exercise.superset_group;
    const exercisesInGroup = currentDayExercises.filter(ex => ex.superset_group === group);
    const indexInGroup = exercisesInGroup.findIndex(ex => ex.id === exercise.id) + 1;
    
    return `${group}${indexInGroup}`;
  };

  const existingExerciseIds = exercises
    .filter(ex => ex.exercise_id)
    .map(ex => ex.exercise_id!);

  const handleDuplicated = () => {
    setShowDuplicateDialog(false);
    onOpenChange(false);
    onUpdated();
  };

  const handleCopyWeek = async (sourceWeek: number, targetWeek: number) => {
    const exercisesToCopy = exercises.filter(ex => ex.week_number === sourceWeek);
    
    if (exercisesToCopy.length === 0) {
      toast.error(`Week ${sourceWeek} has no exercises to copy`);
      return;
    }

    const newExercises = exercisesToCopy.map((ex) => ({
      program_id: programId,
      exercise_id: ex.exercise_id,
      order_index: ex.order_index,
      sets: ex.sets,
      reps: ex.reps,
      notes: ex.notes,
      superset_group: ex.superset_group,
      week_number: targetWeek,
      day_number: ex.day_number,
    }));

    const { data, error } = await supabase
      .from("program_exercises")
      .insert(newExercises)
      .select(`
        id,
        exercise_id,
        order_index,
        sets,
        reps,
        notes,
        superset_group,
        week_number,
        day_number,
        exercises (
          id,
          name,
          body_part,
          exercise_type
        )
      `);

    if (error) {
      console.error("Error copying week:", error);
      toast.error("Failed to copy week");
      return;
    }

    const formatted = (data || []).map(ex => ({
      ...ex,
      exercise: ex.exercises as Exercise | null,
    }));

    setExercises(prev => [...prev, ...formatted]);
    toast.success(`Copied ${exercisesToCopy.length} exercises from Week ${sourceWeek} to Week ${targetWeek}`);
    setSelectedWeek(targetWeek);
    setSelectedDay(1);
  };

  const getExerciseCountsByWeek = (): Record<number, number> => {
    const counts: Record<number, number> = {};
    for (let w = 1; w <= totalWeeks; w++) {
      counts[w] = exercises.filter(ex => ex.week_number === w).length;
    }
    return counts;
  };

  const handleClearDay = async (week: number, day: number) => {
    const exercisesToDelete = exercises.filter(
      ex => ex.week_number === week && ex.day_number === day
    );
    
    if (exercisesToDelete.length === 0) return;

    const { error } = await supabase
      .from("program_exercises")
      .delete()
      .eq("program_id", programId)
      .eq("week_number", week)
      .eq("day_number", day);

    if (error) {
      console.error("Error clearing day:", error);
      toast.error("Failed to clear day");
      return;
    }

    setExercises(prev => prev.filter(
      ex => !(ex.week_number === week && ex.day_number === day)
    ));
    toast.success(`Cleared ${exercisesToDelete.length} exercises from Week ${week}, Day ${day}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90svh] flex flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle>Program Details</DialogTitle>
                <DialogDescription>
                  Edit program settings and build your week-by-week schedule.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === "schedule" ? "overview" : "schedule")}
                >
                  {viewMode === "schedule" ? (
                    <><LayoutGrid className="h-4 w-4 mr-2" />Overview</>
                  ) : (
                    <><List className="h-4 w-4 mr-2" />Schedule</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDuplicateDialog(true)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : program ? (
            <Tabs defaultValue="exercises" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-fit">
                <TabsTrigger value="exercises">Exercises</TabsTrigger>
                <TabsTrigger value="checkin">Check-in</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="exercises" className="flex-1 min-h-0 overflow-hidden pr-2">
                {viewMode === "overview" ? (
                  <div className="overflow-y-auto h-full">
                    <ProgramOverview
                      totalWeeks={totalWeeks}
                      daysPerWeek={daysPerWeek}
                      exercises={exercises}
                      onSelectWeekDay={(week, day) => {
                        setSelectedWeek(week);
                        setSelectedDay(day);
                        setViewMode("schedule");
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex gap-4 h-full">
                    {/* Schedule Tree Sidebar */}
                    {showScheduleTree && (
                      <div className="w-64 flex-shrink-0 overflow-y-auto">
                        <ProgramScheduleTree
                          exercises={exercises}
                          totalWeeks={totalWeeks}
                          daysPerWeek={daysPerWeek}
                          selectedWeek={selectedWeek}
                          selectedDay={selectedDay}
                          onSelectDay={(week, day) => {
                            setSelectedWeek(week);
                            setSelectedDay(day);
                          }}
                          onCopyWeek={(week) => {
                            setCopyWeekSource(week);
                            setShowCopyWeekDialog(true);
                          }}
                          onClearDay={handleClearDay}
                        />
                      </div>
                    )}
                    
                    {/* Main Exercise Area */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setShowScheduleTree(!showScheduleTree)}
                          >
                            <PanelLeft className="h-4 w-4" />
                          </Button>
                          <h3 className="font-medium text-sm">
                            Week {selectedWeek}, Day {selectedDay} — {currentDayExercises.length} exercise{currentDayExercises.length !== 1 ? "s" : ""}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentDayExercises.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowCopyDayDialog(true)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Day
                            </Button>
                          )}
                          {selectedExerciseIds.size >= 2 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCreateSuperset}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Superset ({selectedExerciseIds.size})
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
                        <ExercisePicker
                          onAdd={handleAddExercise}
                          onClose={() => setShowExercisePicker(false)}
                          existingExerciseIds={existingExerciseIds}
                        />
                      )}

                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="min-h-[200px] border rounded-lg p-2 space-y-2">
                          {currentDayExercises.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No exercises for this day yet. Click "Add" to get started.
                            </div>
                          ) : (
                            <SortableContext
                              items={currentDayExercises.map(ex => ex.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {currentDayExercises.map((ex, index) => (
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
                )}
              </TabsContent>

              <TabsContent value="checkin" className="flex-1 min-h-0 overflow-y-auto pr-2">
                <CheckinTemplateSection
                  programId={programId}
                  coachId={profile?.id || ""}
                />
              </TabsContent>

              <TabsContent value="settings" className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
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
                      max={52}
                      value={editedProgram.duration_weeks || 4}
                      onChange={(e) => setEditedProgram(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) || 4 }))}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={handleSaveProgram} disabled={isSaving} className="w-full">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Program not found
            </div>
          )}
        </DialogContent>
      </Dialog>

      {program && (
        <DuplicateProgramDialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          programId={programId}
          programName={program.name}
          onDuplicated={handleDuplicated}
        />
      )}

      <CopyDayDialog
        open={showCopyDayDialog}
        onOpenChange={setShowCopyDayDialog}
        sourceWeek={selectedWeek}
        sourceDay={selectedDay}
        totalWeeks={totalWeeks}
        daysPerWeek={daysPerWeek}
        onCopy={handleCopyDay}
      />

      <CopyWeekDialog
        open={showCopyWeekDialog}
        onOpenChange={setShowCopyWeekDialog}
        sourceWeek={copyWeekSource}
        totalWeeks={totalWeeks}
        onCopy={handleCopyWeek}
        existingExerciseCounts={getExerciseCountsByWeek()}
      />
    </>
  );
};

export default ProgramDetailDialog;
