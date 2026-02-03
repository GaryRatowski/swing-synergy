import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ExerciseCard, { ExerciseData, ExerciseLogData } from "./ExerciseCard";
import { X, Timer, CheckCircle2, Trophy, Pause, Play } from "lucide-react";

interface WorkoutExecutionProps {
  clientId: string;
  programId?: string;
  homeworkAssignmentId?: string;
  exercises: ExerciseData[];
  programName: string;
  dayInfo: string;
  onClose: () => void;
  onComplete: () => void;
}

const WorkoutExecution = ({
  clientId,
  programId,
  homeworkAssignmentId,
  exercises,
  programName,
  dayInfo,
  onClose,
  onComplete,
}: WorkoutExecutionProps) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLogData>>({});
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [overallRpe, setOverallRpe] = useState<number>(7);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutStartTime] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Rest Timer
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restPaused, setRestPaused] = useState(false);

  // Initialize exercise logs
  useEffect(() => {
    const initialLogs: Record<string, ExerciseLogData> = {};
    exercises.forEach((ex) => {
      initialLogs[ex.id] = {
        exercise_id: ex.id,
        sets_completed: 0,
        reps_completed: "",
        weight_used: "",
        rpe: null,
        notes: "",
      };
    });
    setExerciseLogs(initialLogs);

    // Mark already completed exercises
    const alreadyCompleted = new Set(
      exercises.filter(ex => ex.completed).map(ex => ex.id)
    );
    setCompletedExercises(alreadyCompleted);

    // Find first incomplete exercise
    const firstIncomplete = exercises.findIndex(ex => !ex.completed);
    if (firstIncomplete >= 0) {
      setCurrentExerciseIndex(firstIncomplete);
    }
  }, [exercises]);

  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && !restPaused && restTime > 0) {
      interval = setInterval(() => {
        setRestTime((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            // Play notification sound or vibrate
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
            toast({
              title: "Rest Complete!",
              description: "Ready for your next set",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restPaused, restTime]);

  const handleLogChange = (exerciseId: string, data: Partial<ExerciseLogData>) => {
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], ...data },
    }));
  };

  const handleExerciseComplete = (exerciseId: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    setCompletedExercises((prev) => new Set([...prev, exerciseId]));

    // Start rest timer if there are more exercises
    if (currentExerciseIndex < exercises.length - 1 && exercise) {
      setRestTime(exercise.rest_seconds);
      setIsResting(true);
      setRestPaused(false);
    }

    // Move to next exercise
    const nextIncomplete = exercises.findIndex(
      (ex, idx) => idx > currentExerciseIndex && !completedExercises.has(ex.id) && ex.id !== exerciseId
    );
    
    if (nextIncomplete >= 0) {
      setCurrentExerciseIndex(nextIncomplete);
    } else if (completedExercises.size + 1 >= exercises.length) {
      // All exercises complete
      setShowSummary(true);
    }
  };

  const startRestTimer = (seconds: number) => {
    setRestTime(seconds);
    setIsResting(true);
    setRestPaused(false);
  };

  const toggleRestPause = () => {
    setRestPaused(!restPaused);
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFinishWorkout = async () => {
    setIsSaving(true);
    try {
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - workoutStartTime.getTime()) / 60000);
      const today = new Date().toISOString().split("T")[0];

      // Create workout log
      const { data: workoutLog, error: workoutError } = await supabase
        .from("workout_logs")
        .insert({
          client_id: clientId,
          program_id: programId || null,
          homework_assignment_id: homeworkAssignmentId || null,
          session_type: homeworkAssignmentId ? "homework" : null,
          workout_date: today,
          duration_minutes: durationMinutes,
          overall_rpe: overallRpe,
          notes: workoutNotes,
          completed_at: endTime.toISOString(),
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create exercise logs
      const exerciseLogsToInsert = Object.values(exerciseLogs)
        .filter((log) => completedExercises.has(log.exercise_id))
        .map((log) => ({
          workout_log_id: workoutLog.id,
          exercise_id: log.exercise_id,
          sets_completed: log.sets_completed,
          reps_completed: log.reps_completed || null,
          weight_used: log.weight_used || null,
          rpe: log.rpe,
          notes: log.notes || null,
        }));

      if (exerciseLogsToInsert.length > 0) {
        const { error: logsError } = await supabase
          .from("exercise_logs")
          .insert(exerciseLogsToInsert);

        if (logsError) throw logsError;
      }

      toast({
        title: "🎉 Workout Complete!",
        description: `Great job! You completed ${completedExercises.size} exercises in ${durationMinutes} minutes.`,
      });

      onComplete();
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({
        title: "Error",
        description: "Failed to save workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const progress = (completedExercises.size / exercises.length) * 100;

  return (
    <>
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border z-10">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="font-bold text-lg text-foreground">{programName}</h1>
              <p className="text-sm text-muted-foreground">{dayInfo}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{completedExercises.size}/{exercises.length} exercises</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Rest Timer Overlay */}
        {isResting && (
          <div className="fixed bottom-20 left-4 right-4 z-20">
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer className="h-6 w-6" />
                    <div>
                      <p className="text-sm opacity-80">Rest Time</p>
                      <p className="text-2xl font-bold">{formatTime(restTime)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={toggleRestPause}
                    >
                      {restPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={skipRest}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Exercise List */}
        <div className="p-4 pb-24 space-y-4">
          {exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={{
                ...exercise,
                completed: completedExercises.has(exercise.id),
              }}
              isActive={index === currentExerciseIndex}
              logData={exerciseLogs[exercise.id] || {
                exercise_id: exercise.id,
                sets_completed: 0,
                reps_completed: "",
                weight_used: "",
                rpe: null,
                notes: "",
              }}
              onLogChange={(data) => handleLogChange(exercise.id, data)}
              onComplete={() => handleExerciseComplete(exercise.id)}
              clientId={clientId}
            />
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => setShowSummary(true)}
            disabled={completedExercises.size === 0}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Finish Workout ({completedExercises.size}/{exercises.length})
          </Button>
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-accent" />
              Workout Complete!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">{completedExercises.size}</p>
                <p className="text-sm text-muted-foreground">Exercises</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000)}
                </p>
                <p className="text-sm text-muted-foreground">Minutes</p>
              </div>
            </div>

            {/* Overall RPE */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                How hard was this workout? (RPE)
              </label>
              <div className="space-y-3">
                <Slider
                  value={[overallRpe]}
                  onValueChange={([value]) => setOverallRpe(value)}
                  min={1}
                  max={10}
                  step={1}
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Easy (1)</span>
                  <span className="font-bold text-foreground">{overallRpe}</span>
                  <span className="text-muted-foreground">Max (10)</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Workout Notes (optional)
              </label>
              <Textarea
                placeholder="How did this workout feel? Anything to note?"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              Keep Going
            </Button>
            <Button onClick={handleFinishWorkout} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Finish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkoutExecution;
