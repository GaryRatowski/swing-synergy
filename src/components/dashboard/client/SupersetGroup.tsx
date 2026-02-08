import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, RotateCcw, Zap, Dumbbell } from "lucide-react";
import ExerciseCard, { ExerciseData, ExerciseLogData } from "./ExerciseCard";

interface SupersetGroupProps {
  groupLabel: string;
  exercises: ExerciseData[];
  isActiveGroup: boolean;
  exerciseLogs: Record<string, ExerciseLogData>;
  completedExercises: Set<string>;
  currentExerciseIndex: number;
  globalStartIndex: number;
  onLogChange: (exerciseId: string, data: Partial<ExerciseLogData>) => void;
  onExerciseComplete: (exerciseId: string) => void;
  onCompleteSuperset: (exerciseIds: string[], restSeconds: number) => void;
  clientId: string;
}

interface SupersetLogFormData {
  [exerciseId: string]: {
    sets_completed: number;
    reps_completed: string;
    weight_used: string;
    rpe: number | null;
  };
}

const SupersetGroup = ({
  groupLabel,
  exercises,
  isActiveGroup,
  exerciseLogs,
  completedExercises,
  currentExerciseIndex,
  globalStartIndex,
  onLogChange,
  onExerciseComplete,
  onCompleteSuperset,
  clientId,
}: SupersetGroupProps) => {
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logFormData, setLogFormData] = useState<SupersetLogFormData>({});

  const allExercisesComplete = useMemo(() => 
    exercises.every(ex => completedExercises.has(ex.id)),
    [exercises, completedExercises]
  );

  const completedCount = useMemo(() =>
    exercises.filter(ex => completedExercises.has(ex.id)).length,
    [exercises, completedExercises]
  );

  // Get rest time from first exercise in the superset
  const restSeconds = exercises[0]?.rest_seconds || 60;

  const handleOpenLogDialog = () => {
    // Initialize form data with current log values
    const initialData: SupersetLogFormData = {};
    exercises.forEach(ex => {
      const currentLog = exerciseLogs[ex.id];
      initialData[ex.id] = {
        sets_completed: currentLog?.sets_completed || ex.sets,
        reps_completed: currentLog?.reps_completed || ex.reps,
        weight_used: currentLog?.weight_used || "",
        rpe: currentLog?.rpe || null,
      };
    });
    setLogFormData(initialData);
    setShowLogDialog(true);
  };

  const handleLogFormChange = (
    exerciseId: string, 
    field: keyof SupersetLogFormData[string], 
    value: string | number | null
  ) => {
    setLogFormData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value,
      },
    }));
  };

  const handleLogBoth = () => {
    // Update logs for all exercises
    exercises.forEach(ex => {
      const formData = logFormData[ex.id];
      if (formData) {
        onLogChange(ex.id, {
          sets_completed: formData.sets_completed,
          reps_completed: formData.reps_completed,
          weight_used: formData.weight_used,
          rpe: formData.rpe,
        });
      }
    });

    // Complete all exercises and trigger rest timer
    const incompleteIds = exercises
      .filter(ex => !completedExercises.has(ex.id))
      .map(ex => ex.id);
    
    setShowLogDialog(false);
    onCompleteSuperset(incompleteIds, restSeconds);
  };

  const handleCompleteSuperset = () => {
    const incompleteIds = exercises
      .filter(ex => !completedExercises.has(ex.id))
      .map(ex => ex.id);
    onCompleteSuperset(incompleteIds, restSeconds);
  };

  return (
    <>
      <Card className={`
        border-l-4 border-l-success 
        ${isActiveGroup ? "ring-2 ring-primary/30 bg-primary/5" : "border-border"} 
        ${allExercisesComplete ? "opacity-60" : ""}
      `}>
        {/* Superset Header */}
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`text-xs font-bold uppercase tracking-wide ${
                  isActiveGroup ? "bg-success text-success-foreground" : "bg-success/20 text-success"
                }`}
              >
                <Zap className="h-3 w-3 mr-1" />
                Superset {groupLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {completedCount}/{exercises.length} done
              </span>
              {allExercisesComplete ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <RotateCcw className="h-4 w-4 text-muted-foreground animate-pulse" />
              )}
            </div>
          </div>
          {/* Alternation instruction */}
          <p className="text-xs text-muted-foreground mt-1">
            Alternate: {exercises.map((ex, i) => (
              <span key={ex.id}>
                {ex.superset_group}
                {i < exercises.length - 1 ? " → " : ""}
              </span>
            ))} → Rest
          </p>
        </CardHeader>

        {/* Exercises in Superset */}
        <CardContent className="pt-0 pb-3 px-3 space-y-2">
          {exercises.map((exercise, idx) => {
            const globalIndex = globalStartIndex + idx;
            const isActive = globalIndex === currentExerciseIndex;
            const isCompleted = completedExercises.has(exercise.id);
            
            return (
              <div key={exercise.id} className="relative">
                {/* Superset exercise indicator with label */}
                <div className="absolute -left-1 top-0 bottom-0 flex flex-col items-center justify-center">
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isCompleted 
                      ? "bg-success text-success-foreground" 
                      : isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }
                  `}>
                    {exercise.superset_group}
                  </div>
                  {idx < exercises.length - 1 && (
                    <div className="w-0.5 h-4 bg-border my-1" />
                  )}
                </div>
                
                <div className="ml-7">
                  <ExerciseCard
                    exercise={{
                      ...exercise,
                      completed: isCompleted,
                    }}
                    isActive={isActive}
                    logData={exerciseLogs[exercise.id] || {
                      exercise_id: exercise.id,
                      sets_completed: 0,
                      reps_completed: "",
                      weight_used: "",
                      rpe: null,
                      notes: "",
                    }}
                    onLogChange={(data) => onLogChange(exercise.id, data)}
                    onComplete={() => onExerciseComplete(exercise.id)}
                    clientId={clientId}
                  />
                </div>
              </div>
            );
          })}

          {/* Complete Superset Button */}
          {!allExercisesComplete && exercises.length > 1 && (
            <div className="flex gap-2 mt-3 ml-7">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-success/50 text-success hover:bg-success/10"
                onClick={handleOpenLogDialog}
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Log Both Exercises
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                onClick={handleCompleteSuperset}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Superset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Exercise Log Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-success" />
              Log Superset {groupLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {exercises.map((exercise, idx) => (
              <div key={exercise.id}>
                {idx > 0 && <Separator className="my-4" />}
                
                <div className="space-y-3">
                  {/* Exercise header */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold">
                      {exercise.superset_group}
                    </Badge>
                    <span className="font-medium text-sm">{exercise.name}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Target: {exercise.sets} × {exercise.reps}
                  </p>

                  {/* Input fields */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Sets</Label>
                      <Input
                        type="number"
                        min={0}
                        value={logFormData[exercise.id]?.sets_completed || ""}
                        onChange={(e) => handleLogFormChange(
                          exercise.id, 
                          "sets_completed", 
                          parseInt(e.target.value) || 0
                        )}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Reps</Label>
                      <Input
                        placeholder={exercise.reps}
                        value={logFormData[exercise.id]?.reps_completed || ""}
                        onChange={(e) => handleLogFormChange(
                          exercise.id, 
                          "reps_completed", 
                          e.target.value
                        )}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Weight</Label>
                      <Input
                        placeholder="lbs"
                        value={logFormData[exercise.id]?.weight_used || ""}
                        onChange={(e) => handleLogFormChange(
                          exercise.id, 
                          "weight_used", 
                          e.target.value
                        )}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* RPE Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-xs">RPE</Label>
                      <span className="text-xs text-muted-foreground">
                        {logFormData[exercise.id]?.rpe || "—"}
                      </span>
                    </div>
                    <Slider
                      value={[logFormData[exercise.id]?.rpe || 5]}
                      onValueChange={([val]) => handleLogFormChange(
                        exercise.id, 
                        "rpe", 
                        val
                      )}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLogBoth}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Log All & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupersetGroup;
