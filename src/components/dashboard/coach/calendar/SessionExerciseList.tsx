import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Search, Dumbbell } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  body_part: string | null;
  exercise_type: string | null;
}

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

const SessionExerciseList = ({
  workoutLogId,
  onExercisesChange,
}: SessionExerciseListProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogEntry[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
    loadExerciseLogs();
  }, [workoutLogId]);

  const loadExercises = async () => {
    const { data } = await supabase
      .from("exercises")
      .select("id, name, body_part, exercise_type")
      .order("name");
    
    if (data) setExercises(data);
  };

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

  const handleAddExercise = async (exercise: Exercise) => {
    setSearchOpen(false);
    setSearchQuery("");

    const { data, error } = await supabase
      .from("exercise_logs")
      .insert({
        workout_log_id: workoutLogId,
        exercise_id: exercise.id,
        sets_completed: 3,
        reps_completed: "10",
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add exercise",
        variant: "destructive",
      });
      return;
    }

    const newLog: ExerciseLogEntry = {
      id: data.id,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets_completed: 3,
      reps_completed: "10",
      weight_used: "",
      notes: "",
    };

    const updatedLogs = [...exerciseLogs, newLog];
    setExerciseLogs(updatedLogs);
    onExercisesChange(updatedLogs);
    toast({ title: "Exercise added" });
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
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
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
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Exercise
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput
                placeholder="Search exercises..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No exercises found.</CommandEmpty>
                <CommandGroup>
                  {filteredExercises.slice(0, 10).map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      onSelect={() => handleAddExercise(exercise)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{exercise.name}</span>
                        {(exercise.body_part || exercise.exercise_type) && (
                          <span className="text-xs text-muted-foreground">
                            {[exercise.body_part, exercise.exercise_type]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
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
