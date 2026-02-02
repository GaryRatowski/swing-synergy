import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Clock, 
  Dumbbell, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Calendar as CalendarIcon,
  Zap,
  Filter,
  X,
  Activity,
  CheckCircle2
} from "lucide-react";

interface WorkoutLog {
  id: string;
  workout_date: string | null;
  notes: string | null;
  overall_rpe: number | null;
  duration_minutes: number | null;
  completed_at: string | null;
}

interface StructuredNotes {
  sessionType: string;
  focusAreas: string[];
  clientEnergy: number;
  exerciseSummary: string;
  keyAchievements: string;
  areasToImprove: string;
  coachNotes: string;
}

interface SessionHistoryListProps {
  workoutLogs: WorkoutLog[];
  onSelectWorkout: (workout: WorkoutLog) => void;
  isLoading: boolean;
}

const FOCUS_AREA_LABELS: Record<string, string> = {
  power: "Power",
  mobility: "Mobility",
  strength: "Strength",
  stability: "Stability",
  rotation: "Rotation",
  speed: "Speed",
  recovery: "Recovery",
  technique: "Technique",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  training: "Training",
  assessment: "Assessment",
  lesson: "Golf Lesson",
  warmup: "Warm-up",
  recovery: "Recovery",
  competition: "Competition Prep",
};

const parseNotes = (notes: string | null): StructuredNotes | null => {
  if (!notes) return null;
  
  try {
    const parsed = JSON.parse(notes);
    if (parsed.sessionType || parsed.focusAreas || parsed.keyAchievements) {
      return parsed as StructuredNotes;
    }
    return null;
  } catch {
    return null;
  }
};

// Summary Stats Component
const SessionSummary = ({ workoutLogs }: { workoutLogs: WorkoutLog[] }) => {
  const stats = useMemo(() => {
    const completed = workoutLogs.filter(w => w.completed_at);
    const totalMinutes = workoutLogs.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
    const rpeValues = workoutLogs.filter(w => w.overall_rpe).map(w => w.overall_rpe!);
    const avgRpe = rpeValues.length > 0 
      ? (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1) 
      : null;
    
    // Count focus areas
    const focusAreaCounts: Record<string, number> = {};
    workoutLogs.forEach(w => {
      const notes = parseNotes(w.notes);
      notes?.focusAreas?.forEach(area => {
        focusAreaCounts[area] = (focusAreaCounts[area] || 0) + 1;
      });
    });
    
    const topFocusAreas = Object.entries(focusAreaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => area);

    return {
      total: workoutLogs.length,
      completed: completed.length,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      avgRpe,
      topFocusAreas,
    };
  }, [workoutLogs]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Sessions</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.completed}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Hours</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.totalHours}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Avg RPE</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.avgRpe || "—"}</p>
        </CardContent>
      </Card>

      {stats.topFocusAreas.length > 0 && (
        <Card className="col-span-2 md:col-span-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Top Focus Areas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.topFocusAreas.map(area => (
                <Badge key={area} variant="secondary">
                  {FOCUS_AREA_LABELS[area] || area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Filters Component
const SessionFilters = ({
  dateFrom,
  dateTo,
  sessionType,
  status,
  onDateFromChange,
  onDateToChange,
  onSessionTypeChange,
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
}: {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  sessionType: string;
  status: string;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  onSessionTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) => {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={onDateFromChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={onDateToChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Session Type */}
        <Select value={sessionType} onValueChange={onSessionTypeChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Session type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const SessionCard = ({ 
  workout, 
  onClick,
  isExpanded,
  onToggleExpand 
}: { 
  workout: WorkoutLog; 
  onClick: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  const structuredNotes = parseNotes(workout.notes);
  const hasStructuredData = structuredNotes !== null;
  
  return (
    <Card className="overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onClick}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {workout.workout_date 
                  ? format(new Date(workout.workout_date), "EEEE, MMM d, yyyy")
                  : "No date"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {hasStructuredData && structuredNotes?.sessionType && (
                  <Badge variant="outline" className="text-xs">
                    {SESSION_TYPE_LABELS[structuredNotes.sessionType] || structuredNotes.sessionType}
                  </Badge>
                )}
                <Badge variant={workout.completed_at ? "default" : "secondary"}>
                  {workout.completed_at ? "Completed" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {workout.duration_minutes && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{workout.duration_minutes} min</span>
              </div>
            )}
            {workout.overall_rpe && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                <span>RPE {workout.overall_rpe}</span>
              </div>
            )}
          </div>
        </div>

        {/* Focus Areas Pills */}
        {hasStructuredData && structuredNotes?.focusAreas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <Target className="h-4 w-4 text-muted-foreground mr-1" />
            {structuredNotes.focusAreas.map(area => (
              <Badge key={area} variant="secondary" className="text-xs">
                {FOCUS_AREA_LABELS[area] || area}
              </Badge>
            ))}
          </div>
        )}

        {/* Expandable Section Toggle */}
        {hasStructuredData && (structuredNotes?.keyAchievements || structuredNotes?.areasToImprove || structuredNotes?.exerciseSummary) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && hasStructuredData && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Client Energy */}
          {structuredNotes?.clientEnergy && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Client Energy:</span>
              <span className="font-medium">{structuredNotes.clientEnergy}/10</span>
            </div>
          )}

          {/* Exercise Summary */}
          {structuredNotes?.exerciseSummary && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Dumbbell className="h-4 w-4" />
                Exercises
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {structuredNotes.exerciseSummary}
              </p>
            </div>
          )}

          {/* Key Achievements */}
          {structuredNotes?.keyAchievements && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <TrendingUp className="h-4 w-4" />
                Key Achievements
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {structuredNotes.keyAchievements}
              </p>
            </div>
          )}

          {/* Areas to Improve */}
          {structuredNotes?.areasToImprove && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Areas to Improve
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {structuredNotes.areasToImprove}
              </p>
            </div>
          )}

          {/* Additional Notes */}
          {structuredNotes?.coachNotes && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Coach Notes</div>
              <p className="text-sm text-muted-foreground">
                {structuredNotes.coachNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const SessionHistoryList = ({ workoutLogs, onSelectWorkout, isLoading }: SessionHistoryListProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sessionType, setSessionType] = useState("all");
  const [status, setStatus] = useState("all");

  const hasActiveFilters = dateFrom !== undefined || dateTo !== undefined || sessionType !== "all" || status !== "all";

  const filteredLogs = useMemo(() => {
    return workoutLogs.filter(workout => {
      // Date filters
      if (workout.workout_date) {
        const workoutDate = new Date(workout.workout_date);
        if (dateFrom && isBefore(workoutDate, startOfDay(dateFrom))) return false;
        if (dateTo && isAfter(workoutDate, endOfDay(dateTo))) return false;
      } else if (dateFrom || dateTo) {
        return false;
      }

      // Session type filter
      if (sessionType !== "all") {
        const notes = parseNotes(workout.notes);
        if (!notes || notes.sessionType !== sessionType) return false;
      }

      // Status filter
      if (status === "completed" && !workout.completed_at) return false;
      if (status === "pending" && workout.completed_at) return false;

      return true;
    });
  }, [workoutLogs, dateFrom, dateTo, sessionType, status]);

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSessionType("all");
    setStatus("all");
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading session history...
        </CardContent>
      </Card>
    );
  }

  if (workoutLogs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No training sessions recorded yet. Click "Add Session" to create one.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <SessionSummary workoutLogs={filteredLogs} />

      {/* Filters */}
      <SessionFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        sessionType={sessionType}
        status={status}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSessionTypeChange={setSessionType}
        onStatusChange={setStatus}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Session List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Session History</span>
            <Badge variant="secondary">
              {filteredLogs.length}{hasActiveFilters ? ` of ${workoutLogs.length}` : ""} sessions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No sessions match the current filters.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 p-4 pt-0">
                {filteredLogs.map(workout => (
                  <SessionCard
                    key={workout.id}
                    workout={workout}
                    onClick={() => onSelectWorkout(workout)}
                    isExpanded={expandedIds.has(workout.id)}
                    onToggleExpand={() => toggleExpanded(workout.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionHistoryList;
