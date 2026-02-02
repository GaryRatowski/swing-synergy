import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import SessionNotesDialog from "./SessionNotesDialog";

interface TrainingCalendarTabProps {
  clientId: string;
}

interface WorkoutLog {
  id: string;
  workout_date: string | null;
  notes: string | null;
  overall_rpe: number | null;
  duration_minutes: number | null;
  completed_at: string | null;
}

const TrainingCalendarTab = ({ clientId }: TrainingCalendarTabProps) => {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchWorkoutLogs();
  }, [clientId]);

  const fetchWorkoutLogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("client_id", clientId)
      .order("workout_date", { ascending: false });

    if (error) {
      console.error("Error fetching workout logs:", error);
    } else {
      setWorkoutLogs(data || []);
    }
    setIsLoading(false);
  };

  const workoutDates = workoutLogs
    .filter(w => w.workout_date)
    .map(w => new Date(w.workout_date!));

  const completedDates = workoutLogs
    .filter(w => w.workout_date && w.completed_at)
    .map(w => new Date(w.workout_date!));

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const workout = workoutLogs.find(w => 
        w.workout_date && isSameDay(new Date(w.workout_date), date)
      );
      if (workout) {
        setSelectedWorkout(workout);
        setIsDialogOpen(true);
      }
    }
  };

  const handleNotesUpdated = () => {
    fetchWorkoutLogs();
  };

  // Custom day rendering to show workout indicators
  const modifiers = {
    workout: workoutDates,
    completed: completedDates,
  };

  const modifiersClassNames = {
    workout: "bg-primary/20 text-primary font-semibold",
    completed: "bg-success/20 text-success font-semibold ring-2 ring-success/50",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className="w-full"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary/40" />
          <span className="text-muted-foreground">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success/40 ring-2 ring-success/50" />
          <span className="text-muted-foreground">Completed</span>
        </div>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : workoutLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workout sessions recorded</p>
          ) : (
            <div className="space-y-2">
              {workoutLogs.slice(0, 5).map(workout => (
                <div 
                  key={workout.id} 
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                  onClick={() => {
                    setSelectedWorkout(workout);
                    setIsDialogOpen(true);
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {workout.workout_date 
                        ? format(new Date(workout.workout_date), "MMM d, yyyy")
                        : "No date"}
                    </p>
                    {workout.notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-48">
                        {workout.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {workout.overall_rpe && (
                      <Badge variant="outline" className="text-xs">
                        RPE {workout.overall_rpe}
                      </Badge>
                    )}
                    {workout.duration_minutes && (
                      <Badge variant="secondary" className="text-xs">
                        {workout.duration_minutes} min
                      </Badge>
                    )}
                    <Badge variant={workout.completed_at ? "default" : "outline"}>
                      {workout.completed_at ? "Done" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SessionNotesDialog
        workout={selectedWorkout}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onNotesUpdated={handleNotesUpdated}
      />
    </div>
  );
};

export default TrainingCalendarTab;
