import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgramProgressIndicatorProps {
  currentWeek: number;
  currentDay: number;
  totalWeeks: number;
  workoutsPerWeek: number;
  programName: string;
  lastWorkoutDate: string | null;
}

const ProgramProgressIndicator = ({
  currentWeek,
  currentDay,
  totalWeeks,
  workoutsPerWeek,
  programName,
  lastWorkoutDate,
}: ProgramProgressIndicatorProps) => {
  const totalSessions = totalWeeks * workoutsPerWeek;
  const completedSessions = ((currentWeek - 1) * workoutsPerWeek) + (currentDay - 1);
  const progressPercent = (completedSessions / totalSessions) * 100;

  const isComplete = currentWeek > totalWeeks || 
    (currentWeek === totalWeeks && currentDay > workoutsPerWeek);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Program Progress
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {isComplete ? "Complete" : `Week ${currentWeek} of ${totalWeeks}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{programName}</span>
            <span className="font-medium">
              {completedSessions}/{totalSessions} sessions
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Week Breakdown */}
        <div className="space-y-2">
          {Array.from({ length: Math.min(totalWeeks, 6) }, (_, i) => {
            const weekNum = i + 1;
            const isCurrentWeek = weekNum === currentWeek;
            const isCompletedWeek = weekNum < currentWeek;
            
            return (
              <div key={weekNum} className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                  isCompletedWeek && "bg-success text-success-foreground",
                  isCurrentWeek && "bg-primary text-primary-foreground",
                  !isCompletedWeek && !isCurrentWeek && "bg-muted text-muted-foreground"
                )}>
                  {isCompletedWeek ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    weekNum
                  )}
                </div>
                
                <span className={cn(
                  "text-sm flex-1",
                  isCurrentWeek && "font-medium text-foreground",
                  !isCurrentWeek && "text-muted-foreground"
                )}>
                  Week {weekNum}
                </span>
                
                {/* Day indicators */}
                <div className="flex gap-1">
                  {Array.from({ length: workoutsPerWeek }, (_, j) => {
                    const dayNum = j + 1;
                    const isDayCompleted = 
                      weekNum < currentWeek || 
                      (weekNum === currentWeek && dayNum < currentDay);
                    const isCurrentDay = weekNum === currentWeek && dayNum === currentDay;
                    
                    return (
                      <div 
                        key={dayNum}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isDayCompleted && "bg-success",
                          isCurrentDay && "bg-primary animate-pulse",
                          !isDayCompleted && !isCurrentDay && "bg-muted"
                        )}
                        title={`Day ${dayNum}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {totalWeeks > 6 && (
            <p className="text-xs text-muted-foreground text-center">
              +{totalWeeks - 6} more weeks
            </p>
          )}
        </div>

        {/* Last Workout Info */}
        {lastWorkoutDate && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Last workout: {new Date(lastWorkoutDate).toLocaleDateString()}
          </div>
        )}

        {/* Completion Message */}
        {isComplete && (
          <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
            <Trophy className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-success">Program Complete!</p>
              <p className="text-xs text-muted-foreground">
                Congratulations on finishing your program.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgramProgressIndicator;
