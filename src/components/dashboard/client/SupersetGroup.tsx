import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RotateCcw, Zap } from "lucide-react";
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
  onCompleteSuperset: (exerciseIds: string[]) => void;
  clientId: string;
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
  const allExercisesComplete = useMemo(() => 
    exercises.every(ex => completedExercises.has(ex.id)),
    [exercises, completedExercises]
  );

  const completedCount = useMemo(() =>
    exercises.filter(ex => completedExercises.has(ex.id)).length,
    [exercises, completedExercises]
  );

  const handleCompleteSuperset = () => {
    const incompleteIds = exercises
      .filter(ex => !completedExercises.has(ex.id))
      .map(ex => ex.id);
    onCompleteSuperset(incompleteIds);
  };

  return (
    <Card className={`border-2 ${isActiveGroup ? "border-primary/50 bg-primary/5" : "border-border"} ${allExercisesComplete ? "opacity-60" : ""}`}>
      {/* Superset Header */}
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`text-xs font-bold ${isActiveGroup ? "bg-primary text-primary-foreground" : ""}`}
            >
              <Zap className="h-3 w-3 mr-1" />
              Superset {groupLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Alternate between exercises
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {completedCount}/{exercises.length}
            </span>
            {allExercisesComplete ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Exercises in Superset */}
      <CardContent className="pt-0 pb-3 px-3 space-y-2">
        {exercises.map((exercise, idx) => {
          const globalIndex = globalStartIndex + idx;
          const isActive = globalIndex === currentExerciseIndex;
          
          return (
            <div key={exercise.id} className="relative">
              {/* Superset Label Indicator */}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-primary/30" />
              
              <ExerciseCard
                exercise={{
                  ...exercise,
                  completed: completedExercises.has(exercise.id),
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
          );
        })}

        {/* Complete Superset Button */}
        {!allExercisesComplete && exercises.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleCompleteSuperset}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete Entire Superset
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SupersetGroup;
