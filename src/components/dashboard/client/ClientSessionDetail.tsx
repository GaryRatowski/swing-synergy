import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  X,
  Clock,
  FileText,
  Lightbulb,
  Activity,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Loader2,
  Check,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface SessionData {
  id: string;
  workout_date: string;
  session_type: string | null;
  duration_minutes: number | null;
  coach_notes: string | null;
  key_findings: string | null;
  overall_rpe: number | null;
  energy_level: number | null;
  completed_at: string | null;
  program: { name: string } | null;
}

interface ExerciseLog {
  id: string;
  sets_completed: number | null;
  reps_completed: string | null;
  weight_used: string | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    thumbnail_url: string | null;
  } | null;
}

interface PerformanceMetric {
  id: string;
  metric_type: string;
  value: number;
  unit: string | null;
  previousValue?: number;
}

interface HomeworkAssignment {
  id: string;
  name: string;
  frequency_type: string;
  frequency_count: number | null;
}

interface ClientSessionDetailProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  "in-person": "In-Person",
  "homework": "Homework",
  "online": "Online",
  "assessment": "Assessment",
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  "in-person": "bg-primary/10 text-primary",
  "homework": "bg-secondary text-secondary-foreground",
  "online": "bg-muted text-muted-foreground",
  "assessment": "bg-accent text-accent-foreground",
};

const ClientSessionDetail = ({ sessionId, isOpen, onClose }: ClientSessionDetailProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [homework, setHomework] = useState<HomeworkAssignment[]>([]);
  
  // Editable feedback
  const [rpe, setRpe] = useState<number>(5);
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionDetails();
    }
  }, [isOpen, sessionId]);

  const fetchSessionDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from("workout_logs")
        .select(`
          id,
          workout_date,
          session_type,
          duration_minutes,
          coach_notes,
          key_findings,
          overall_rpe,
          energy_level,
          completed_at,
          program:programs (name)
        `)
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;

      const typedSession = {
        ...sessionData,
        program: sessionData.program as { name: string } | null,
      };
      setSession(typedSession);
      setRpe(typedSession.overall_rpe || 5);
      setEnergyLevel(typedSession.energy_level || 5);

      // Fetch exercise logs
      const { data: exerciseData } = await supabase
        .from("exercise_logs")
        .select(`
          id,
          sets_completed,
          reps_completed,
          weight_used,
          notes,
          exercise:exercises (
            id,
            name,
            thumbnail_url
          )
        `)
        .eq("workout_log_id", sessionId);

      if (exerciseData) {
        setExercises(exerciseData.map(e => ({
          ...e,
          exercise: e.exercise as { id: string; name: string; thumbnail_url: string | null } | null,
        })));
      }

      // Fetch metrics for this date
      if (typedSession.workout_date) {
        const { data: metricsData } = await supabase
          .from("performance_metrics")
          .select("id, metric_type, value, unit, recorded_date")
          .eq("recorded_date", typedSession.workout_date)
          .order("metric_type");

        if (metricsData) {
          // Get previous readings for trend
          const metricsWithTrend = await Promise.all(
            metricsData.map(async (metric) => {
              const { data: prevData } = await supabase
                .from("performance_metrics")
                .select("value")
                .eq("metric_type", metric.metric_type)
                .lt("recorded_date", metric.recorded_date!)
                .order("recorded_date", { ascending: false })
                .limit(1)
                .single();

              return {
                ...metric,
                previousValue: prevData?.value,
              };
            })
          );
          setMetrics(metricsWithTrend);
        }
      }

      // Fetch homework assigned on same day
      if (typedSession.workout_date) {
        const { data: homeworkData } = await supabase
          .from("homework_assignments")
          .select("id, name, frequency_type, frequency_count, created_at")
          .gte("created_at", `${typedSession.workout_date}T00:00:00`)
          .lt("created_at", `${typedSession.workout_date}T23:59:59`);

        if (homeworkData) {
          setHomework(homeworkData);
        }
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
      toast({
        title: "Error",
        description: "Failed to load session details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRpeChange = (value: number[]) => {
    setRpe(value[0]);
    setHasChanges(true);
  };

  const handleEnergyChange = (value: number[]) => {
    setEnergyLevel(value[0]);
    setHasChanges(true);
  };

  const saveFeedback = async () => {
    if (!session) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("workout_logs")
        .update({
          overall_rpe: rpe,
          energy_level: energyLevel,
        })
        .eq("id", session.id);

      if (error) throw error;

      toast({
        title: "Feedback saved",
        description: "Your session feedback has been saved",
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving feedback:", error);
      toast({
        title: "Error",
        description: "Failed to save feedback",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getEnergyLabel = (level: number): string => {
    if (level <= 3) return "Low";
    if (level <= 6) return "Moderate";
    return "High";
  };

  const getTrendDiff = (current: number, previous?: number): { diff: number; direction: "up" | "down" | "same" } => {
    if (!previous) return { diff: 0, direction: "same" };
    const diff = current - previous;
    return {
      diff: Math.abs(diff),
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
    };
  };

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 lg:p-6 border-b">
        <div className="space-y-1">
          {session && (
            <>
              <h2 className="text-xl lg:text-2xl font-semibold text-foreground">
                {format(parseISO(session.workout_date!), "EEEE, MMMM d, yyyy")}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={SESSION_TYPE_COLORS[session.session_type || "in-person"]}>
                  {SESSION_TYPE_LABELS[session.session_type || "in-person"] || session.session_type}
                </Badge>
                {session.duration_minutes && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {session.duration_minutes} minutes
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Section 1: Session Notes */}
              <section className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  Session Notes
                </h3>
                {session?.coach_notes ? (
                  <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm lg:text-base text-foreground whitespace-pre-wrap leading-relaxed">
                      {session.coach_notes}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No session notes recorded
                  </p>
                )}

                {session?.key_findings && (
                  <div className="bg-accent border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        Key Takeaways
                      </span>
                    </div>
                    <p className="text-sm lg:text-base text-foreground whitespace-pre-wrap">
                      {session.key_findings}
                    </p>
                  </div>
                )}
              </section>

              <Separator />

              {/* Section 2: Your Feedback */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Activity className="h-5 w-5 text-primary" />
                  Your Feedback
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* RPE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">
                        Rate of Perceived Exertion (RPE)
                      </label>
                      <span className="text-lg font-semibold text-primary">{rpe}/10</span>
                    </div>
                    <Slider
                      value={[rpe]}
                      onValueChange={handleRpeChange}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Easy</span>
                      <span>Moderate</span>
                      <span>Max Effort</span>
                    </div>
                  </div>

                  {/* Energy Level */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">
                        Energy Level
                      </label>
                      <span className="text-lg font-semibold text-primary">
                        {energyLevel}/10 ({getEnergyLabel(energyLevel)})
                      </span>
                    </div>
                    <Slider
                      value={[energyLevel]}
                      onValueChange={handleEnergyChange}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>Moderate</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {hasChanges && (
                  <Button onClick={saveFeedback} disabled={isSaving} className="w-full sm:w-auto">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Feedback
                      </>
                    )}
                  </Button>
                )}
              </section>

              <Separator />

              {/* Section 3: Metrics Logged */}
              <section className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Activity className="h-5 w-5 text-primary" />
                  Performance Metrics
                </h3>
                
                {metrics.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {metrics.map((metric) => {
                      const trend = getTrendDiff(metric.value, metric.previousValue);
                      return (
                        <div
                          key={metric.id}
                          className="bg-muted/50 rounded-lg p-3 space-y-1"
                        >
                          <p className="text-xs text-muted-foreground truncate">
                            {metric.metric_type}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-foreground">
                              {metric.value}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {metric.unit}
                            </span>
                            {trend.direction !== "same" && (
                              <span className={`flex items-center text-xs ${
                                trend.direction === "up" ? "text-primary" : "text-destructive"
                              }`}>
                                {trend.direction === "up" ? (
                                  <TrendingUp className="h-3 w-3 mr-0.5" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-0.5" />
                                )}
                                {trend.diff}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No metrics recorded this session
                  </p>
                )}
              </section>

              <Separator />

              {/* Section 4: Exercises Performed */}
              <section className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  What We Did
                </h3>
                
                {exercises.length > 0 ? (
                  <div className="space-y-2">
                    {exercises.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        {log.exercise?.thumbnail_url ? (
                          <img
                            src={log.exercise.thumbnail_url}
                            alt={log.exercise.name}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">
                            {log.exercise?.name || "Unknown Exercise"}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {log.sets_completed && log.reps_completed && (
                              <span>
                                {log.sets_completed} × {log.reps_completed}
                              </span>
                            )}
                            {log.weight_used && (
                              <span>@ {log.weight_used}</span>
                            )}
                          </div>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No exercises logged for this session
                  </p>
                )}
              </section>

              {/* Section 5: Homework Assigned */}
              {homework.length > 0 && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      Homework from This Session
                    </h3>
                    <div className="space-y-2">
                      {homework.map((hw) => (
                        <div
                          key={hw.id}
                          className="p-3 bg-primary/10 border border-primary/20 rounded-lg"
                        >
                          <p className="font-medium text-foreground">{hw.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {hw.frequency_type === "daily"
                              ? "Daily"
                              : `${hw.frequency_count}x per week`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Use Sheet for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Session Details</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Session Details</DialogTitle>
          <DialogDescription>View details for this training session</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default ClientSessionDetail;
