import { useState, useEffect } from "react";
import { format, isToday, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays,
  Plus,
  Play,
  RefreshCw,
  Sparkles,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import SessionLoggingSheet from "./calendar/SessionLoggingSheet";
import WeeklyComplianceOverview from "./WeeklyComplianceOverview";

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

interface SummaryData {
  lastSession: string | null;
  painFlags: number;
  painFlagsText: string | null;
  clubheadSpeed: number | null;
  clubheadSpeedTrend: "up" | "down" | "stable" | null;
  clubheadSpeedDelta: number | null;
  clubheadSpeedText: string | null;
  homeworkCompleted: number;
  homeworkTotal: number;
  homeworkText: string | null;
  suggestedFocus: string | null;
}

interface AppointmentSummary {
  [appointmentId: string]: {
    loading: boolean;
    error: boolean;
    data: SummaryData | null;
    aiSuggestion: string | null;
  };
}

interface CoachTodayViewProps {
  onViewCalendar: () => void;
  onAddAppointment: () => void;
}

const CoachTodayView = ({ onViewCalendar, onAddAppointment }: CoachTodayViewProps) => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<AppointmentSummary>({});
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch today's appointments
  useEffect(() => {
    if (!profile?.id) return;

    const fetchTodayAppointments = async () => {
      setLoading(true);

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data, error } = await supabase
        .from("coach_appointments")
        .select("*")
        .eq("coach_id", profile.id)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching appointments:", error);
        setLoading(false);
        return;
      }

      // Fetch client names
      const clientIds = [...new Set(data?.filter((a) => a.client_id).map((a) => a.client_id))];
      let clientMap: Record<string, string> = {};

      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", clientIds);

        clientMap = (clientData || []).reduce((acc, c) => {
          acc[c.id] = c.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      const appointmentsWithNames = (data || []).map((apt) => ({
        ...apt,
        client_name: apt.client_id ? clientMap[apt.client_id] : undefined,
      }));

      setAppointments(appointmentsWithNames);
      setLoading(false);

      // Pre-fetch summary data for each appointment with a client
      appointmentsWithNames
        .filter((apt) => apt.client_id)
        .forEach((apt) => fetchSummaryData(apt));
    };

    fetchTodayAppointments();
  }, [profile?.id]);

  const fetchSummaryData = async (appointment: Appointment) => {
    if (!appointment.client_id) return;

    setSummaries((prev) => ({
      ...prev,
      [appointment.id]: { loading: true, error: false, data: null, aiSuggestion: null },
    }));

    try {
      // Fetch parallel data
      const [lastSessionResult, flagsResult, speedResult, speedTrendResult, homeworkResult] =
        await Promise.all([
          // Last session with notes
          supabase
            .from("workout_logs")
            .select("coach_notes, key_findings, workout_date")
            .eq("client_id", appointment.client_id)
            .not("completed_at", "is", null)
            .order("workout_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          // Pain flags count (unreviewed)
          supabase
            .from("exercise_flags")
            .select("id", { count: "exact" })
            .eq("client_id", appointment.client_id)
            .is("reviewed_by", null),
          // Latest clubhead speed
          supabase
            .from("performance_metrics")
            .select("value, recorded_date")
            .eq("client_id", appointment.client_id)
            .eq("metric_type", "clubhead_speed")
            .order("recorded_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          // Clubhead speed trend (last 5)
          supabase
            .from("performance_metrics")
            .select("value, recorded_date")
            .eq("client_id", appointment.client_id)
            .eq("metric_type", "clubhead_speed")
            .order("recorded_date", { ascending: false })
            .limit(5),
          // Homework completion (last 7 days)
          supabase
            .from("workout_logs")
            .select("id, completed_at")
            .eq("client_id", appointment.client_id)
            .eq("session_type", "homework")
            .gte(
              "workout_date",
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            ),
        ]);

      // Calculate trend
      let trend: "up" | "down" | "stable" | null = null;
      let delta: number | null = null;
      if (speedTrendResult.data && speedTrendResult.data.length >= 2) {
        const latest = speedTrendResult.data[0].value;
        const oldest = speedTrendResult.data[speedTrendResult.data.length - 1].value;
        delta = Number((latest - oldest).toFixed(1));
        if (delta > 0.5) trend = "up";
        else if (delta < -0.5) trend = "down";
        else trend = "stable";
      }

      const homeworkData = homeworkResult.data || [];
      const completed = homeworkData.filter((h) => h.completed_at).length;

      const summaryData: SummaryData = {
        lastSession:
          lastSessionResult.data?.coach_notes ||
          lastSessionResult.data?.key_findings ||
          (lastSessionResult.data?.workout_date
            ? `Session on ${format(new Date(lastSessionResult.data.workout_date), "MMM d")}`
            : null),
        painFlags: flagsResult.count || 0,
        painFlagsText: null,
        clubheadSpeed: speedResult.data?.value || null,
        clubheadSpeedTrend: trend,
        clubheadSpeedDelta: delta,
        clubheadSpeedText: null,
        homeworkCompleted: completed,
        homeworkTotal: homeworkData.length,
        homeworkText: null,
        suggestedFocus: null,
      };

      setSummaries((prev) => ({
        ...prev,
        [appointment.id]: { loading: false, error: false, data: summaryData, aiSuggestion: null },
      }));
    } catch (error) {
      console.error("Error fetching summary data:", error);
      setSummaries((prev) => ({
        ...prev,
        [appointment.id]: { loading: false, error: true, data: null, aiSuggestion: null },
      }));
    }
  };

  const generateAISummary = async (appointment: Appointment) => {
    if (!appointment.client_id) return;

    setSummaries((prev) => ({
      ...prev,
      [appointment.id]: { ...prev[appointment.id], loading: true, error: false },
    }));

    try {
      const { data, error } = await supabase.functions.invoke("ai-session-prep", {
        body: { 
          client_id: appointment.client_id, 
          coach_id: profile?.id,
          summary_date: new Date().toISOString().split('T')[0]
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || "Failed to generate summary");
      }

      // Update with structured data from edge function
      const currentSummary = summaries[appointment.id]?.data;
      
      setSummaries((prev) => ({
        ...prev,
        [appointment.id]: {
          ...prev[appointment.id],
          loading: false,
          data: currentSummary ? {
            ...currentSummary,
            lastSession: data?.lastSessionFocus || currentSummary.lastSession,
            painFlagsText: data?.painFlags || null,
            painFlags: data?.flagCount ?? currentSummary.painFlags,
            clubheadSpeedText: data?.clubheadSpeedTrend || null,
            clubheadSpeed: data?.latestClubheadSpeed ?? currentSummary.clubheadSpeed,
            homeworkText: data?.homeworkCompletion || null,
            suggestedFocus: data?.suggestedFocus || null,
          } : {
            lastSession: data?.lastSessionFocus || null,
            painFlags: data?.flagCount ?? 0,
            painFlagsText: data?.painFlags || null,
            clubheadSpeed: data?.latestClubheadSpeed || null,
            clubheadSpeedTrend: null,
            clubheadSpeedDelta: null,
            clubheadSpeedText: data?.clubheadSpeedTrend || null,
            homeworkCompleted: 0,
            homeworkTotal: 0,
            homeworkText: data?.homeworkCompletion || null,
            suggestedFocus: data?.suggestedFocus || null,
          },
          aiSuggestion: data?.suggestedFocus || null,
        },
      }));
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setSummaries((prev) => ({
        ...prev,
        [appointment.id]: { ...prev[appointment.id], loading: false, error: true },
      }));
    }
  };

  const handleStartSession = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setSessionSheetOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "training":
        return "default";
      case "assessment":
        return "secondary";
      default:
        return "outline";
    }
  };

  const todayFormatted = format(new Date(), "EEEE, MMMM d");
  const sessionCount = appointments.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
            <div className="space-y-6 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-48 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-[700px] flex flex-col">
        <CardContent className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Today — {todayFormatted}</h2>
              <p className="text-muted-foreground mt-1">
                {sessionCount === 0
                  ? "No sessions scheduled"
                  : `${sessionCount} session${sessionCount > 1 ? "s" : ""} scheduled`}
              </p>
            </div>
            <Button variant="outline" onClick={onViewCalendar}>
              <CalendarDays className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
          </div>

          {/* Content */}
          {appointments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No sessions scheduled for today</h3>
                  <p className="text-muted-foreground mt-1">
                    Enjoy your day off or add a new appointment
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={onViewCalendar}>
                    View Calendar
                  </Button>
                  <Button onClick={onAddAppointment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Appointment
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mr-4 pr-4">
              <div className="space-y-4">
                {appointments.map((apt) => {
                  const summary = summaries[apt.id];
                  const startTime = format(parseISO(apt.start_time), "h:mm a");

                  return (
                    <div key={apt.id} className="flex gap-4">
                      {/* Time marker */}
                      <div className="w-20 flex-shrink-0 pt-4">
                        <span className="text-sm font-medium text-muted-foreground">{startTime}</span>
                      </div>

                      {/* Appointment card */}
                      <Card className="flex-1 border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          {/* Card Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {apt.client_name && (
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary/20 text-primary">
                                    {getInitials(apt.client_name)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div>
                                <button
                                  className="text-lg font-semibold text-foreground hover:text-primary transition-colors text-left"
                                  onClick={() => {
                                    // Could navigate to client detail in future
                                  }}
                                >
                                  {apt.client_name || apt.title}
                                </button>
                                <Badge
                                  variant={getTypeBadgeVariant(apt.appointment_type)}
                                  className="mt-1"
                                >
                                  {apt.appointment_type}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="default"
                              className="bg-success hover:bg-success/90"
                              onClick={() => handleStartSession(apt)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Session
                            </Button>
                          </div>

                          {/* AI Summary Section */}
                          {apt.client_id && (
                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">Session Prep</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    fetchSummaryData(apt);
                                    generateAISummary(apt);
                                  }}
                                  disabled={summary?.loading}
                                >
                                  <RefreshCw
                                    className={`h-4 w-4 ${summary?.loading ? "animate-spin" : ""}`}
                                  />
                                </Button>
                              </div>

                              {/* Summary content */}
                              {summary?.loading && !summary?.data ? (
                                <div className="space-y-2">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-4 w-full" />
                                  ))}
                                </div>
                              ) : summary?.error && !summary?.data ? (
                                <div className="text-sm text-muted-foreground">
                                  <p>Unable to load summary</p>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto"
                                    onClick={() => fetchSummaryData(apt)}
                                  >
                                    Retry
                                  </Button>
                                </div>
                              ) : summary?.data ? (
                                <div className="space-y-2 text-sm">
                                  {/* Last session */}
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>
                                      <span className="font-medium">Last session:</span>{" "}
                                      {summary.data.lastSession
                                        ? summary.data.lastSession.length > 60
                                          ? `${summary.data.lastSession.slice(0, 60)}...`
                                          : summary.data.lastSession
                                        : "No recent sessions"}
                                    </span>
                                  </div>

                                  {/* Pain flags */}
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Pain flags:</span>{" "}
                                      {summary.data.painFlagsText ? (
                                        <span className={`flex items-center ${summary.data.painFlags > 0 ? 'text-destructive' : 'text-success'}`}>
                                          {summary.data.painFlags > 0 ? (
                                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                          ) : (
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                          )}
                                          {summary.data.painFlagsText}
                                        </span>
                                      ) : summary.data.painFlags > 0 ? (
                                        <span className="flex items-center text-destructive">
                                          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                          {summary.data.painFlags} pending review
                                        </span>
                                      ) : (
                                        <span className="flex items-center text-success">
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                          None
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  {/* Clubhead speed */}
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Clubhead speed:</span>{" "}
                                      {summary.data.clubheadSpeedText ? (
                                        <span className="flex items-center">
                                          {summary.data.clubheadSpeedText.includes("↑") && (
                                            <TrendingUp className="h-3.5 w-3.5 text-success mr-1" />
                                          )}
                                          {summary.data.clubheadSpeedText.includes("↓") && (
                                            <TrendingDown className="h-3.5 w-3.5 text-destructive mr-1" />
                                          )}
                                          {summary.data.clubheadSpeedText}
                                        </span>
                                      ) : summary.data.clubheadSpeed !== null ? (
                                        <>
                                          {summary.data.clubheadSpeed} mph
                                          {summary.data.clubheadSpeedTrend === "up" && (
                                            <TrendingUp className="h-3.5 w-3.5 text-success ml-1" />
                                          )}
                                          {summary.data.clubheadSpeedTrend === "down" && (
                                            <TrendingDown className="h-3.5 w-3.5 text-destructive ml-1" />
                                          )}
                                          {summary.data.clubheadSpeedTrend === "stable" && (
                                            <Minus className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                          )}
                                          {summary.data.clubheadSpeedDelta !== null &&
                                            summary.data.clubheadSpeedDelta !== 0 && (
                                              <span
                                                className={
                                                  summary.data.clubheadSpeedDelta > 0
                                                    ? "text-success"
                                                    : "text-destructive"
                                                }
                                              >
                                                ({summary.data.clubheadSpeedDelta > 0 ? "+" : ""}
                                                {summary.data.clubheadSpeedDelta})
                                              </span>
                                            )}
                                        </>
                                      ) : (
                                        "Not recorded"
                                      )}
                                    </span>
                                  </div>

                                  {/* Homework */}
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>
                                      <span className="font-medium">Homework:</span>{" "}
                                      {summary.data.homeworkText ? (
                                        summary.data.homeworkText
                                      ) : summary.data.homeworkTotal > 0 ? (
                                        <>
                                          {summary.data.homeworkCompleted}/{summary.data.homeworkTotal}{" "}
                                          days (
                                          {Math.round(
                                            (summary.data.homeworkCompleted /
                                              summary.data.homeworkTotal) *
                                              100
                                          )}
                                          %)
                                        </>
                                      ) : (
                                        "No homework assigned"
                                      )}
                                    </span>
                                  </div>

                                  {/* AI Suggested focus */}
                                  {summary.aiSuggestion ? (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <div className="flex items-start gap-2">
                                        <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5" />
                                        <div className="text-sm whitespace-pre-wrap">
                                          {summary.aiSuggestion}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-3"
                                      onClick={() => generateAISummary(apt)}
                                      disabled={summary?.loading}
                                    >
                                      {summary?.loading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                      )}
                                      Generate AI Summary
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    fetchSummaryData(apt);
                                    generateAISummary(apt);
                                  }}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Summary
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Weekly Compliance Overview */}
      <WeeklyComplianceOverview />

      <SessionLoggingSheet
        open={sessionSheetOpen}
        onOpenChange={setSessionSheetOpen}
        appointment={selectedAppointment}
      />
    </>
  );
};

export default CoachTodayView;
