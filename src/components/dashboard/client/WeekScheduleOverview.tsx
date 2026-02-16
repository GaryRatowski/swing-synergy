import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, CheckCircle2 } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayWorkout {
  day: number;
  dayName: string;
  dayNameFull: string;
  templates: { id: string; name: string; exerciseCount: number }[];
  isToday: boolean;
  completed: boolean;
}

interface WeekScheduleOverviewProps {
  clientId: string;
}

const WeekScheduleOverview = ({ clientId }: WeekScheduleOverviewProps) => {
  const [weekData, setWeekData] = useState<DayWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeekSchedule();
  }, [clientId]);

  const fetchWeekSchedule = async () => {
    setIsLoading(true);
    try {
      // Get active program
      const { data: activeProgram } = await supabase
        .from("client_programs")
        .select("program_id, current_week")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .single();

      if (!activeProgram) {
        setWeekData([]);
        setIsLoading(false);
        return;
      }

      // Get workout assignments for current week
      const { data: assignments } = await supabase
        .from("program_workout_assignments")
        .select(`
          day_of_week,
          template:workout_templates (id, name)
        `)
        .eq("program_id", activeProgram.program_id)
        .eq("week_number", activeProgram.current_week || 1);

      // Get completed workouts this week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { data: completedLogs } = await supabase
        .from("workout_logs")
        .select("workout_date")
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .gte("workout_date", weekStart.toISOString().split("T")[0])
        .lte("workout_date", weekEnd.toISOString().split("T")[0]);

      const completedDates = new Set((completedLogs || []).map((l) => l.workout_date));

      // Get exercise counts per template
      const templateIds = [...new Set((assignments || []).map((a: any) => a.template?.id).filter(Boolean))];
      const exerciseCounts: Record<string, number> = {};
      for (const tid of templateIds) {
        const { count } = await supabase
          .from("workout_template_exercises")
          .select("*", { count: "exact", head: true })
          .eq("template_id", tid);
        exerciseCounts[tid] = count || 0;
      }

      const today = now.getDay();
      const week: DayWorkout[] = Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);
        const dateStr = dayDate.toISOString().split("T")[0];

        const dayAssignments = (assignments || [])
          .filter((a: any) => a.day_of_week === i && a.template)
          .map((a: any) => ({
            id: a.template.id,
            name: a.template.name,
            exerciseCount: exerciseCounts[a.template.id] || 0,
          }));

        return {
          day: i,
          dayName: DAY_NAMES[i],
          dayNameFull: DAY_NAMES_FULL[i],
          templates: dayAssignments,
          isToday: i === today,
          completed: completedDates.has(dateStr),
        };
      });

      setWeekData(week);
    } catch (error) {
      console.error("Error fetching week schedule:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  const hasAnyAssignments = weekData.some((d) => d.templates.length > 0);
  if (!hasAnyAssignments) return null;

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">This Week's Schedule</h3>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekData.map((day) => (
            <div
              key={day.day}
              className={`rounded-lg p-1.5 sm:p-2 text-center transition-colors min-h-[72px] flex flex-col ${
                day.isToday
                  ? "bg-primary/10 border border-primary/30"
                  : day.templates.length > 0
                  ? "bg-muted/50 border border-border"
                  : "bg-background border border-transparent"
              }`}
            >
              <span className={`text-[10px] sm:text-xs font-medium ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                {day.dayName}
              </span>
              <div className="flex-1 flex flex-col items-center justify-center gap-1 mt-1">
                {day.templates.length > 0 ? (
                  <>
                    {day.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Dumbbell className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span className="text-[9px] sm:text-[10px] leading-tight text-foreground font-medium line-clamp-2">
                      {day.templates[0].name}
                    </span>
                    {day.templates.length > 1 && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">
                        +{day.templates.length - 1}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">Rest</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeekScheduleOverview;
