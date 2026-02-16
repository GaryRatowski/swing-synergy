import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, subWeeks, format, differenceInDays } from "date-fns";

export interface NeedsAttentionClient {
  id: string;
  full_name: string;
  avatar_url: string | null;
  issues: string[];
}

export interface WeeklySummary {
  workoutsCompleted: number;
  workoutsCompletedLastWeek: number;
  checkinsReceived: number;
  checkinsReceivedLastWeek: number;
  messagesReceived: number;
  messagesReceivedLastWeek: number;
  avgCompliance: number;
  avgComplianceLastWeek: number;
}

export interface ClientRosterEntry {
  id: string;
  full_name: string;
  avatar_url: string | null;
  programName: string | null;
  workoutsCompleted: number;
  workoutsScheduled: number;
  checkinStatus: "submitted" | "pending" | "no_template";
  lastActive: string | null;
  compliancePercent: number;
}

export function useCoachDashboardAnalytics(coachId: string | undefined) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  // Fetch all active clients for this coach
  const clientsQuery = useQuery({
    queryKey: ["dashboard-analytics", "clients", coachId],
    queryFn: async () => {
      if (!coachId) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, updated_at")
        .eq("coach_id", coachId)
        .eq("role", "client")
        .eq("status", "active");
      return data || [];
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 3,
  });

  const clients = clientsQuery.data || [];
  const clientIds = clients.map((c) => c.id);

  // Needs Attention
  const needsAttentionQuery = useQuery({
    queryKey: ["dashboard-analytics", "needs-attention", coachId, clientIds.join(",")],
    queryFn: async (): Promise<NeedsAttentionClient[]> => {
      if (!clientIds.length) return [];

      // 1. Get workout logs this week for all clients
      const { data: thisWeekLogs } = await supabase
        .from("workout_logs")
        .select("client_id, workout_date")
        .in("client_id", clientIds)
        .gte("workout_date", format(thisWeekStart, "yyyy-MM-dd"))
        .lte("workout_date", format(thisWeekEnd, "yyyy-MM-dd"));

      // 2. Get scheduled workouts (program_workout_assignments) per client
      const { data: clientPrograms } = await supabase
        .from("client_programs")
        .select("client_id, program_id, current_week")
        .in("client_id", clientIds)
        .eq("is_active", true);

      const programIds = [...new Set((clientPrograms || []).map((cp) => cp.program_id).filter(Boolean))] as string[];

      let assignments: { program_id: string; day_of_week: number; week_number: number | null }[] = [];
      if (programIds.length) {
        const { data } = await supabase
          .from("program_workout_assignments")
          .select("program_id, day_of_week, week_number")
          .in("program_id", programIds);
        assignments = data || [];
      }

      // Build per-client scheduled count
      const scheduledByClient: Record<string, number> = {};
      (clientPrograms || []).forEach((cp) => {
        if (!cp.program_id) return;
        const weekAssignments = assignments.filter(
          (a) => a.program_id === cp.program_id && (a.week_number === null || a.week_number === (cp.current_week || 1))
        );
        scheduledByClient[cp.client_id] = (scheduledByClient[cp.client_id] || 0) + weekAssignments.length;
      });

      const completedByClient: Record<string, number> = {};
      (thisWeekLogs || []).forEach((log) => {
        completedByClient[log.client_id] = (completedByClient[log.client_id] || 0) + 1;
      });

      // 3. Get last 2 weeks of workout logs to detect missed streaks
      const twoWeeksAgo = format(subWeeks(now, 2), "yyyy-MM-dd");
      const { data: recentLogs } = await supabase
        .from("workout_logs")
        .select("client_id, workout_date")
        .in("client_id", clientIds)
        .gte("workout_date", twoWeeksAgo)
        .order("workout_date", { ascending: false });

      // 4. Get checkin submissions this week
      const { data: checkinSubs } = await (supabase as any)
        .from("checkin_submissions")
        .select("client_id, submitted_at")
        .in("client_id", clientIds)
        .gte("submitted_at", thisWeekStart.toISOString())
        .lte("submitted_at", thisWeekEnd.toISOString());

      // 5. Get active checkin templates for each client's program
      const { data: checkinTemplates } = await supabase
        .from("checkin_templates")
        .select("program_id")
        .eq("is_active", true);

      const programsWithCheckins = new Set((checkinTemplates || []).map((t) => t.program_id));
      const clientsWithCheckinRequired = new Set(
        (clientPrograms || []).filter((cp) => cp.program_id && programsWithCheckins.has(cp.program_id)).map((cp) => cp.client_id)
      );
      const clientsWhoSubmitted = new Set((checkinSubs || []).map((s: any) => s.client_id));

      const result: NeedsAttentionClient[] = [];

      for (const client of clients) {
        const issues: string[] = [];

        // Missed 2+ workouts: scheduled >= 2 and completed < scheduled - 1
        const scheduled = scheduledByClient[client.id] || 0;
        const completed = completedByClient[client.id] || 0;
        if (scheduled > 0 && completed <= scheduled - 2) {
          issues.push(`Missed ${scheduled - completed} workouts this week`);
        }

        // No check-in this week
        if (clientsWithCheckinRequired.has(client.id) && !clientsWhoSubmitted.has(client.id)) {
          issues.push("No check-in submitted this week");
        }

        // No activity in 7+ days
        const clientRecentLogs = (recentLogs || []).filter((l) => l.client_id === client.id);
        const lastLogDate = clientRecentLogs.length > 0 ? new Date(clientRecentLogs[0].workout_date!) : null;
        const daysSinceActivity = lastLogDate ? differenceInDays(now, lastLogDate) : 999;
        if (daysSinceActivity >= 7) {
          issues.push(lastLogDate ? `No activity in ${daysSinceActivity} days` : "Never logged a workout");
        }

        // Compliance below 50%
        if (scheduled > 0) {
          const compliance = (completed / scheduled) * 100;
          if (compliance < 50) {
            issues.push(`${Math.round(compliance)}% workout compliance`);
          }
        }

        if (issues.length > 0) {
          result.push({ id: client.id, full_name: client.full_name, avatar_url: client.avatar_url, issues });
        }
      }

      return result.sort((a, b) => b.issues.length - a.issues.length);
    },
    enabled: !!coachId && clientIds.length > 0,
    staleTime: 1000 * 60 * 3,
  });

  // Weekly Summary
  const weeklySummaryQuery = useQuery({
    queryKey: ["dashboard-analytics", "weekly-summary", coachId, clientIds.join(",")],
    queryFn: async (): Promise<WeeklySummary> => {
      if (!clientIds.length)
        return { workoutsCompleted: 0, workoutsCompletedLastWeek: 0, checkinsReceived: 0, checkinsReceivedLastWeek: 0, messagesReceived: 0, messagesReceivedLastWeek: 0, avgCompliance: 0, avgComplianceLastWeek: 0 };

      // This week workouts
      const { count: thisWeekWorkouts } = await supabase
        .from("workout_logs")
        .select("*", { count: "exact", head: true })
        .in("client_id", clientIds)
        .gte("workout_date", format(thisWeekStart, "yyyy-MM-dd"))
        .lte("workout_date", format(thisWeekEnd, "yyyy-MM-dd"));

      // Last week workouts
      const { count: lastWeekWorkouts } = await supabase
        .from("workout_logs")
        .select("*", { count: "exact", head: true })
        .in("client_id", clientIds)
        .gte("workout_date", format(lastWeekStart, "yyyy-MM-dd"))
        .lte("workout_date", format(lastWeekEnd, "yyyy-MM-dd"));

      // This week checkins
      const { data: thisWeekCheckins } = await (supabase as any)
        .from("checkin_submissions")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .gte("submitted_at", thisWeekStart.toISOString())
        .lte("submitted_at", thisWeekEnd.toISOString());

      const { data: lastWeekCheckins } = await (supabase as any)
        .from("checkin_submissions")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .gte("submitted_at", lastWeekStart.toISOString())
        .lte("submitted_at", lastWeekEnd.toISOString());

      // Messages received this week (where coach is receiver)
      const { count: thisWeekMsgs } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", coachId!)
        .gte("created_at", thisWeekStart.toISOString())
        .lte("created_at", thisWeekEnd.toISOString());

      const { count: lastWeekMsgs } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", coachId!)
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());

      // Compliance: get scheduled vs completed for this/last week
      const { data: clientPrograms } = await supabase
        .from("client_programs")
        .select("client_id, program_id, current_week")
        .in("client_id", clientIds)
        .eq("is_active", true);

      const programIds = [...new Set((clientPrograms || []).map((cp) => cp.program_id).filter(Boolean))] as string[];
      let assignments: { program_id: string; day_of_week: number; week_number: number | null }[] = [];
      if (programIds.length) {
        const { data } = await supabase
          .from("program_workout_assignments")
          .select("program_id, day_of_week, week_number")
          .in("program_id", programIds);
        assignments = data || [];
      }

      let totalScheduled = 0;
      let totalCompleted = thisWeekWorkouts || 0;
      (clientPrograms || []).forEach((cp) => {
        if (!cp.program_id) return;
        const weekAssignments = assignments.filter(
          (a) => a.program_id === cp.program_id && (a.week_number === null || a.week_number === (cp.current_week || 1))
        );
        totalScheduled += weekAssignments.length;
      });

      const avgCompliance = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

      // Last week compliance estimate (use last week's workout count vs same scheduled count as approx)
      const lastWeekCompliance = totalScheduled > 0 ? Math.round(((lastWeekWorkouts || 0) / totalScheduled) * 100) : 0;

      return {
        workoutsCompleted: thisWeekWorkouts || 0,
        workoutsCompletedLastWeek: lastWeekWorkouts || 0,
        checkinsReceived: Array.isArray(thisWeekCheckins) ? thisWeekCheckins.length : 0,
        checkinsReceivedLastWeek: Array.isArray(lastWeekCheckins) ? lastWeekCheckins.length : 0,
        messagesReceived: thisWeekMsgs || 0,
        messagesReceivedLastWeek: lastWeekMsgs || 0,
        avgCompliance,
        avgComplianceLastWeek: lastWeekCompliance,
      };
    },
    enabled: !!coachId && clientIds.length > 0,
    staleTime: 1000 * 60 * 3,
  });

  // Client Roster
  const clientRosterQuery = useQuery({
    queryKey: ["dashboard-analytics", "client-roster", coachId, clientIds.join(",")],
    queryFn: async (): Promise<ClientRosterEntry[]> => {
      if (!clientIds.length) return [];

      // Active programs
      const { data: clientPrograms } = await supabase
        .from("client_programs")
        .select("client_id, program_id, current_week, programs(name)")
        .in("client_id", clientIds)
        .eq("is_active", true);

      const programIds = [...new Set((clientPrograms || []).map((cp) => cp.program_id).filter(Boolean))] as string[];

      let assignments: { program_id: string; day_of_week: number; week_number: number | null }[] = [];
      if (programIds.length) {
        const { data } = await supabase
          .from("program_workout_assignments")
          .select("program_id, day_of_week, week_number")
          .in("program_id", programIds);
        assignments = data || [];
      }

      // This week logs
      const { data: thisWeekLogs } = await supabase
        .from("workout_logs")
        .select("client_id, workout_date")
        .in("client_id", clientIds)
        .gte("workout_date", format(thisWeekStart, "yyyy-MM-dd"))
        .lte("workout_date", format(thisWeekEnd, "yyyy-MM-dd"));

      // Last log per client (for "last active")
      const { data: allRecentLogs } = await supabase
        .from("workout_logs")
        .select("client_id, workout_date")
        .in("client_id", clientIds)
        .order("workout_date", { ascending: false })
        .limit(500);

      const lastActiveMap: Record<string, string> = {};
      (allRecentLogs || []).forEach((log) => {
        if (!lastActiveMap[log.client_id] && log.workout_date) {
          lastActiveMap[log.client_id] = log.workout_date;
        }
      });

      // Checkin status
      const { data: checkinSubs } = await (supabase as any)
        .from("checkin_submissions")
        .select("client_id")
        .in("client_id", clientIds)
        .gte("submitted_at", thisWeekStart.toISOString())
        .lte("submitted_at", thisWeekEnd.toISOString());

      const { data: checkinTemplates } = await supabase
        .from("checkin_templates")
        .select("program_id")
        .eq("is_active", true);

      const programsWithCheckins = new Set((checkinTemplates || []).map((t) => t.program_id));
      const clientCheckinRequired = new Set(
        (clientPrograms || []).filter((cp) => cp.program_id && programsWithCheckins.has(cp.program_id)).map((cp) => cp.client_id)
      );
      const clientsWhoSubmitted = new Set((checkinSubs || []).map((s: any) => s.client_id));

      const completedByClient: Record<string, number> = {};
      (thisWeekLogs || []).forEach((log) => {
        completedByClient[log.client_id] = (completedByClient[log.client_id] || 0) + 1;
      });

      return clients.map((client) => {
        const cp = (clientPrograms || []).find((p) => p.client_id === client.id);
        const programName = cp ? (cp.programs as any)?.name || null : null;

        let scheduled = 0;
        if (cp?.program_id) {
          scheduled = assignments.filter(
            (a) => a.program_id === cp.program_id && (a.week_number === null || a.week_number === (cp.current_week || 1))
          ).length;
        }

        const completed = completedByClient[client.id] || 0;
        const compliancePercent = scheduled > 0 ? Math.round((completed / scheduled) * 100) : completed > 0 ? 100 : 0;

        let checkinStatus: "submitted" | "pending" | "no_template" = "no_template";
        if (clientCheckinRequired.has(client.id)) {
          checkinStatus = clientsWhoSubmitted.has(client.id) ? "submitted" : "pending";
        }

        return {
          id: client.id,
          full_name: client.full_name,
          avatar_url: client.avatar_url,
          programName,
          workoutsCompleted: completed,
          workoutsScheduled: scheduled,
          checkinStatus,
          lastActive: lastActiveMap[client.id] || null,
          compliancePercent,
        };
      }).sort((a, b) => {
        // Sort by compliance ascending (lowest first = needs most attention)
        if (a.compliancePercent !== b.compliancePercent) return a.compliancePercent - b.compliancePercent;
        return a.full_name.localeCompare(b.full_name);
      });
    },
    enabled: !!coachId && clientIds.length > 0,
    staleTime: 1000 * 60 * 3,
  });

  return {
    needsAttention: needsAttentionQuery.data || [],
    needsAttentionLoading: needsAttentionQuery.isLoading || clientsQuery.isLoading,
    weeklySummary: weeklySummaryQuery.data || null,
    weeklySummaryLoading: weeklySummaryQuery.isLoading || clientsQuery.isLoading,
    clientRoster: clientRosterQuery.data || [],
    clientRosterLoading: clientRosterQuery.isLoading || clientsQuery.isLoading,
    refetchAll: () => {
      clientsQuery.refetch();
      needsAttentionQuery.refetch();
      weeklySummaryQuery.refetch();
      clientRosterQuery.refetch();
    },
  };
}
