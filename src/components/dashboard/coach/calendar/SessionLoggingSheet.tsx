import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  Calendar,
  FileText,
  History,
  Sparkles,
  Target,
  Dumbbell,
  ClipboardList,
  Save,
  Play,
  RefreshCw,
  Copy,
  Loader2,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import SessionExerciseList from "./SessionExerciseList";
import SessionMetrics from "./SessionMetrics";

interface Appointment {
  id: string;
  title: string;
  client_id: string | null;
  client_name?: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface WorkoutLog {
  id: string;
  client_id: string;
  workout_date: string;
  duration_minutes: number | null;
  overall_rpe: number | null;
  notes: string | null;
  session_type: string | null;
  coach_notes: string | null;
  client_homework_notes: string | null;
  key_findings: string | null;
  appointment_id: string | null;
  program_id: string | null;
}

interface SessionLoggingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

interface QuickStats {
  lastSessionDate: string | null;
  clubheadSpeed: number | null;
  activeHomework: number;
}

const SessionLoggingSheet = ({
  open,
  onOpenChange,
  appointment,
}: SessionLoggingSheetProps) => {
  const [activeTab, setActiveTab] = useState("prep");
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    lastSessionDate: null,
    clubheadSpeed: null,
    activeHomework: 0,
  });
  const [sessionHistory, setSessionHistory] = useState<WorkoutLog[]>([]);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState("");
  const [editedSummary, setEditedSummary] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Form state for editing
  const [durationMinutes, setDurationMinutes] = useState("");
  const [overallRpe, setOverallRpe] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [keyFindings, setKeyFindings] = useState("");

  // Exercise and metrics tracking
  const [exerciseCount, setExerciseCount] = useState(0);
  const [metricsCount, setMetricsCount] = useState(0);

  // Auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (open && appointment?.client_id) {
      loadSessionData();
    }
  }, [open, appointment]);

  // Auto-save effect for notes (debounced 30 seconds)
  useEffect(() => {
    if (!workoutLog || !open) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("workout_logs")
        .update({
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
          overall_rpe: overallRpe ? parseInt(overallRpe) : null,
          coach_notes: coachNotes || null,
          key_findings: keyFindings || null,
        })
        .eq("id", workoutLog.id);

      if (!error) {
        setLastAutoSave(new Date());
      }
    }, 30000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [coachNotes, keyFindings, durationMinutes, overallRpe, workoutLog, open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Validation check
  const canSave = exerciseCount > 0 || (coachNotes && coachNotes.trim().length > 0);

  const loadSessionData = async () => {
    if (!appointment?.client_id) return;

    setLoading(true);

    const appointmentDate = format(parseISO(appointment.start_time), "yyyy-MM-dd");

    // Load existing workout log for this appointment
    const { data: existingLog } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("client_id", appointment.client_id)
      .eq("workout_date", appointmentDate)
      .eq("appointment_id", appointment.id)
      .maybeSingle();

    if (existingLog) {
      setWorkoutLog(existingLog);
      setDurationMinutes(existingLog.duration_minutes?.toString() || "");
      setOverallRpe(existingLog.overall_rpe?.toString() || "");
      setCoachNotes(existingLog.coach_notes || "");
      setKeyFindings(existingLog.key_findings || "");
    } else {
      setWorkoutLog(null);
      setDurationMinutes("");
      setOverallRpe("");
      setCoachNotes("");
      setKeyFindings("");
    }

    // Load quick stats
    const [lastSessionResult, speedResult, homeworkResult] = await Promise.all([
      // Last session date
      supabase
        .from("workout_logs")
        .select("workout_date")
        .eq("client_id", appointment.client_id)
        .order("workout_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Latest clubhead speed
      supabase
        .from("performance_metrics")
        .select("value")
        .eq("client_id", appointment.client_id)
        .eq("metric_type", "clubhead_speed")
        .order("recorded_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Active homework count
      supabase
        .from("workout_logs")
        .select("id", { count: "exact" })
        .eq("client_id", appointment.client_id)
        .eq("session_type", "homework")
        .is("completed_at", null),
    ]);

    setQuickStats({
      lastSessionDate: lastSessionResult.data?.workout_date || null,
      clubheadSpeed: speedResult.data?.value || null,
      activeHomework: homeworkResult.count || 0,
    });

    // Load session history
    const { data: historyData } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("client_id", appointment.client_id)
      .order("workout_date", { ascending: false })
      .limit(10);

    setSessionHistory(historyData || []);

    setLoading(false);
  };

  const handleStartSession = async () => {
    if (!appointment?.client_id) return;

    setSaving(true);

    const appointmentDate = format(parseISO(appointment.start_time), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("workout_logs")
      .insert({
        client_id: appointment.client_id,
        workout_date: appointmentDate,
        session_type: "in-person",
        appointment_id: appointment.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create session log",
        variant: "destructive",
      });
    } else {
      setWorkoutLog(data);
      toast({ title: "Session log started" });
    }

    setSaving(false);
  };

  const handleSave = async (silent = false) => {
    if (!workoutLog) return;

    if (!silent) setSaving(true);

    const { error } = await supabase
      .from("workout_logs")
      .update({
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        overall_rpe: overallRpe ? parseInt(overallRpe) : null,
        coach_notes: coachNotes || null,
        key_findings: keyFindings || null,
      })
      .eq("id", workoutLog.id);

    if (error) {
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to save session log",
          variant: "destructive",
        });
      }
    } else {
      if (!silent) {
        toast({ title: "Draft saved" });
      }
    }

    if (!silent) setSaving(false);
    return !error;
  };

  const handleCompleteSession = async () => {
    if (!workoutLog) return;

    if (!canSave) {
      toast({
        title: "Cannot complete session",
        description: "Please add at least 1 exercise or session notes",
        variant: "destructive",
      });
      return;
    }

    setCompleting(true);

    const { error } = await supabase
      .from("workout_logs")
      .update({
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        overall_rpe: overallRpe ? parseInt(overallRpe) : null,
        coach_notes: coachNotes || null,
        key_findings: keyFindings || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", workoutLog.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to complete session",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Session completed",
        description: "The session has been marked as complete",
      });
      onOpenChange(false);
    }

    setCompleting(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const parseSessionNotes = (notes: string | null) => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  const generateAISummary = async () => {
    if (!appointment?.client_id) return;

    setGeneratingSummary(true);
    setAiSummary("");
    setEditedSummary("");
    setIsEditing(false);

    try {
      const { data, error } = await supabase.functions.invoke("ai-session-prep", {
        body: {
          client_id: appointment.client_id,
          days_back: 30,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const summary = data?.summary || "Unable to generate summary.";
      setAiSummary(summary);
      setEditedSummary(summary);
      toast({ title: "Summary generated" });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const textToCopy = isEditing ? editedSummary : aiSummary;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: "Copied to clipboard" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!appointment) return null;

  const appointmentDate = parseISO(appointment.start_time);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full overflow-hidden">
        {/* Header */}
        <SheetHeader className="space-y-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {appointment.client_name && (
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/20 text-primary">
                  {getInitials(appointment.client_name)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <SheetTitle className="text-left">
                {appointment.client_name || appointment.title}
              </SheetTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(appointmentDate, "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(appointmentDate, "h:mm a")} -{" "}
                  {format(parseISO(appointment.end_time), "h:mm a")}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="w-fit">
            {appointment.appointment_type}
          </Badge>
        </SheetHeader>

        <Separator className="my-4 flex-shrink-0" />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 flex-shrink-0">
            <TabsTrigger value="prep" className="text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Prep
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs">
              <ClipboardList className="h-3.5 w-3.5 mr-1" />
              Log
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="h-3.5 w-3.5 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-4">
            {/* Session Prep Tab */}
            <TabsContent value="prep" className="mt-0 space-y-4">
              {/* AI Summary */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="font-medium text-sm">AI Session Summary</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      {aiSummary && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                            className="h-7 px-2"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyToClipboard}
                            className="h-7 px-2"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateAISummary}
                        disabled={generatingSummary}
                        className="h-7 px-2"
                      >
                        {generatingSummary ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {generatingSummary ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">
                          Generating summary...
                        </p>
                      </div>
                    </div>
                  ) : aiSummary ? (
                    isEditing ? (
                      <Textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        className="min-h-32 text-sm"
                        placeholder="Edit the AI summary..."
                      />
                    ) : (
                      <div className="text-sm text-foreground whitespace-pre-wrap prose prose-sm max-w-none">
                        {aiSummary}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        Generate an AI-powered session prep summary based on recent workouts, metrics, and client goals.
                      </p>
                      <Button
                        onClick={generateAISummary}
                        disabled={generatingSummary}
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Summary
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Quick Stats
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Last Session</p>
                      <p className="text-sm font-medium mt-1">
                        {quickStats.lastSessionDate
                          ? format(parseISO(quickStats.lastSessionDate), "MMM d")
                          : "—"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Clubhead Speed</p>
                      <p className="text-sm font-medium mt-1">
                        {quickStats.clubheadSpeed
                          ? `${quickStats.clubheadSpeed} mph`
                          : "—"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Active HW</p>
                      <p className="text-sm font-medium mt-1">
                        {quickStats.activeHomework}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Appointment Notes */}
              {appointment.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Appointment Notes
                  </h4>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {appointment.notes}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Log Session Tab */}
            <TabsContent value="log" className="mt-0 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : !workoutLog ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium">No Session Log Yet</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start logging this session to track notes and findings.
                    </p>
                  </div>
                  <Button onClick={handleStartSession} disabled={saving}>
                    <Play className="h-4 w-4 mr-2" />
                    {saving ? "Starting..." : "Start Session Log"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Session Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="duration" className="text-xs">Duration (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="60"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rpe" className="text-xs">Overall RPE (1-10)</Label>
                      <Input
                        id="rpe"
                        type="number"
                        min="1"
                        max="10"
                        placeholder="7"
                        value={overallRpe}
                        onChange={(e) => setOverallRpe(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Exercises Section */}
                  <SessionExerciseList
                    workoutLogId={workoutLog.id}
                    onExercisesChange={(exercises) => setExerciseCount(exercises.length)}
                  />

                  <Separator />

                  {/* Metrics Section */}
                  {appointment?.client_id && (
                    <SessionMetrics
                      clientId={appointment.client_id}
                      sessionDate={format(parseISO(appointment.start_time), "yyyy-MM-dd")}
                      onMetricsChange={(metrics) => setMetricsCount(metrics.length)}
                    />
                  )}

                  <Separator />

                  {/* Notes Section */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="coachNotes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Session Notes
                      </Label>
                      <Textarea
                        id="coachNotes"
                        placeholder="Paste notes from Granola or type directly..."
                        value={coachNotes}
                        onChange={(e) => setCoachNotes(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {coachNotes.length} characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="keyFindings" className="text-sm">
                        Key Findings (optional)
                      </Label>
                      <Textarea
                        id="keyFindings"
                        placeholder="Important discoveries, areas of improvement, progress notes..."
                        value={keyFindings}
                        onChange={(e) => setKeyFindings(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {keyFindings.length} characters
                      </p>
                    </div>
                  </div>

                  {/* Auto-save indicator */}
                  {lastAutoSave && (
                    <p className="text-xs text-muted-foreground text-center">
                      Auto-saved at {format(lastAutoSave, "h:mm a")}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleSave(false)}
                      disabled={saving}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Draft"}
                    </Button>
                    <Button
                      onClick={handleCompleteSession}
                      disabled={completing || !canSave}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {completing ? "Completing..." : "Complete Session"}
                    </Button>
                  </div>

                  {!canSave && (
                    <p className="text-xs text-muted-foreground text-center">
                      Add at least 1 exercise or session notes to complete
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-0 space-y-3">
              {sessionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <History className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No session history yet</p>
                </div>
              ) : (
                sessionHistory.map((session) => {
                  const parsedNotes = parseSessionNotes(session.notes);
                  const coachNotesPreview =
                    session.coach_notes?.slice(0, 100) ||
                    parsedNotes?.coachNotes?.slice(0, 100) ||
                    null;

                  return (
                    <Card key={session.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {format(parseISO(session.workout_date!), "MMM d, yyyy")}
                              </p>
                              {session.session_type && (
                                <Badge variant="outline" className="text-xs">
                                  {session.session_type}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {session.duration_minutes && (
                                <span>{session.duration_minutes} min</span>
                              )}
                              {session.overall_rpe && (
                                <span>RPE: {session.overall_rpe}/10</span>
                              )}
                            </div>
                            {coachNotesPreview && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {coachNotesPreview}
                                {(session.coach_notes?.length || 0) > 100 ||
                                (parsedNotes?.coachNotes?.length || 0) > 100
                                  ? "..."
                                  : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default SessionLoggingSheet;
