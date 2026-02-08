import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Dumbbell, Target, Clock } from "lucide-react";

interface ProgramExercise {
  id: string;
  week_number: number | null;
  day_number: number | null;
  exercise_id: string | null;
}

interface ProgramOverviewProps {
  totalWeeks: number;
  daysPerWeek: number;
  exercises: ProgramExercise[];
  onSelectWeekDay: (week: number, day: number) => void;
}

const ProgramOverview = ({
  totalWeeks,
  daysPerWeek,
  exercises,
  onSelectWeekDay,
}: ProgramOverviewProps) => {
  // Count exercises per week/day
  const getExerciseCount = (week: number, day: number) => {
    return exercises.filter(
      (ex) => ex.week_number === week && ex.day_number === day
    ).length;
  };

  const totalExercises = exercises.length;
  const totalSessions = totalWeeks * daysPerWeek;
  const sessionsWithExercises = new Set(
    exercises.map((ex) => `${ex.week_number}-${ex.day_number}`)
  ).size;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Weeks</p>
              <p className="text-lg font-semibold">{totalWeeks}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-lg font-semibold">{totalSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-3 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Exercises</p>
              <p className="text-lg font-semibold">{totalExercises}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Planned</p>
              <p className="text-lg font-semibold">{sessionsWithExercises}/{totalSessions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week/Day Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-muted-foreground">Week</th>
              {Array.from({ length: daysPerWeek }, (_, i) => (
                <th key={i} className="text-center p-2 font-medium text-muted-foreground">
                  Day {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalWeeks }, (_, weekIdx) => {
              const week = weekIdx + 1;
              return (
                <tr key={week} className="border-t border-border/50">
                  <td className="p-2 font-medium">Week {week}</td>
                  {Array.from({ length: daysPerWeek }, (_, dayIdx) => {
                    const day = dayIdx + 1;
                    const count = getExerciseCount(week, day);
                    return (
                      <td key={day} className="p-1 text-center">
                        <button
                          className={`w-full p-2 rounded-md transition-colors ${
                            count > 0
                              ? "bg-primary/10 hover:bg-primary/20 border border-primary/20"
                              : "bg-muted/50 hover:bg-muted border border-transparent"
                          }`}
                          onClick={() => onSelectWeekDay(week, day)}
                        >
                          {count > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {count} exercise{count !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Empty</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgramOverview;
