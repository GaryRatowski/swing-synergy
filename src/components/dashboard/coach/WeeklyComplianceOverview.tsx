import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, TrendingDown, AlertTriangle } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AssignedWorkout {
  day_of_week: number;
  template_name: string;
  completed: boolean;
}

interface ClientCompliance {
  id: string;
  full_name: string;
  avatar_url: string | null;
  scheduled: number;
  completed: number;
  ratio: number;
  workouts: AssignedWorkout[];
}

const WeeklyComplianceOverview = () => {
  const { profile } = useAuth();
  const [clients, setClients] = useState<ClientCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) fetchCompliance();
  }, [profile?.id]);

  const fetchCompliance = async () => {
    setIsLoading(true);
    try {
      // Get all clients
      const { data: clientData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, coach_id")
        .eq("role", "client")
        .eq("coach_id", profile!.id)
        .eq("status", "active");

      if (!clientData?.length) {
        setClients([]);
        setIsLoading(false);
        return;
      }

      // Get current week boundaries
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const results: ClientCompliance[] = [];

      for (const client of clientData) {
        // Get active program
        const { data: activeProgram } = await supabase
          .from("client_programs")
          .select("program_id, current_week")
          .eq("client_id", client.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!activeProgram) {
          results.push({
            id: client.id,
            full_name: client.full_name,
            avatar_url: client.avatar_url,
            scheduled: 0,
            completed: 0,
            ratio: -1, // no program
            workouts: [],
          });
          continue;
        }

        // Get assigned workouts for current week
        const { data: assignments } = await supabase
          .from("program_workout_assignments")
          .select("day_of_week, template:workout_templates(name)")
          .eq("program_id", activeProgram.program_id)
          .eq("week_number", activeProgram.current_week || 1);

        // Get completed workout logs this week
        const { data: completedLogs } = await supabase
          .from("workout_logs")
          .select("workout_date")
          .eq("client_id", client.id)
          .not("completed_at", "is", null)
          .gte("workout_date", weekStart.toISOString().split("T")[0])
          .lte("workout_date", weekEnd.toISOString().split("T")[0]);

        const completedDates = new Set((completedLogs || []).map((l) => l.workout_date));

        const workouts: AssignedWorkout[] = (assignments || []).map((a: any) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + a.day_of_week);
          const dateStr = dayDate.toISOString().split("T")[0];

          return {
            day_of_week: a.day_of_week,
            template_name: a.template?.name || "Workout",
            completed: completedDates.has(dateStr),
          };
        });

        const scheduled = workouts.length;
        const completed = workouts.filter((w) => w.completed).length;

        results.push({
          id: client.id,
          full_name: client.full_name,
          avatar_url: client.avatar_url,
          scheduled,
          completed,
          ratio: scheduled > 0 ? completed / scheduled : -1,
          workouts,
        });
      }

      // Sort: lowest compliance first, no-program clients at the end
      results.sort((a, b) => {
        if (a.ratio === -1 && b.ratio === -1) return 0;
        if (a.ratio === -1) return 1;
        if (b.ratio === -1) return -1;
        return a.ratio - b.ratio;
      });

      setClients(results);
    } catch (err) {
      console.error("Error fetching compliance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (ratio: number) => {
    if (ratio === -1) return "text-muted-foreground";
    if (ratio >= 0.75) return "text-green-500";
    if (ratio >= 0.5) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusBg = (ratio: number) => {
    if (ratio === -1) return "bg-muted";
    if (ratio >= 0.75) return "bg-green-500/10 border-green-500/20";
    if (ratio >= 0.5) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const clientsWithPrograms = clients.filter((c) => c.ratio !== -1);
  const needsAttention = clientsWithPrograms.filter((c) => c.ratio < 0.5).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">This Week's Compliance</CardTitle>
          {needsAttention > 0 && (
            <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {needsAttention} need{needsAttention > 1 ? "" : "s"} attention
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No clients yet.</p>
        ) : (
          clients.map((client) => (
            <Collapsible
              key={client.id}
              open={expandedClient === client.id}
              onOpenChange={(open) => setExpandedClient(open ? client.id : null)}
            >
              <CollapsibleTrigger asChild>
                <div
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${getStatusBg(client.ratio)}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(client.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.full_name}</p>
                  </div>
                  {client.ratio === -1 ? (
                    <span className="text-xs text-muted-foreground">No program</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getStatusColor(client.ratio)}`}>
                        {client.completed}/{client.scheduled}
                      </span>
                      {expandedClient === client.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleTrigger>
              {client.workouts.length > 0 && (
                <CollapsibleContent>
                  <div className="ml-11 mt-1 mb-2 space-y-1">
                    {client.workouts
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((w, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded">
                          {w.completed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          )}
                          <span className="text-muted-foreground w-8 text-xs">{DAY_NAMES[w.day_of_week]}</span>
                          <span className={w.completed ? "text-foreground" : "text-muted-foreground"}>
                            {w.template_name}
                          </span>
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyComplianceOverview;
