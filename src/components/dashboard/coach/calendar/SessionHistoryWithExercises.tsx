import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  History,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Activity,
  Clock,
  Target,
} from "lucide-react";

interface WorkoutLog {
  id: string;
  workout_date: string;
  duration_minutes: number | null;
  overall_rpe: number | null;
  session_type: string | null;
  coach_notes: string | null;
  completed_at: string | null;
}

interface ExerciseLogWithDetails {
  id: string;
  exercise_id: string;
  sets_completed: number | null;
  reps_completed: string | null;
  weight_used: string | null;
  notes: string | null;
  rpe: number | null;
  order_index: number | null;
  exercise: {
    name: string;
    thumbnail_url: string | null;
  } | null;
}

interface MetricLogWithDetails {
  id: string;
  metric_type: string;
  value: number;
  unit: string | null;
  value_left: number | null;
  value_right: number | null;
  is_bilateral: boolean | null;
}

interface SessionHistoryWithExercisesProps {
  clientId: string;
}

const SessionHistoryWithExercises = ({
  clientId,
}: SessionHistoryWithExercisesProps) => {
  const [sessions, setSessions] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [sessionExercises, setSessionExercises] = useState<Record<string, ExerciseLogWithDetails[]>>({});
  const [sessionMetrics, setSessionMetrics] = useState<Record<string, MetricLogWithDetails[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessions();
  }, [clientId]);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("client_id", clientId)
      .order("workout_date", { ascending: false })
      .limit(20);

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  };

  const loadSessionDetails = async (sessionId: string, sessionDate: string) => {
    if (sessionExercises[sessionId]) return; // Already loaded

    setLoadingDetails((prev) => new Set([...prev, sessionId]));

    // Load exercises and metrics in parallel
    const [exercisesResult, metricsResult] = await Promise.all([
      supabase
        .from("exercise_logs")
        .select(`
          id,
          exercise_id,
          sets_completed,
          reps_completed,
          weight_used,
          notes,
          rpe,
          order_index,
          exercises(name, thumbnail_url)
        `)
        .eq("workout_log_id", sessionId)
        .order("order_index", { ascending: true }),
      supabase
        .from("performance_metrics")
        .select("id, metric_type, value, unit, value_left, value_right, is_bilateral")
        .eq("client_id", clientId)
        .eq("recorded_date", sessionDate),
    ]);

    if (exercisesResult.data) {
      const exercises: ExerciseLogWithDetails[] = exercisesResult.data.map((e: any) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        sets_completed: e.sets_completed,
        reps_completed: e.reps_completed,
        weight_used: e.weight_used,
        notes: e.notes,
        rpe: e.rpe,
        order_index: e.order_index,
        exercise: e.exercises,
      }));
      setSessionExercises((prev) => ({ ...prev, [sessionId]: exercises }));
    }

    if (metricsResult.data) {
      setSessionMetrics((prev) => ({ ...prev, [sessionId]: metricsResult.data }));
    }

    setLoadingDetails((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
  };

  const toggleSession = (session: WorkoutLog) => {
    const sessionId = session.id;
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
        loadSessionDetails(sessionId, session.workout_date);
      }
      return next;
    });
  };

  const formatMetricLabel = (type: string): string => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <History className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No session history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isExpanded = expandedSessions.has(session.id);
        const isLoadingDetails = loadingDetails.has(session.id);
        const exercises = sessionExercises[session.id] || [];
        const metrics = sessionMetrics[session.id] || [];

        return (
          <Collapsible key={session.id} open={isExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSession(session)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="font-medium text-sm">
                          {format(parseISO(session.workout_date), "MMM d, yyyy")}
                        </p>
                        {session.session_type && (
                          <Badge variant="outline" className="text-xs">
                            {session.session_type}
                          </Badge>
                        )}
                        {session.completed_at && (
                          <Badge variant="secondary" className="text-xs">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-muted-foreground">
                        {session.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.duration_minutes} min
                          </span>
                        )}
                        {session.overall_rpe && (
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            RPE: {session.overall_rpe}/10
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  {isLoadingDetails ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Exercises Section */}
                      {exercises.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Dumbbell className="h-3.5 w-3.5" />
                            Exercises ({exercises.length})
                          </div>
                          <div className="space-y-1.5">
                            {exercises.map((ex) => (
                              <div
                                key={ex.id}
                                className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                              >
                                {/* Thumbnail */}
                                <div className="w-8 h-8 rounded bg-muted flex-shrink-0 overflow-hidden">
                                  {ex.exercise?.thumbnail_url ? (
                                    <img
                                      src={ex.exercise.thumbnail_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Dumbbell className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>

                                {/* Exercise Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {ex.exercise?.name || "Unknown Exercise"}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {ex.sets_completed && ex.reps_completed && (
                                      <span>
                                        {ex.sets_completed} × {ex.reps_completed}
                                      </span>
                                    )}
                                    {ex.weight_used && <span>@ {ex.weight_used}</span>}
                                    {ex.rpe && <span>RPE {ex.rpe}</span>}
                                  </div>
                                </div>

                                {/* Notes badge */}
                                {ex.notes && (
                                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                    Notes
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metrics Section */}
                      {metrics.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Activity className="h-3.5 w-3.5" />
                            Metrics ({metrics.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {metrics.map((m) => (
                              <Badge
                                key={m.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {formatMetricLabel(m.metric_type)}:{" "}
                                {m.is_bilateral
                                  ? `L: ${m.value_left} / R: ${m.value_right}`
                                  : m.value}
                                {m.unit && ` ${m.unit}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coach Notes Preview */}
                      {session.coach_notes && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Notes
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {session.coach_notes}
                          </p>
                        </div>
                      )}

                      {/* Empty state */}
                      {exercises.length === 0 && metrics.length === 0 && !session.coach_notes && (
                        <p className="text-xs text-muted-foreground italic">
                          No exercises, metrics, or notes recorded for this session.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default SessionHistoryWithExercises;
