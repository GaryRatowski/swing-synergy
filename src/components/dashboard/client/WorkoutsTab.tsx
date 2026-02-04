import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkoutExecution from "./WorkoutExecution";
import ClientSessionCard from "./ClientSessionCard";
import ClientSessionDetail from "./ClientSessionDetail";
import { ExerciseData } from "./ExerciseCard";
import {
  Calendar,
  Dumbbell,
  CheckCircle2,
  Clock,
  ChevronRight,
  Play,
} from "lucide-react";
import { format, startOfWeek, addDays, isToday, isBefore, parseISO } from "date-fns";

interface WorkoutsTabProps {
  clientId: string;
}

interface WorkoutDay {
  dayNumber: number;
  dayName: string;
  date: Date;
  exercises: ExerciseData[];
  isCompleted: boolean;
  isToday: boolean;
  isPast: boolean;
}

interface WorkoutLog {
  id: string;
  workout_date: string;
  duration_minutes: number | null;
  overall_rpe: number | null;
  completed_at: string | null;
  notes: string | null;
  session_type: string | null;
  program: {
    name: string;
  } | null;
}

interface ActiveProgram {
  id: string;
  program_id: string;
  current_week: number;
  program: {
    name: string;
    training_phase: string | null;
    duration_weeks: number | null;
  };
}

const WorkoutsTab = ({ clientId }: WorkoutsTabProps) => {
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [weekWorkouts, setWeekWorkouts] = useState<WorkoutDay[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeWorkout, setActiveWorkout] = useState<{
    exercises: ExerciseData[];
    programName: string;
    dayInfo: string;
  } | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchActiveProgram(),
        fetchWorkoutHistory(),
      ]);
    } catch (error) {
      console.error("Error fetching workouts:", error);
    } finally {
      setIsLoading(false);
    }
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
        program: program,
      });

      await fetchWeekWorkouts(programData.program_id!, programData.current_week || 1);
    }
  };

  const fetchWeekWorkouts = async (programId: string, weekNumber: number) => {
    // Get this week's dates
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start

    // Fetch all exercises for this week
    const { data: exercisesData } = await supabase
      .from("program_exercises")
      .select(`
        id,
        day_number,
        sets,
        reps,
        rest_seconds,
        notes,
        exercise:exercises (
          id,
          name,
          coaching_cues,
          video_url
        )
      `)
      .eq("program_id", programId)
      .eq("week_number", weekNumber)
      .order("day_number")
      .order("order_index");

    // Fetch completed workouts for this week
    const weekDates = Array.from({ length: 7 }, (_, i) => 
      format(addDays(weekStart, i), "yyyy-MM-dd")
    );

    const { data: completedLogs } = await supabase
      .from("workout_logs")
      .select("workout_date")
      .eq("client_id", clientId)
      .in("workout_date", weekDates)
      .not("completed_at", "is", null);

    const completedDates = new Set(completedLogs?.map(l => l.workout_date) || []);

    // Group exercises by day
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const workouts: WorkoutDay[] = dayNames.map((dayName, index) => {
      const dayNumber = index + 1;
      const date = addDays(weekStart, index);
      const dateStr = format(date, "yyyy-MM-dd");
      
      const dayExercises = exercisesData
        ?.filter(e => e.day_number === dayNumber && e.exercise)
        .map(e => {
          const exercise = e.exercise as { id: string; name: string; coaching_cues: string | null; video_url: string | null };
          return {
            id: exercise.id,
            name: exercise.name,
            sets: e.sets || 3,
            reps: e.reps || "10",
            rest_seconds: e.rest_seconds || 60,
            notes: e.notes,
            coaching_cues: exercise.coaching_cues,
            video_url: exercise.video_url,
            completed: false,
          };
        }) || [];

      return {
        dayNumber,
        dayName,
        date,
        exercises: dayExercises,
        isCompleted: completedDates.has(dateStr),
        isToday: isToday(date),
        isPast: isBefore(date, today) && !isToday(date),
      };
    });

    setWeekWorkouts(workouts);
  };

  const fetchWorkoutHistory = async () => {
    // Fetch ALL workout logs including coach-added sessions (with or without program)
    const { data, error } = await supabase
      .from("workout_logs")
      .select(`
        id,
        workout_date,
        duration_minutes,
        overall_rpe,
        completed_at,
        notes,
        session_type,
        program:programs (
          name
        )
      `)
      .eq("client_id", clientId)
      .order("workout_date", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error fetching workout history:", error);
      return;
    }

    if (data) {
      setWorkoutHistory(data.map(d => ({
        ...d,
        program: d.program as { name: string } | null,
      })));
    }
  };

  const startWorkout = (workout: WorkoutDay) => {
    if (!activeProgram || workout.exercises.length === 0) return;
    
    setActiveWorkout({
      exercises: workout.exercises,
      programName: activeProgram.program.name,
      dayInfo: `Week ${activeProgram.current_week}, ${workout.dayName}`,
    });
  };

  const handleWorkoutComplete = () => {
    setActiveWorkout(null);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (activeWorkout) {
    return (
      <WorkoutExecution
        clientId={clientId}
        programId={activeProgram?.program_id}
        exercises={activeWorkout.exercises}
        programName={activeWorkout.programName}
        dayInfo={activeWorkout.dayInfo}
        onClose={() => setActiveWorkout(null)}
        onComplete={handleWorkoutComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-4 mt-4">
          {activeProgram ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{activeProgram.program.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Week {activeProgram.current_week} of {activeProgram.program.duration_weeks || "?"}
                  </p>
                </div>
                <Badge variant="outline">{activeProgram.program.training_phase || "Training"}</Badge>
              </div>

              <div className="space-y-3">
                {weekWorkouts.map((workout) => (
                  <Card 
                    key={workout.dayNumber} 
                    className={`${workout.isToday ? "ring-2 ring-primary" : ""} ${workout.isCompleted ? "bg-success/5" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {workout.isCompleted ? (
                            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              workout.isToday ? "bg-primary/20" : "bg-muted"
                            }`}>
                              <Dumbbell className={`h-5 w-5 ${workout.isToday ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{workout.dayName}</p>
                              {workout.isToday && (
                                <Badge className="text-xs">Today</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {workout.exercises.length > 0 
                                ? `${workout.exercises.length} exercises`
                                : "Rest day"}
                            </p>
                          </div>
                        </div>
                        
                        {workout.exercises.length > 0 && !workout.isCompleted && (
                          <Button 
                            size="sm" 
                            onClick={() => startWorkout(workout)}
                            variant={workout.isToday ? "default" : "outline"}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        
                        {workout.isCompleted && (
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Complete
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="p-6">
              <div className="text-center py-8">
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Program</h3>
                <p className="text-muted-foreground">
                  You don't have an active program yet. Contact your coach to get started.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {workoutHistory.length > 0 ? (
            <div className="space-y-3">
              {workoutHistory.map((log) => (
                <ClientSessionCard
                  key={log.id}
                  id={log.id}
                  workoutDate={log.workout_date!}
                  durationMinutes={log.duration_minutes}
                  overallRpe={log.overall_rpe}
                  notes={log.notes}
                  programName={log.program?.name}
                  sessionType={log.session_type}
                  onClick={() => setSelectedSessionId(log.id)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Session History</h3>
                <p className="text-muted-foreground">
                  Your session history will appear here once your coach logs sessions.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Session Detail Modal */}
      {selectedSessionId && (
        <ClientSessionDetail
          sessionId={selectedSessionId}
          isOpen={!!selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
};

export default WorkoutsTab;
