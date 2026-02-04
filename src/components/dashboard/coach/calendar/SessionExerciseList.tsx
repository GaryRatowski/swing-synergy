import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Search, Dumbbell, Clock, Loader2 } from "lucide-react";
import { useExerciseCache } from "@/hooks/useExerciseCache";

interface ExerciseLogEntry {
  id?: string;
  exercise_id: string;
  exercise_name: string;
  sets_completed: number | null;
  reps_completed: string;
  weight_used: string;
  notes: string;
}

interface SessionExerciseListProps {
  workoutLogId: string;
  onExercisesChange: (exercises: ExerciseLogEntry[]) => void;
}

const getTypeColor = (type: string | null) => {
  switch (type) {
    case "power": return "bg-accent/10 text-accent border-accent/20";
    case "strength": return "bg-primary/10 text-primary border-primary/20";
    case "mobility": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
    case "plyometric": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400";
    case "speed": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "stability": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
    case "rotation": return "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400";
    case "recovery": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const SessionExerciseList = ({
  workoutLogId,
  onExercisesChange,
}: SessionExerciseListProps) => {
  const { exercises, recentExercises, isLoading: cacheLoading } = useExerciseCache();
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogEntry[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addingExercise, setAddingExercise] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const setsInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  useEffect(() => {
    loadExerciseLogs();
  }, [workoutLogId]);

  const loadExerciseLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("exercise_logs")
      .select(`
        id,
        exercise_id,
        sets_completed,
        reps_completed,
        weight_used,
        notes,
        exercises(name)
      `)
      .eq("workout_log_id", workoutLogId);

    if (data) {
      const logs: ExerciseLogEntry[] = data.map((log: any) => ({
        id: log.id,
        exercise_id: log.exercise_id,
        exercise_name: log.exercises?.name || "Unknown",
        sets_completed: log.sets_completed,
        reps_completed: log.reps_completed || "",
        weight_used: log.weight_used || "",
        notes: log.notes || "",
      }));
      setExerciseLogs(logs);
      onExercisesChange(logs);
    }
    setLoading(false);
  };

  const handleAddExercise = async (
    exercise: { id: string; name: string },
    defaultSets?: number | null,
    defaultReps?: string | null
  ) => {
    if (addingExercise) return;
    setAddingExercise(true);
    setSearchOpen(false);
    setSearchQuery("");
    setSelectedIndex(0);

    const { data, error } = await supabase
      .from("exercise_logs")
      .insert({
        workout_log_id: workoutLogId,
        exercise_id: exercise.id,
        sets_completed: defaultSets ?? 3,
        reps_completed: defaultReps ?? "10",
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add exercise",
        variant: "destructive",
      });
      setAddingExercise(false);
      return;
    }

    const newLog: ExerciseLogEntry = {
      id: data.id,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets_completed: defaultSets ?? 3,
      reps_completed: defaultReps ?? "10",
      weight_used: "",
      notes: "",
    };

    const updatedLogs = [...exerciseLogs, newLog];
    setExerciseLogs(updatedLogs);
    onExercisesChange(updatedLogs);
    toast({ title: "Exercise added" });
    setAddingExercise(false);

    // Focus the sets input of the newly added exercise
    setTimeout(() => {
      const newIndex = updatedLogs.length - 1;
      const setsInput = setsInputRefs.current.get(newIndex);
      if (setsInput) {
        setsInput.focus();
        setsInput.select();
      }
    }, 100);
  };

  const handleUpdateExercise = async (
    index: number,
    field: keyof ExerciseLogEntry,
    value: string | number | null
  ) => {
    const updatedLogs = [...exerciseLogs];
    updatedLogs[index] = { ...updatedLogs[index], [field]: value };
    setExerciseLogs(updatedLogs);
    onExercisesChange(updatedLogs);

    const log = updatedLogs[index];
    if (!log.id) return;

    await supabase
      .from("exercise_logs")
      .update({
        [field]: value,
      })
      .eq("id", log.id);
  };

  const handleDeleteExercise = async (index: number) => {
    const log = exerciseLogs[index];
    if (log.id) {
      const { error } = await supabase
        .from("exercise_logs")
        .delete()
        .eq("id", log.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete exercise",
          variant: "destructive",
        });
        return;
      }
    }

    const updatedLogs = exerciseLogs.filter((_, i) => i !== index);
    setExerciseLogs(updatedLogs);
    onExercisesChange(updatedLogs);
    toast({ title: "Exercise removed" });
  };

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredExercises.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === "Enter" && filteredExercises.length > 0) {
      e.preventDefault();
      const selected = filteredExercises[selectedIndex];
      if (selected) {
        handleAddExercise({ id: selected.id, name: selected.name });
      }
    }
  }, [filteredExercises, selectedIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <p className="text-sm text-muted-foreground">Loading exercises...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          Exercises ({exerciseLogs.length})
        </Label>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={addingExercise}>
              {addingExercise ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Exercise
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 space-y-3">
              {/* Recent Exercises Section */}
              {recentExercises.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Recent</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentExercises.map((ex) => (
                      <Button
                        key={ex.id}
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => handleAddExercise(
                          { id: ex.id, name: ex.name },
                          ex.last_sets,
                          ex.last_reps
                        )}
                        disabled={addingExercise}
                      >
                        {ex.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-8"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="max-h-[250px] overflow-y-auto -mx-3 px-3">
                {cacheLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery ? "No exercises found" : "Type to search"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredExercises.map((exercise, index) => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise({ id: exercise.id, name: exercise.name })}
                        disabled={addingExercise}
                        className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                          index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                          {exercise.thumbnail_url ? (
                            <img
                              src={exercise.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Exercise Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {exercise.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {exercise.body_part && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {exercise.body_part}
                              </Badge>
                            )}
                            {exercise.exercise_type && (
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-1.5 py-0 h-4 ${getTypeColor(exercise.exercise_type)}`}
                              >
                                {exercise.exercise_type}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Keyboard hint */}
              {filteredExercises.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center border-t pt-2">
                  ↑↓ navigate • Enter to add • Esc to close
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {exerciseLogs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <Search className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No exercises added yet. Click "Add Exercise" to start.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {exerciseLogs.map((log, index) => (
            <Card key={log.id || index}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-sm">{log.exercise_name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteExercise(index)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Sets</Label>
                    <Input
                      ref={(el) => {
                        if (el) setsInputRefs.current.set(index, el);
                      }}
                      type="number"
                      value={log.sets_completed || ""}
                      onChange={(e) =>
                        handleUpdateExercise(
                          index,
                          "sets_completed",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      className="h-8 text-sm"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Reps</Label>
                    <Input
                      value={log.reps_completed}
                      onChange={(e) =>
                        handleUpdateExercise(index, "reps_completed", e.target.value)
                      }
                      className="h-8 text-sm"
                      placeholder="8-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <Input
                      value={log.weight_used}
                      onChange={(e) =>
                        handleUpdateExercise(index, "weight_used", e.target.value)
                      }
                      className="h-8 text-sm"
                      placeholder="135 lbs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Input
                      value={log.notes}
                      onChange={(e) =>
                        handleUpdateExercise(index, "notes", e.target.value)
                      }
                      className="h-8 text-sm"
                      placeholder="Form cue"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionExerciseList;
