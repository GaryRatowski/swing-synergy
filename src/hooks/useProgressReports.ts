import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  eachWeekOfInterval, 
  format,
  eachDayOfInterval,
  isWithinInterval,
  differenceInWeeks
} from "date-fns";

export interface ReportSummary {
  total_sessions: number;
  expected_sessions: number;
  compliance_rate: number;
  top_achievement: string;
  overall_rating: "Excellent" | "Good" | "Fair" | "Needs Improvement";
}

export interface MetricTrend {
  metric_name: string;
  metric_type: string;
  unit: string;
  start_value: number;
  end_value: number;
  change_percent: number;
  data_points: { date: string; value: number }[];
}

export interface WeeklyBreakdown {
  week_number: number;
  week_start: string;
  completed: number;
  expected: number;
}

export interface ComplianceData {
  weekly_breakdown: WeeklyBreakdown[];
  calendar_data: { date: string; completed: boolean }[];
  homework_completion_rate: number;
}

export interface Achievement {
  title: string;
  description: string;
  metric_name?: string;
  change_percent?: number;
}

export interface ReportData {
  summary: ReportSummary;
  metrics: MetricTrend[];
  compliance: ComplianceData;
  achievements: Achievement[];
  coach_notes: string;
  next_month_goals: string[];
}

export interface ProgressReport {
  id: string;
  client_id: string;
  coach_id: string;
  period_start: string;
  period_end: string;
  report_data: ReportData;
  pdf_url: string | null;
  share_token: string | null;
  generated_at: string;
  created_at: string;
}

function generateRandomToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useProgressReports(clientId?: string, coachId?: string) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all reports for a client
  const { data: reports, isLoading: isLoadingReports } = useQuery({
    queryKey: ["progressReports", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("progress_reports")
        .select("*")
        .eq("client_id", clientId)
        .order("period_end", { ascending: false });

      if (error) throw error;
      return data as unknown as ProgressReport[];
    },
    enabled: !!clientId,
  });

  // Fetch a single report by ID
  const fetchReportById = async (reportId: string) => {
    const { data, error } = await supabase
      .from("progress_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error) throw error;
    return data as unknown as ProgressReport;
  };

  // Fetch a report by share token (public access)
  const fetchReportByToken = async (shareToken: string) => {
    const { data, error } = await supabase
      .from("progress_reports")
      .select("*")
      .eq("share_token", shareToken)
      .single();

    if (error) throw error;
    return data as unknown as ProgressReport;
  };

  // Generate report data from database
  const generateReportData = async (
    targetClientId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ReportData> => {
    // 1. Fetch workout logs
    const { data: workoutLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("client_id", targetClientId)
      .gte("workout_date", format(periodStart, "yyyy-MM-dd"))
      .lte("workout_date", format(periodEnd, "yyyy-MM-dd"))
      .order("workout_date");

    const logs = workoutLogs || [];

    // 2. Fetch performance metrics
    const { data: metricData } = await supabase
      .from("performance_metrics")
      .select("*")
      .eq("client_id", targetClientId)
      .gte("recorded_date", format(periodStart, "yyyy-MM-dd"))
      .lte("recorded_date", format(periodEnd, "yyyy-MM-dd"))
      .order("recorded_date");

    const metrics = metricData || [];

    // 3. Fetch metric definitions for display names
    const { data: metricDefs } = await supabase
      .from("metric_definitions")
      .select("*");

    const metricDefinitions = metricDefs || [];
    const metricDefMap = new Map(metricDefinitions.map(d => [d.metric_type, d]));

    // Group metrics by type and calculate trends
    const metricsByType = metrics.reduce((acc, metric) => {
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = [];
      }
      acc[metric.metric_type].push(metric);
      return acc;
    }, {} as Record<string, typeof metrics>);

    const metricTrends: MetricTrend[] = Object.entries(metricsByType).map(([metricType, values]) => {
      const sorted = values.sort((a, b) => 
        new Date(a.recorded_date || "").getTime() - new Date(b.recorded_date || "").getTime()
      );
      const startValue = sorted[0]?.value || 0;
      const endValue = sorted[sorted.length - 1]?.value || 0;
      const change = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
      const def = metricDefMap.get(metricType);

      return {
        metric_name: def?.display_name || metricType,
        metric_type: metricType,
        unit: def?.unit || "",
        start_value: Number(startValue),
        end_value: Number(endValue),
        change_percent: change,
        data_points: sorted.map(m => ({ 
          date: m.recorded_date || "", 
          value: Number(m.value) 
        }))
      };
    });

    // 4. Calculate compliance
    const { data: clientProgram } = await supabase
      .from("client_programs")
      .select("program_id, programs(workouts_per_week)")
      .eq("client_id", targetClientId)
      .eq("is_active", true)
      .single();

    const workoutsPerWeek = (clientProgram?.programs as { workouts_per_week?: number } | null)?.workouts_per_week || 3;
    const weeksInPeriod = Math.max(1, differenceInWeeks(periodEnd, periodStart));
    const expectedSessions = workoutsPerWeek * weeksInPeriod;
    const completedSessions = logs.filter(l => l.completed_at).length;
    const complianceRate = expectedSessions > 0 ? (completedSessions / expectedSessions) * 100 : 0;

    // Generate weekly breakdown
    const weeks = eachWeekOfInterval({ start: periodStart, end: periodEnd });
    const weeklyBreakdown: WeeklyBreakdown[] = weeks.map((weekStart, index) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekLogs = logs.filter(log => {
        const logDate = new Date(log.workout_date || "");
        return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
      });

      return {
        week_number: index + 1,
        week_start: format(weekStart, "yyyy-MM-dd"),
        completed: weekLogs.filter(l => l.completed_at).length,
        expected: workoutsPerWeek
      };
    });

    // Generate calendar data
    const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
    const calendarData = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const hasWorkout = logs.some(log => log.workout_date === dayStr && log.completed_at);
      return { date: dayStr, completed: hasWorkout };
    });

    // 5. Calculate homework completion
    const { data: homeworkLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("client_id", targetClientId)
      .eq("session_type", "homework")
      .gte("workout_date", format(periodStart, "yyyy-MM-dd"))
      .lte("workout_date", format(periodEnd, "yyyy-MM-dd"));

    const homeworkTotal = homeworkLogs?.length || 0;
    const homeworkCompleted = homeworkLogs?.filter(h => h.completed_at).length || 0;
    const homeworkRate = homeworkTotal > 0 ? (homeworkCompleted / homeworkTotal) * 100 : 100;

    // 6. Find achievements (significant improvements)
    const achievements: Achievement[] = metricTrends
      .filter(m => m.change_percent > 5)
      .sort((a, b) => b.change_percent - a.change_percent)
      .slice(0, 5)
      .map(m => ({
        title: `${m.metric_name} Improvement`,
        description: `Improved by ${m.change_percent.toFixed(1)}% (${m.start_value}${m.unit} → ${m.end_value}${m.unit})`,
        metric_name: m.metric_name,
        change_percent: m.change_percent
      }));

    // Add consistency achievement if compliance is high
    if (complianceRate >= 80) {
      achievements.unshift({
        title: "Excellent Consistency",
        description: `Completed ${complianceRate.toFixed(0)}% of scheduled workouts this month`
      });
    }

    // 7. Determine overall rating
    let overallRating: ReportSummary["overall_rating"] = "Needs Improvement";
    if (complianceRate >= 90) overallRating = "Excellent";
    else if (complianceRate >= 75) overallRating = "Good";
    else if (complianceRate >= 50) overallRating = "Fair";

    const topAchievement = achievements[0]?.title || "Consistent Training";

    return {
      summary: {
        total_sessions: completedSessions,
        expected_sessions: expectedSessions,
        compliance_rate: complianceRate,
        top_achievement: topAchievement,
        overall_rating: overallRating
      },
      metrics: metricTrends,
      compliance: {
        weekly_breakdown: weeklyBreakdown,
        calendar_data: calendarData,
        homework_completion_rate: homeworkRate
      },
      achievements,
      coach_notes: "",
      next_month_goals: []
    };
  };

  // Generate a new report
  const generateReportMutation = useMutation({
    mutationFn: async ({ 
      targetClientId, 
      periodStart, 
      periodEnd 
    }: { 
      targetClientId: string; 
      periodStart: Date; 
      periodEnd: Date;
    }) => {
      if (!coachId) throw new Error("Coach ID required");

      setIsGenerating(true);
      
      // Generate report data
      const reportData = await generateReportData(targetClientId, periodStart, periodEnd);
      
      // Create share token
      const shareToken = generateRandomToken(32);

      // Save to database
      const { data, error } = await supabase
        .from("progress_reports")
        .insert([{
          client_id: targetClientId,
          coach_id: coachId,
          period_start: format(periodStart, "yyyy-MM-dd"),
          period_end: format(periodEnd, "yyyy-MM-dd"),
          report_data: JSON.parse(JSON.stringify(reportData)),
          share_token: shareToken
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProgressReport;
    },
    onSuccess: () => {
      toast.success("Progress report generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["progressReports"] });
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
      setIsGenerating(false);
    }
  });

  // Update report (coach notes, goals)
  const updateReportMutation = useMutation({
    mutationFn: async ({ 
      reportId, 
      updates 
    }: { 
      reportId: string; 
      updates: Partial<ReportData>;
    }) => {
      // Fetch current report
      const { data: currentReport } = await supabase
        .from("progress_reports")
        .select("report_data")
        .eq("id", reportId)
        .single();

      if (!currentReport) throw new Error("Report not found");

      const currentData = currentReport.report_data as unknown as ReportData;
      const updatedData = { ...currentData, ...updates };

      const { data, error } = await supabase
        .from("progress_reports")
        .update({ report_data: JSON.parse(JSON.stringify(updatedData)) })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProgressReport;
    },
    onSuccess: () => {
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ["progressReports"] });
    },
    onError: (error) => {
      console.error("Failed to update report:", error);
      toast.error("Failed to update report");
    }
  });

  // Delete report
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("progress_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report deleted");
      queryClient.invalidateQueries({ queryKey: ["progressReports"] });
    },
    onError: (error) => {
      console.error("Failed to delete report:", error);
      toast.error("Failed to delete report");
    }
  });

  // Helper to generate report for previous month
  const generateLastMonthReport = async (targetClientId: string) => {
    const lastMonth = subMonths(new Date(), 1);
    const periodStart = startOfMonth(lastMonth);
    const periodEnd = endOfMonth(lastMonth);
    
    return generateReportMutation.mutateAsync({
      targetClientId,
      periodStart,
      periodEnd
    });
  };

  return {
    reports,
    isLoadingReports,
    isGenerating,
    fetchReportById,
    fetchReportByToken,
    generateReport: generateReportMutation.mutate,
    generateReportAsync: generateReportMutation.mutateAsync,
    generateLastMonthReport,
    updateReport: updateReportMutation.mutate,
    deleteReport: deleteReportMutation.mutate,
  };
}
