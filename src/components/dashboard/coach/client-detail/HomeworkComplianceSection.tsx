import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay, getDay, startOfWeek, addDays } from "date-fns";

interface HomeworkAssignment {
  id: string;
  name: string;
  frequency_type: string;
  frequency_count: number | null;
  start_date: string;
  end_date: string | null;
}

interface WorkoutLog {
  id: string;
  workout_date: string;
  completed_at: string | null;
  duration_minutes: number | null;
  overall_rpe: number | null;
}

interface HomeworkComplianceSectionProps {
  clientId: string;
}

const HomeworkComplianceSection = ({ clientId }: HomeworkComplianceSectionProps) => {
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<Record<string, WorkoutLog[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    // Fetch active homework assignments
    const { data: assignmentsData } = await supabase
      .from("homework_assignments")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .lte("start_date", format(today, "yyyy-MM-dd"))
      .or(`end_date.gte.${format(today, "yyyy-MM-dd")},end_date.is.null`);

    if (assignmentsData && assignmentsData.length > 0) {
      setAssignments(assignmentsData);
      
      // Fetch workout logs for each assignment
      const logsMap: Record<string, WorkoutLog[]> = {};
      
      for (const assignment of assignmentsData) {
        const { data: logs } = await supabase
          .from("workout_logs")
          .select("id, workout_date, completed_at, duration_minutes, overall_rpe")
          .eq("homework_assignment_id", assignment.id)
          .gte("workout_date", format(thirtyDaysAgo, "yyyy-MM-dd"))
          .lte("workout_date", format(today, "yyyy-MM-dd"))
          .not("completed_at", "is", null);
        
        logsMap[assignment.id] = logs || [];
      }
      
      setWorkoutLogs(logsMap);
    }
    
    setLoading(false);
  };

  const getFrequencyLabel = (type: string, count: number | null) => {
    switch (type) {
      case "daily": return "Daily";
      case "weekly_3x": return "3x/week";
      case "weekly_2x": return "2x/week";
      case "weekly_1x": return "1x/week";
      case "custom": return `${count}x/week`;
      default: return type;
    }
  };

  const calculateCompliance = (logs: WorkoutLog[]) => {
    const uniqueDays = new Set(logs.map(log => log.workout_date));
    const completedDays = uniqueDays.size;
    const percentage = Math.round((completedDays / 30) * 100);
    return { completedDays, percentage };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Homework Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Homework Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active homework assignments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Homework Compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.map((assignment) => {
          const logs = workoutLogs[assignment.id] || [];
          const { completedDays, percentage } = calculateCompliance(logs);
          
          return (
            <div key={assignment.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{assignment.name}</span>
                <Badge variant="outline" className="text-xs">
                  {getFrequencyLabel(assignment.frequency_type, assignment.frequency_count)}
                </Badge>
              </div>
              
              <ComplianceHeatmap logs={logs} />
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {percentage >= 70 && <CheckCircle className="h-3 w-3 text-success" />}
                <span>
                  {completedDays}/30 days completed ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

interface ComplianceHeatmapProps {
  logs: WorkoutLog[];
}

const ComplianceHeatmap = ({ logs }: ComplianceHeatmapProps) => {
  const today = startOfDay(new Date());
  const thirtyDaysAgo = subDays(today, 29);
  
  // Get the start of the week containing thirtyDaysAgo
  const gridStart = startOfWeek(thirtyDaysAgo, { weekStartsOn: 0 });
  const gridEnd = today;
  
  // Generate all days for the grid
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  
  // Create weeks for the grid
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  allDays.forEach((day, index) => {
    currentWeek.push(day);
    if (getDay(day) === 6 || index === allDays.length - 1) {
      // Pad incomplete weeks
      while (currentWeek.length < 7) {
        currentWeek.push(addDays(currentWeek[currentWeek.length - 1], 1));
      }
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const getLogForDay = (day: Date) => {
    return logs.find(log => isSameDay(new Date(log.workout_date), day));
  };

  const isInRange = (day: Date) => {
    return day >= thirtyDaysAgo && day <= today;
  };

  return (
    <div className="space-y-1">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-[2px] text-[10px] text-muted-foreground mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-center w-4">{d}</span>
        ))}
      </div>
      
      {/* Heatmap grid */}
      <div className="space-y-[2px]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-[2px]">
            {week.map((day, dayIndex) => {
              const log = getLogForDay(day);
              const inRange = isInRange(day);
              const hasLog = log && log.completed_at;
              
              return (
                <Popover key={dayIndex}>
                  <PopoverTrigger asChild>
                    <button
                      className={`w-4 h-4 rounded-sm transition-colors ${
                        !inRange
                          ? "bg-transparent"
                          : hasLog
                          ? "bg-success hover:bg-success/80"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      disabled={!inRange || !hasLog}
                    />
                  </PopoverTrigger>
                  {hasLog && (
                    <PopoverContent className="w-48 p-3" align="center">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {format(day, "MMM d, yyyy")}
                        </p>
                        {log.duration_minutes && (
                          <p className="text-xs text-muted-foreground">
                            Duration: {log.duration_minutes} min
                          </p>
                        )}
                        {log.overall_rpe && (
                          <p className="text-xs text-muted-foreground">
                            RPE: {log.overall_rpe}/10
                          </p>
                        )}
                        <Badge variant="secondary" className="text-xs mt-1">
                          Completed
                        </Badge>
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeworkComplianceSection;
