import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  CheckCircle2,
  Circle,
  ChevronRight,
  Trophy,
  Calendar,
} from "lucide-react";

interface TodayExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
  coaching_cues: string | null;
  video_url: string | null;
  completed: boolean;
  superset_group?: string | null;
}

interface StructuredProgram {
  id: string;
  program_id: string;
  current_week: number;
  current_day: number;
  start_date: string;
  last_workout_date: string | null;
  program: {
    name: string;
    training_phase: string | null;
    duration_weeks: number | null;
    workouts_per_week: number | null;
  };
}

interface StructuredWorkoutCardProps {
  program: StructuredProgram;
  exercises: TodayExercise[];
  completedToday: string[];
  onStartWorkout: (exercises: TodayExercise[], programName: string, dayInfo: string) => void;
  onMarkComplete: () => void;
  isMarkingComplete?: boolean;
}

const StructuredWorkoutCard = ({
  program,
  exercises,
  completedToday,
  onStartWorkout,
  onMarkComplete,
  isMarkingComplete = false,
}: StructuredWorkoutCardProps) => {
  const exercisesWithCompletion = exercises.map(ex => ({
    ...ex,
    completed: completedToday.includes(ex.id),
  }));

  const completedCount = exercisesWithCompletion.filter(ex => ex.completed).length;
  const totalCount = exercisesWithCompletion.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  const totalWeeks = program.program.duration_weeks || 4;
  const workoutsPerWeek = program.program.workouts_per_week || 3;
  const totalSessions = totalWeeks * workoutsPerWeek;
  const completedSessions = ((program.current_week - 1) * workoutsPerWeek) + (program.current_day - 1);
  const overallProgress = (completedSessions / totalSessions) * 100;

  const getDayInfo = () => {
    return `Week ${program.current_week}, Day ${program.current_day}`;
  };

  const isLastSession = program.current_week >= totalWeeks && program.current_day >= workoutsPerWeek;

  return (
    <Card className="overflow-hidden">
      <div className="gradient-primary p-6">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="secondary" className="mb-2 bg-primary-foreground/20 text-primary-foreground border-0">
              {getDayInfo()}
            </Badge>
            <h2 className="text-2xl font-bold text-primary-foreground mb-1">
              {program.program.name}
            </h2>
            <p className="text-primary-foreground/70 text-sm">
              {totalCount} exercises • {program.program.training_phase || "Training"}
            </p>
          </div>
          
          {allCompleted ? (
            <Button 
              variant="accent" 
              size="lg" 
              className="shadow-gold"
              onClick={onMarkComplete}
              disabled={isMarkingComplete}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {isLastSession ? "Complete Program" : "Next Workout"}
            </Button>
          ) : (
            <Button 
              variant="accent" 
              size="lg" 
              className="shadow-gold"
              onClick={() => onStartWorkout(exercisesWithCompletion, program.program.name, getDayInfo())}
            >
              <Play className="h-5 w-5 mr-2" />
              {completedCount > 0 ? "Continue" : "Start"}
            </Button>
          )}
        </div>
        
        {/* Today's Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-primary-foreground/70 mb-2">
            <span>Today's Progress</span>
            <span>{completedCount}/{totalCount}</span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2 bg-primary-foreground/20"
          />
        </div>

        {/* Overall Program Progress */}
        <div className="mt-3 pt-3 border-t border-primary-foreground/10">
          <div className="flex items-center justify-between text-sm text-primary-foreground/70 mb-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Program Progress
            </span>
            <span>
              Week {program.current_week} of {totalWeeks}
            </span>
          </div>
          <Progress 
            value={overallProgress} 
            className="h-1.5 bg-primary-foreground/20"
          />
        </div>
      </div>
      
      {/* Exercise List Preview */}
      <CardContent className="p-4">
        <div className="space-y-2">
          {exercisesWithCompletion.slice(0, 4).map((exercise) => (
            <div 
              key={exercise.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                exercise.completed ? "bg-success/10" : "bg-muted/50 hover:bg-muted"
              }`}
            >
              {exercise.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${exercise.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {exercise.name}
                </p>
                <p className="text-sm text-muted-foreground">{exercise.sets}x{exercise.reps}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
          {exercisesWithCompletion.length > 4 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              +{exercisesWithCompletion.length - 4} more exercises
            </p>
          )}
        </div>

        {/* Completion Message */}
        {allCompleted && (
          <div className="mt-4 p-4 bg-success/10 rounded-lg text-center">
            <Trophy className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="font-medium text-success">Great job! All exercises completed!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isLastSession 
                ? "Click above to complete your program!" 
                : "Click above to advance to your next workout."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StructuredWorkoutCard;
