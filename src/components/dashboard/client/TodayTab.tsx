import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import HabitTracker from "./HabitTracker";
import ClubheadSpeedChart from "./ClubheadSpeedChart";
import ActiveHomeworkCard, { 
  HomeworkAssignment, 
  HomeworkExercise, 
  getTargetForWeek 
} from "./ActiveHomeworkCard";
import {
  Play,
  CheckCircle2,
  Circle,
  ChevronRight,
  Calendar,
  Dumbbell,
  TrendingUp,
  BookOpen,
} from "lucide-react";

interface TodayTabProps {
  clientId: string;
  onStartWorkout: (exercises: TodayExercise[], programName: string, dayInfo: string, homeworkAssignmentId?: string) => void;
}

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

interface ActiveProgram {
  id: string;
  program_id: string;
  current_week: number;
  start_date: string;
  program: {
    name: string;
    training_phase: string | null;
    duration_weeks: number | null;
  };
}

interface QuickStat {
  label: string;
  value: string;
  unit: string;
  change: string;
}

const TodayTab = ({ clientId, onStartWorkout }: TodayTabProps) => {
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [todayExercises, setTodayExercises] = useState<TodayExercise[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [activeHomework, setActiveHomework] = useState<HomeworkAssignment[]>([]);

  useEffect(() => {
    if (clientId) {
      fetchTodayData();
    }
  }, [clientId]);

  const fetchTodayData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchActiveProgram(),
        fetchTodayCompletedExercises(),
        fetchQuickStats(),
        fetchWorkoutStreak(),
        fetchActiveHomework(),
      ]);
    } catch (error) {
      console.error("Error fetching today data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveHomework = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    // Get current week's Sunday-Saturday range
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Fetch active homework assignments
    const { data: assignments, error } = await supabase
      .from("homework_assignments")
      .select(`
        id,
        name,
        frequency_type,
        frequency_count,
        instructions,
        start_date,
        end_date
      `)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .lte("start_date", today)
      .or(`end_date.gte.${today},end_date.is.null`);

    if (error) {
      console.error("Error fetching homework:", error);
      return;
    }

    if (!assignments || assignments.length === 0) {
      setActiveHomework([]);
      return;
    }

    // Fetch exercises for each assignment and workout logs for progress
    const homeworkWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        // Get exercises
        const { data: exerciseData } = await supabase
          .from("homework_exercises")
          .select(`
            id,
            order_index,
            sets,
            reps,
            tempo,
            notes,
            exercise:exercises (
              id,
              name,
              video_url,
              coaching_cues
            )
          `)
          .eq("homework_assignment_id", assignment.id)
          .order("order_index", { ascending: true });

        // Get completed workouts this week
        const { data: completedLogs } = await supabase
          .from("workout_logs")
          .select("id")
          .eq("homework_assignment_id", assignment.id)
          .eq("client_id", clientId)
          .gte("workout_date", weekStart.toISOString().split("T")[0])
          .lte("workout_date", weekEnd.toISOString().split("T")[0])
          .not("completed_at", "is", null);

        const exercises: HomeworkExercise[] = (exerciseData || [])
          .filter(ex => ex.exercise)
          .map(ex => {
            const exercise = ex.exercise as { id: string; name: string; video_url: string | null; coaching_cues: string | null };
            return {
              id: exercise.id,
              name: exercise.name,
              sets: ex.sets || 3,
              reps: ex.reps || "10",
              tempo: ex.tempo,
              notes: ex.notes,
              video_url: exercise.video_url,
              coaching_cues: exercise.coaching_cues,
            };
          });

        const target = getTargetForWeek(assignment.frequency_type, assignment.frequency_count);

        return {
          id: assignment.id,
          name: assignment.name,
          frequency_type: assignment.frequency_type,
          frequency_count: assignment.frequency_count,
          instructions: assignment.instructions,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
          exercises,
          completedThisWeek: completedLogs?.length || 0,
          targetThisWeek: target,
        } as HomeworkAssignment;
      })
    );

    setActiveHomework(homeworkWithDetails);
  };

  const handleHomeworkStart = (assignment: HomeworkAssignment) => {
    const exercises: TodayExercise[] = assignment.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: 60,
      notes: ex.notes,
      coaching_cues: ex.coaching_cues,
      video_url: ex.video_url,
      completed: false,
    }));
    onStartWorkout(exercises, assignment.name, assignment.instructions || "Homework", assignment.id);
  };

  const fetchActiveProgram = async () => {
    const { data: programData, error } = await supabase
      .from("client_programs")
      .select(`
        id,
        program_id,
        current_week,
        start_date,
        program:programs (
          name,
          training_phase,
          duration_weeks
        )
      `)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching active program:", error);
      return;
    }

    if (programData && programData.program) {
      const program = programData.program as { name: string; training_phase: string | null; duration_weeks: number | null };
      setActiveProgram({
        id: programData.id,
        program_id: programData.program_id!,
        current_week: programData.current_week || 1,
        start_date: programData.start_date || new Date().toISOString(),
        program: program,
      });

      // Calculate today's day number (1-7 based on days since start)
      const startDate = new Date(programData.start_date || new Date());
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = (daysSinceStart % 7) + 1;

      // Fetch exercises for today
      await fetchTodayExercises(programData.program_id!, programData.current_week || 1, dayNumber);
    }
  };

  const fetchTodayExercises = async (programId: string, weekNumber: number, dayNumber: number) => {
    const { data, error } = await supabase
      .from("program_exercises")
      .select(`
        id,
        sets,
        reps,
        rest_seconds,
        notes,
        superset_group,
        exercise:exercises (
          id,
          name,
          coaching_cues,
          video_url
        )
      `)
      .eq("program_id", programId)
      .eq("week_number", weekNumber)
      .eq("day_number", dayNumber)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching exercises:", error);
      return;
    }

    if (data) {
      const exercises: TodayExercise[] = data
        .filter(item => item.exercise)
        .map(item => {
          const exercise = item.exercise as { id: string; name: string; coaching_cues: string | null; video_url: string | null };
          return {
            id: exercise.id,
            name: exercise.name,
            sets: item.sets || 3,
            reps: item.reps || "10",
            rest_seconds: item.rest_seconds || 60,
            notes: item.notes,
            coaching_cues: exercise.coaching_cues,
            video_url: exercise.video_url,
            completed: false,
            superset_group: item.superset_group,
          };
        });
      setTodayExercises(exercises);
    }
  };

  const fetchTodayCompletedExercises = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    const { data: workoutLog } = await supabase
      .from("workout_logs")
      .select("id")
      .eq("client_id", clientId)
      .eq("workout_date", today)
      .single();

    if (workoutLog) {
      const { data: exerciseLogs } = await supabase
        .from("exercise_logs")
        .select("exercise_id")
        .eq("workout_log_id", workoutLog.id);

      if (exerciseLogs) {
        setCompletedToday(exerciseLogs.map(log => log.exercise_id!).filter(Boolean));
      }
    }
  };

  const fetchQuickStats = async () => {
    // Fetch latest clubhead speed
    const { data: speedData } = await supabase
      .from("performance_metrics")
      .select("value, recorded_date")
      .eq("client_id", clientId)
      .eq("metric_type", "clubhead_speed")
      .order("recorded_date", { ascending: false })
      .limit(2);

    // Fetch latest handicap
    const { data: handicapData } = await supabase
      .from("performance_metrics")
      .select("value, recorded_date")
      .eq("client_id", clientId)
      .eq("metric_type", "handicap")
      .order("recorded_date", { ascending: false })
      .limit(2);

    const newStats: QuickStat[] = [];

    if (speedData && speedData.length > 0) {
      const latestSpeed = speedData[0].value;
      const previousSpeed = speedData[1]?.value;
      const change = previousSpeed ? latestSpeed - previousSpeed : 0;
      newStats.push({
        label: "Clubhead Speed",
        value: latestSpeed.toFixed(1),
        unit: "mph",
        change: change >= 0 ? `+${change.toFixed(1)} mph` : `${change.toFixed(1)} mph`,
      });
    }

    if (handicapData && handicapData.length > 0) {
      const latestHandicap = handicapData[0].value;
      const previousHandicap = handicapData[1]?.value;
      const change = previousHandicap ? latestHandicap - previousHandicap : 0;
      newStats.push({
        label: "Handicap",
        value: latestHandicap < 0 ? `+${Math.abs(latestHandicap).toFixed(1)}` : latestHandicap.toFixed(1),
        unit: "",
        change: change <= 0 ? `${change.toFixed(1)} strokes` : `+${change.toFixed(1)} strokes`,
      });
    }

    setStats(newStats);
  };

  const fetchWorkoutStreak = async () => {
    const { data } = await supabase
      .from("workout_logs")
      .select("workout_date")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .order("workout_date", { ascending: false })
      .limit(30);

    if (!data || data.length === 0) {
      setWorkoutStreak(0);
      return;
    }

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < data.length; i++) {
      const workoutDate = new Date(data[i].workout_date!);
      workoutDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (workoutDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && workoutDate.getTime() === expectedDate.getTime() - 86400000) {
        // Allow yesterday as start of streak
        streak++;
      } else {
        break;
      }
    }

    setWorkoutStreak(streak);
  };

  const exercisesWithCompletion = todayExercises.map(ex => ({
    ...ex,
    completed: completedToday.includes(ex.id),
  }));

  const completedCount = exercisesWithCompletion.filter(ex => ex.completed).length;
  const totalCount = exercisesWithCompletion.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getDayInfo = () => {
    if (!activeProgram) return "";
    return `Week ${activeProgram.current_week}, Day ${((new Date().getDay() || 7))}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Homework Section */}
      {activeHomework.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <h2 className="font-semibold text-lg text-foreground">Active Homework</h2>
          </div>
          <div className="space-y-3">
            {activeHomework.map((assignment) => (
              <ActiveHomeworkCard
                key={assignment.id}
                assignment={assignment}
                onStartWorkout={handleHomeworkStart}
              />
            ))}
          </div>
        </div>
      )}

      {/* Today's Workout Card */}
      {activeProgram && todayExercises.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="gradient-primary p-6">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="secondary" className="mb-2 bg-primary-foreground/20 text-primary-foreground border-0">
                  {getDayInfo()}
                </Badge>
                <h2 className="text-2xl font-bold text-primary-foreground mb-1">
                  {activeProgram.program.name}
                </h2>
                <p className="text-primary-foreground/70 text-sm">
                  {totalCount} exercises • {activeProgram.program.training_phase || "Training"}
                </p>
              </div>
              <Button 
                variant="accent" 
                size="lg" 
                className="shadow-gold"
                onClick={() => onStartWorkout(exercisesWithCompletion, activeProgram.program.name, getDayInfo())}
              >
                <Play className="h-5 w-5 mr-2" />
                {completedCount > 0 ? "Continue" : "Start"}
              </Button>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-primary-foreground/70 mb-2">
                <span>Progress</span>
                <span>{completedCount}/{totalCount}</span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-2 bg-primary-foreground/20"
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
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center py-8">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Workout Scheduled</h3>
            <p className="text-muted-foreground">
              {activeProgram 
                ? "No exercises scheduled for today. Enjoy your rest day!" 
                : "You don't have an active program yet. Contact your coach to get started."}
            </p>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {stat.value}
                {stat.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-xs mt-1 ${stat.change.startsWith("+") || stat.change.startsWith("-") && stat.label === "Handicap" ? "text-success" : "text-muted-foreground"}`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">
              {workoutStreak}
              <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
            </p>
            <p className="text-xs text-muted-foreground">Workout Streak</p>
            <p className="text-xs text-success mt-1">
              {workoutStreak > 0 ? "Keep it going!" : "Start today!"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Habit Tracker */}
      <HabitTracker clientId={clientId} />

      {/* Performance Chart */}
      <ClubheadSpeedChart />
    </div>
  );
};

export default TodayTab;
