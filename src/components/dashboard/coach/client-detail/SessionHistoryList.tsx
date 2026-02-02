import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { 
  Clock, 
  Dumbbell, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Calendar as CalendarIcon,
  Zap
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Session History</span>
          <Badge variant="secondary">{workoutLogs.length} sessions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 p-4 pt-0">
            {workoutLogs.map(workout => (
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
      </CardContent>
    </Card>
  );
};

export default SessionHistoryList;
