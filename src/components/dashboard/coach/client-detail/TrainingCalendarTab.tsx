import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isSameDay } from "date-fns";
import { Plus } from "lucide-react";
import SessionNotesDialog from "./SessionNotesDialog";
import AddSessionDialog from "./AddSessionDialog";
import SessionHistoryList from "./SessionHistoryList";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
      <div className="flex justify-end">
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Session
        </Button>
      </div>

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

      {/* Session History */}
      <SessionHistoryList
        workoutLogs={workoutLogs}
        onSelectWorkout={(workout) => {
          setSelectedWorkout(workout);
          setIsDialogOpen(true);
        }}
        isLoading={isLoading}
      />

      <SessionNotesDialog
        workout={selectedWorkout}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onNotesUpdated={handleNotesUpdated}
      />

      <AddSessionDialog
        clientId={clientId}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSessionCreated={fetchWorkoutLogs}
      />
    </div>
  );
};

export default TrainingCalendarTab;
