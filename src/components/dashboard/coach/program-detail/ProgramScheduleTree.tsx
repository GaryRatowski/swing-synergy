import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Dumbbell, 
  Copy, 
  MoreVertical,
  Calendar,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ProgramExercise {
  id: string;
  week_number: number | null;
  day_number: number | null;
  exercise: { name: string } | null;
}

interface ProgramScheduleTreeProps {
  exercises: ProgramExercise[];
  totalWeeks: number;
  daysPerWeek: number;
  selectedWeek: number;
  selectedDay: number;
  onSelectDay: (week: number, day: number) => void;
  onCopyWeek?: (sourceWeek: number) => void;
  onClearDay?: (week: number, day: number) => void;
}

const ProgramScheduleTree = ({
  exercises,
  totalWeeks,
  daysPerWeek,
  selectedWeek,
  selectedDay,
  onSelectDay,
  onCopyWeek,
  onClearDay,
}: ProgramScheduleTreeProps) => {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(
    new Set([1, selectedWeek])
  );

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  };

  const getExerciseCount = (week: number, day: number) => {
    return exercises.filter(
      ex => ex.week_number === week && ex.day_number === day
    ).length;
  };

  const getWeekExerciseCount = (week: number) => {
    return exercises.filter(ex => ex.week_number === week).length;
  };

  const getDayLabel = (day: number): string => {
    const labels = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return labels[day] || `Day ${day}`;
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4" />
          Program Schedule
        </div>
        <Badge variant="outline" className="text-xs">
          {totalWeeks}w × {daysPerWeek}d
        </Badge>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => {
          const isExpanded = expandedWeeks.has(week);
          const weekExerciseCount = getWeekExerciseCount(week);
          
          return (
            <div key={week} className="border-b last:border-b-0">
              {/* Week Header */}
              <div 
                className={cn(
                  "flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer transition-colors",
                  selectedWeek === week && "bg-primary/5"
                )}
                onClick={() => toggleWeek(week)}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => { e.stopPropagation(); toggleWeek(week); }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                
                <span className="font-medium text-sm flex-1">Week {week}</span>
                
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    weekExerciseCount === 0 && "bg-muted text-muted-foreground"
                  )}
                >
                  {weekExerciseCount} exercises
                </Badge>
                
                {onCopyWeek && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onCopyWeek(week)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Week to...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {/* Day List */}
              {isExpanded && (
                <div className="pl-8 pb-2">
                  {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map(day => {
                    const exerciseCount = getExerciseCount(week, day);
                    const isSelected = selectedWeek === week && selectedDay === day;
                    
                    return (
                      <div
                        key={`${week}-${day}`}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group",
                          isSelected 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => onSelectDay(week, day)}
                      >
                        <Dumbbell className={cn(
                          "h-3.5 w-3.5",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                        
                        <span className={cn(
                          "text-sm flex-1",
                          !isSelected && exerciseCount === 0 && "text-muted-foreground"
                        )}>
                          Day {day}
                          <span className="text-xs ml-1 opacity-70">
                            ({getDayLabel(day)})
                          </span>
                        </span>
                        
                        <Badge 
                          variant={isSelected ? "secondary" : "outline"} 
                          className={cn(
                            "text-xs h-5",
                            !isSelected && exerciseCount === 0 && "opacity-50"
                          )}
                        >
                          {exerciseCount}
                        </Badge>
                        
                        {onClearDay && exerciseCount > 0 && !isSelected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearDay(week, day);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgramScheduleTree;
