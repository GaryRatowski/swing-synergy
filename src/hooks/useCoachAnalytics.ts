import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, format, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

export type DateRange = "30" | "90" | "180" | "365";

interface RetentionData {
  retentionRate: number;
  startingClients: number;
  endingClients: number;
  netChange: number;
  byMembership: { type: string; count: number }[];
}

interface ProgramPerformance {
  id: string;
  name: string;
  totalAssigned: number;
  completed: number;
  completionRate: number;
}

interface SessionStats {
  avgSessionsPerMonth: number;
  totalSessions: number;
  activeClients: number;
}

interface RevenueData {
  mrr: number;
  byMembership: { type: string; count: number; mrr: number }[];
  byTier: { tier: string; count: number; mrr: number; percentage: number }[];
}

interface SubscriptionChangeEvent {
  id: string;
  user_id: string;
  previous_tier: string | null;
  new_tier: string | null;
  reason: string | null;
  changed_at: string;
  profile?: { full_name: string; email: string };
}

interface SubscriptionMetrics {
  upgrades: number;
  downgrades: number;
  cancellations: number;
  signups: number;
  recentChanges: SubscriptionChangeEvent[];
}

interface RevenueTrendPoint {
  month: string;
  revenue: number;
}

interface AtRiskClient {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  lastSessionDate: string | null;
  daysSinceLastSession: number;
}

interface TrendDataPoint {
  date: string;
  value: number;
}

// Membership type pricing (legacy)
const MEMBERSHIP_PRICING: Record<string, number> = {
  individual_coaching: 299,
  community: 49,
  program_only: 149,
};

// Subscription tier pricing
const TIER_PRICING: Record<string, number> = {
  none: 0,
  app_only: 20,
  remote: 75,
  hybrid: 200,
  in_person: 100, // per hour, but we estimate ~4 hours/month
};

export function useCoachAnalytics(coachId: string | undefined, dateRange: DateRange) {
  const days = parseInt(dateRange);
  const endDate = startOfDay(new Date());
  const startDate = subDays(endDate, days);

  // Client Retention Rate
  const retention = useQuery({
    queryKey: ["analytics", "retention", coachId, dateRange],
    queryFn: async (): Promise<RetentionData> => {
      if (!coachId) return { retentionRate: 0, startingClients: 0, endingClients: 0, netChange: 0, byMembership: [] };

      // Get clients at start of period
      const { count: startCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("role", "client")
        .lte("created_at", startDate.toISOString())
        .eq("status", "active");

      // Get clients at end of period
      const { count: endCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("role", "client")
        .lte("created_at", endDate.toISOString())
        .eq("status", "active");

      // Get breakdown by membership type
      const { data: membershipData } = await supabase
        .from("profiles")
        .select("membership_type")
        .eq("coach_id", coachId)
        .eq("role", "client")
        .eq("status", "active");

      const byMembership = Object.entries(
        (membershipData || []).reduce((acc: Record<string, number>, p) => {
          const type = p.membership_type || "unassigned";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      ).map(([type, count]) => ({ type, count }));

      const starting = startCount || 0;
      const ending = endCount || 0;
      const retentionRate = starting > 0 ? Math.round((ending / starting) * 100) : 100;

      return {
        retentionRate,
        startingClients: starting,
        endingClients: ending,
        netChange: ending - starting,
        byMembership,
      };
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  // Program Completion Rate
  const programPerformance = useQuery({
    queryKey: ["analytics", "programs", coachId, dateRange],
    queryFn: async (): Promise<ProgramPerformance[]> => {
      if (!coachId) return [];

      // Get all client programs for this coach's clients
      const { data: clients } = await supabase
        .from("profiles")
        .select("id")
        .eq("coach_id", coachId)
        .eq("role", "client");

      if (!clients?.length) return [];

      const clientIds = clients.map((c) => c.id);

      const { data: clientPrograms } = await supabase
        .from("client_programs")
        .select(`
          id,
          is_active,
          current_week,
          current_day,
          program_id,
          programs (
            id,
            name,
            duration_weeks,
            workouts_per_week
          )
        `)
        .in("client_id", clientIds)
        .gte("created_at", startDate.toISOString());

      // Calculate completion based on current_week/day vs total
      const programStats: Record<string, { name: string; total: number; completed: number }> = {};

      (clientPrograms || []).forEach((cp) => {
        const program = cp.programs as { id: string; name: string; duration_weeks: number | null; workouts_per_week: number | null } | null;
        if (!program) return;

        if (!programStats[program.id]) {
          programStats[program.id] = { name: program.name, total: 0, completed: 0 };
        }
        programStats[program.id].total++;

        // Check if completed (current week >= total weeks AND current day >= workouts per week)
        const totalWeeks = program.duration_weeks || 4;
        const workoutsPerWeek = program.workouts_per_week || 3;
        const currentWeek = cp.current_week || 1;
        const currentDay = cp.current_day || 1;

        if (currentWeek >= totalWeeks && currentDay >= workoutsPerWeek && !cp.is_active) {
          programStats[program.id].completed++;
        }
      });

      return Object.entries(programStats).map(([id, stats]) => ({
        id,
        name: stats.name,
        totalAssigned: stats.total,
        completed: stats.completed,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }));
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  // Average Session Frequency
  const sessionStats = useQuery({
    queryKey: ["analytics", "sessions", coachId, dateRange],
    queryFn: async (): Promise<SessionStats> => {
      if (!coachId) return { avgSessionsPerMonth: 0, totalSessions: 0, activeClients: 0 };

      const { data: clients } = await supabase
        .from("profiles")
        .select("id")
        .eq("coach_id", coachId)
        .eq("role", "client")
        .eq("status", "active");

      if (!clients?.length) return { avgSessionsPerMonth: 0, totalSessions: 0, activeClients: 0 };

      const clientIds = clients.map((c) => c.id);

      const { data: sessions, count } = await supabase
        .from("workout_logs")
        .select("id, client_id", { count: "exact" })
        .in("client_id", clientIds)
        .gte("workout_date", format(startDate, "yyyy-MM-dd"))
        .lte("workout_date", format(endDate, "yyyy-MM-dd"));

      const totalSessions = count || 0;
      const uniqueClients = new Set((sessions || []).map((s) => s.client_id)).size;
      const months = Math.max(days / 30, 1);

      return {
        avgSessionsPerMonth: uniqueClients > 0 ? Number((totalSessions / uniqueClients / months).toFixed(1)) : 0,
        totalSessions,
        activeClients: uniqueClients,
      };
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  // Revenue (MRR) - Updated to use subscription_tier and monthly_rate
  const revenue = useQuery({
    queryKey: ["analytics", "revenue", coachId],
    queryFn: async (): Promise<RevenueData> => {
      if (!coachId) return { mrr: 0, byMembership: [], byTier: [] };

      const { data } = await supabase
        .from("profiles")
        .select("membership_type, subscription_tier, subscription_status, monthly_rate")
        .eq("coach_id", coachId)
        .eq("role", "client")
        .eq("status", "active");

      const byMembership: Record<string, { count: number; mrr: number }> = {};
      const byTier: Record<string, { count: number; mrr: number }> = {};
      let totalMrr = 0;
      let totalActiveClients = 0;

      (data || []).forEach((client) => {
        // Legacy membership type tracking
        const type = client.membership_type || "unassigned";
        const legacyPrice = MEMBERSHIP_PRICING[type] || 0;

        if (!byMembership[type]) {
          byMembership[type] = { count: 0, mrr: 0 };
        }
        byMembership[type].count++;
        byMembership[type].mrr += legacyPrice;

        // New subscription tier tracking
        const tier = client.subscription_tier || "none";
        const isActive = client.subscription_status === "active" || client.subscription_status === "trialing";
        
        // Use monthly_rate if set, otherwise use tier pricing
        const tierPrice = isActive ? (client.monthly_rate || TIER_PRICING[tier] || 0) : 0;

        if (!byTier[tier]) {
          byTier[tier] = { count: 0, mrr: 0 };
        }
        byTier[tier].count++;
        if (isActive) {
          byTier[tier].mrr += tierPrice;
          totalMrr += tierPrice;
          totalActiveClients++;
        }
      });

      return {
        mrr: totalMrr,
        byMembership: Object.entries(byMembership).map(([type, data]) => ({
          type,
          count: data.count,
          mrr: data.mrr,
        })),
        byTier: Object.entries(byTier).map(([tier, data]) => ({
          tier,
          count: data.count,
          mrr: data.mrr,
          percentage: totalActiveClients > 0 ? (data.count / totalActiveClients) * 100 : 0,
        })),
      };
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  // Subscription changes tracking
  const subscriptionMetrics = useQuery({
    queryKey: ["analytics", "subscriptionMetrics", coachId, dateRange],
    queryFn: async (): Promise<SubscriptionMetrics> => {
      if (!coachId) return { upgrades: 0, downgrades: 0, cancellations: 0, signups: 0, recentChanges: [] };

      // Get client IDs for this coach
      const { data: clients } = await supabase
        .from("profiles")
        .select("id")
        .eq("coach_id", coachId)
        .eq("role", "client");

      if (!clients?.length) return { upgrades: 0, downgrades: 0, cancellations: 0, signups: 0, recentChanges: [] };

      const clientIds = clients.map((c) => c.id);

      const { data: changes } = await supabase
        .from("subscription_history")
        .select("*")
        .in("user_id", clientIds)
        .gte("changed_at", startDate.toISOString())
        .order("changed_at", { ascending: false });

      // Get profile info for recent changes
      const recentChanges: SubscriptionChangeEvent[] = [];
      for (const change of (changes || []).slice(0, 20)) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", change.user_id)
          .single();

        recentChanges.push({
          ...change,
          profile: profile || undefined,
        });
      }

      const counts = (changes || []).reduce((acc: Record<string, number>, event) => {
        const reason = event.reason || "other";
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});

      return {
        upgrades: counts.upgrade || 0,
        downgrades: counts.downgrade || 0,
        cancellations: counts.canceled || 0,
        signups: counts.signup || 0,
        recentChanges,
      };
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  // Revenue trend (from payment_transactions)
  const revenueTrend = useQuery({
    queryKey: ["analytics", "revenueTrend", coachId],
    queryFn: async (): Promise<RevenueTrendPoint[]> => {
      if (!coachId) return [];

      // Get client IDs for this coach
      const { data: clients } = await supabase
        .from("profiles")
        .select("id")
        .eq("coach_id", coachId)
        .eq("role", "client");

      if (!clients?.length) return [];

      const clientIds = clients.map((c) => c.id);
      const sixMonthsAgo = subDays(new Date(), 180);

      const { data: payments } = await supabase
        .from("payment_transactions")
        .select("amount, paid_at, status")
        .in("user_id", clientIds)
        .eq("status", "paid")
        .gte("paid_at", sixMonthsAgo.toISOString())
        .order("paid_at");

      // Group by month
      const monthlyData: Record<string, number> = {};
      
      (payments || []).forEach((payment) => {
        if (payment.paid_at) {
          const month = format(new Date(payment.paid_at), "MMM yyyy");
          monthlyData[month] = (monthlyData[month] || 0) + payment.amount;
        }
      });

      return Object.entries(monthlyData).map(([month, revenue]) => ({
        month,
        revenue: parseFloat(revenue.toFixed(2)),
      }));
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 10,
  });

  // At-Risk Clients (no sessions in last 14 days)
  const atRiskClients = useQuery({
    queryKey: ["analytics", "atRisk", coachId],
    queryFn: async (): Promise<AtRiskClient[]> => {
      if (!coachId) return [];

      const { data: clients } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("coach_id", coachId)
        .eq("role", "client")
        .eq("status", "active");

      if (!clients?.length) return [];

      // Get last session for each client
      const atRisk: AtRiskClient[] = [];
      const twoWeeksAgo = subDays(new Date(), 14);

      for (const client of clients) {
        const { data: lastSession } = await supabase
          .from("workout_logs")
          .select("workout_date")
          .eq("client_id", client.id)
          .order("workout_date", { ascending: false })
          .limit(1)
          .single();

        const lastDate = lastSession?.workout_date ? new Date(lastSession.workout_date) : null;
        const daysSince = lastDate
          ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (!lastDate || lastDate < twoWeeksAgo) {
          atRisk.push({
            id: client.id,
            full_name: client.full_name,
            email: client.email,
            avatar_url: client.avatar_url,
            lastSessionDate: lastSession?.workout_date || null,
            daysSinceLastSession: daysSince,
          });
        }
      }

      return atRisk.sort((a, b) => b.daysSinceLastSession - a.daysSinceLastSession);
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  // Client Growth Trend
  const clientGrowthTrend = useQuery({
    queryKey: ["analytics", "clientGrowth", coachId, dateRange],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!coachId) return [];

      const intervals = days <= 90
        ? eachWeekOfInterval({ start: startDate, end: endDate })
        : eachMonthOfInterval({ start: startDate, end: endDate });

      const trend: TrendDataPoint[] = [];

      for (const date of intervals) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("coach_id", coachId)
          .eq("role", "client")
          .lte("created_at", date.toISOString())
          .eq("status", "active");

        trend.push({
          date: format(date, days <= 90 ? "MMM d" : "MMM yyyy"),
          value: count || 0,
        });
      }

      return trend;
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 10,
  });

  // Session Volume Trend
  const sessionVolumeTrend = useQuery({
    queryKey: ["analytics", "sessionVolume", coachId, dateRange],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!coachId) return [];

      const { data: clients } = await supabase
        .from("profiles")
        .select("id")
        .eq("coach_id", coachId)
        .eq("role", "client");

      if (!clients?.length) return [];

      const clientIds = clients.map((c) => c.id);
      const intervals = days <= 90
        ? eachWeekOfInterval({ start: startDate, end: endDate })
        : eachMonthOfInterval({ start: startDate, end: endDate });

      const trend: TrendDataPoint[] = [];

      for (let i = 0; i < intervals.length; i++) {
        const periodStart = intervals[i];
        const periodEnd = intervals[i + 1] || endDate;

        const { count } = await supabase
          .from("workout_logs")
          .select("*", { count: "exact", head: true })
          .in("client_id", clientIds)
          .gte("workout_date", format(periodStart, "yyyy-MM-dd"))
          .lt("workout_date", format(periodEnd, "yyyy-MM-dd"));

        trend.push({
          date: format(periodStart, days <= 90 ? "MMM d" : "MMM yyyy"),
          value: count || 0,
        });
      }

      return trend;
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 10,
  });

  return {
    retention: retention.data,
    retentionLoading: retention.isLoading,
    programPerformance: programPerformance.data || [],
    programsLoading: programPerformance.isLoading,
    sessionStats: sessionStats.data,
    sessionsLoading: sessionStats.isLoading,
    revenue: revenue.data,
    revenueLoading: revenue.isLoading,
    atRiskClients: atRiskClients.data || [],
    atRiskLoading: atRiskClients.isLoading,
    clientGrowthTrend: clientGrowthTrend.data || [],
    clientGrowthLoading: clientGrowthTrend.isLoading,
    sessionVolumeTrend: sessionVolumeTrend.data || [],
    sessionVolumeLoading: sessionVolumeTrend.isLoading,
    subscriptionMetrics: subscriptionMetrics.data,
    subscriptionMetricsLoading: subscriptionMetrics.isLoading,
    revenueTrend: revenueTrend.data || [],
    revenueTrendLoading: revenueTrend.isLoading,
    isLoading:
      retention.isLoading ||
      programPerformance.isLoading ||
      sessionStats.isLoading ||
      revenue.isLoading,
  };
}
