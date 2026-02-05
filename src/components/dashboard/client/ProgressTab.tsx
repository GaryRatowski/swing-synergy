import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  Flame,
  Activity,
  ChevronRight,
} from "lucide-react";
import { format, parseISO, subDays, differenceInDays } from "date-fns";
import ClientAssessmentHistory from "./ClientAssessmentHistory";
import ClientSwingVideos from "./ClientSwingVideos";
import ClientFlagHistory from "./ClientFlagHistory";
import { useClientActiveMetrics, MetricDefinition } from "@/hooks/useMetricDefinitions";
import { TrendType, TREND_CONFIG, isHandicapMetric, formatHandicap } from "@/lib/metricsConfig";

interface ProgressTabProps {
  clientId: string;
}

interface MetricData {
  id: string;
  metric_type: string;
  value: number;
  unit: string | null;
  recorded_date: string;
  client_display_value: string | null;
  client_display_trend: string | null;
  is_bilateral: boolean | null;
  value_left: number | null;
  value_right: number | null;
}

interface WorkoutSummary {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  streak: number;
}

const ProgressTab = ({ clientId }: ProgressTabProps) => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary>({
    totalWorkouts: 0,
    thisWeek: 0,
    thisMonth: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);

  const { activeMetrics, isLoading: activeMetricsLoading } = useClientActiveMetrics(clientId);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchMetrics(), fetchWorkoutSummary(), fetchDefinitions()]);
    } catch (error) {
      console.error("Error fetching progress data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from("performance_metrics")
      .select("*")
      .eq("client_id", clientId)
      .order("recorded_date", { ascending: true });

    if (error) {
      console.error("Error fetching metrics:", error);
      return;
    }

    setMetrics(data || []);
  };

  const fetchDefinitions = async () => {
    const { data, error } = await supabase
      .from("metric_definitions")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching definitions:", error);
      return;
    }

    setDefinitions(data || []);
  };

  const fetchWorkoutSummary = async () => {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);

    const { count: totalCount } = await supabase
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("completed_at", "is", null);

    const { count: weekCount } = await supabase
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("workout_date", format(weekAgo, "yyyy-MM-dd"));

    const { count: monthCount } = await supabase
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("workout_date", format(monthAgo, "yyyy-MM-dd"));

    const { data: recentWorkouts } = await supabase
      .from("workout_logs")
      .select("workout_date")
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .order("workout_date", { ascending: false })
      .limit(30);

    let streak = 0;
    if (recentWorkouts && recentWorkouts.length > 0) {
      const todayStr = format(today, "yyyy-MM-dd");
      const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

      const hasRecent = recentWorkouts.some(
        (w) => w.workout_date === todayStr || w.workout_date === yesterdayStr
      );

      if (hasRecent) {
        for (let i = 0; i < recentWorkouts.length; i++) {
          const expectedDate = format(subDays(today, i), "yyyy-MM-dd");
          const prevDate = format(subDays(today, i + 1), "yyyy-MM-dd");

          if (
            recentWorkouts.some(
              (w) => w.workout_date === expectedDate || w.workout_date === prevDate
            )
          ) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    setWorkoutSummary({
      totalWorkouts: totalCount || 0,
      thisWeek: weekCount || 0,
      thisMonth: monthCount || 0,
      streak,
    });
  };

  // Get enabled metric types from client_active_metrics
  const enabledMetricTypes = activeMetrics.map((m) => m.metric_type);

  // Get definition for a metric type
  const getDefinition = (metricType: string) => {
    return definitions.find((d) => d.metric_type === metricType);
  };

  // Get latest metric for each enabled type
  const getLatestByType = () => {
    const latest: Record<string, MetricData> = {};
    metrics.forEach((m) => {
      // Only include if this metric is enabled for this client
      if (!enabledMetricTypes.includes(m.metric_type)) return;
      
      if (
        !latest[m.metric_type] ||
        new Date(m.recorded_date || "") > new Date(latest[m.metric_type].recorded_date || "")
      ) {
        latest[m.metric_type] = m;
      }
    });
    return latest;
  };

  const latestMetrics = getLatestByType();

  // Get chart data for selected metric (last 6 readings)
  const getChartData = (metricType: string) => {
    return metrics
      .filter((m) => m.metric_type === metricType)
      .slice(-6)
      .map((m) => ({
        date: m.recorded_date,
        value: m.value,
        displayDate: format(parseISO(m.recorded_date), "MMM d"),
      }));
  };

  // Check if selected metric is handicap
  const isSelectedHandicap = selectedMetric ? isHandicapMetric(selectedMetric) : false;
  const selectedChartData = selectedMetric ? getChartData(selectedMetric) : [];
  // Always show scratch line for handicap charts
  const showScratchLine = isSelectedHandicap;

  // Format metric display value
  const formatMetricDisplayValue = (metric: MetricData, def: MetricDefinition) => {
    if (isHandicapMetric(metric.metric_type)) {
      return formatHandicap(metric.value);
    }
    return metric.client_display_value || metric.value.toFixed(1);
  };

  const getTrendBadge = (trend: string | null) => {
    const trendKey = (trend || "baseline") as TrendType;
    const config = TREND_CONFIG[trendKey];

    const icons = {
      up: <TrendingUp className="h-3 w-3 mr-1" />,
      down: <TrendingDown className="h-3 w-3 mr-1" />,
      stable: <Minus className="h-3 w-3 mr-1" />,
      baseline: null,
    };

    return (
      <Badge variant="secondary" className={`text-xs ${config.color}`}>
        {icons[config.icon]}
        {config.label}
      </Badge>
    );
  };

  const getDaysAgo = (dateStr: string) => {
    const days = differenceInDays(new Date(), parseISO(dateStr));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const openChartDialog = (metricType: string) => {
    setSelectedMetric(metricType);
    setChartDialogOpen(true);
  };

  if (isLoading || activeMetricsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Group metrics by category (only enabled ones)
  const enabledDefinitions = definitions.filter((d) =>
    enabledMetricTypes.includes(d.metric_type)
  );
  const golfMetricsWithData = enabledDefinitions.filter(
    (d) => d.category === "Golf Performance" && latestMetrics[d.metric_type]
  );
  const physicalMetricsWithData = enabledDefinitions.filter(
    (d) => d.category === "Physical Assessment" && latestMetrics[d.metric_type]
  );
  const customMetricsWithData = enabledDefinitions.filter(
    (d) => d.category === "Custom" && latestMetrics[d.metric_type]
  );

  const hasNoMetrics =
    enabledMetricTypes.length === 0 ||
    (golfMetricsWithData.length === 0 &&
      physicalMetricsWithData.length === 0 &&
      customMetricsWithData.length === 0);

  return (
    <div className="space-y-6">
      {/* Workout Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 mx-auto text-accent mb-2" />
            <p className="text-2xl font-bold text-foreground">{workoutSummary.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{workoutSummary.thisWeek}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold text-foreground">{workoutSummary.thisMonth}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{workoutSummary.totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Total Workouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Golf Performance Metrics */}
      {golfMetricsWithData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Golf Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {golfMetricsWithData.map((def) => {
                const metric = latestMetrics[def.metric_type];
                return (
                  <Card
                    key={def.metric_type}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openChartDialog(def.metric_type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            {def.display_name}
                          </p>
                          <p className="text-2xl font-bold">
                            {formatMetricDisplayValue(metric, def)}
                            {!isHandicapMetric(def.metric_type) && (
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                {def.unit}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last tested {getDaysAgo(metric.recorded_date)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getTrendBadge(metric.client_display_trend)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Physical Assessment Metrics */}
      {physicalMetricsWithData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Physical Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {physicalMetricsWithData.map((def) => {
                const metric = latestMetrics[def.metric_type];
                return (
                  <Card
                    key={def.metric_type}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openChartDialog(def.metric_type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            {def.display_name}
                          </p>
                          <p className="text-2xl font-bold">
                            {formatMetricDisplayValue(metric, def)}
                            {!isHandicapMetric(def.metric_type) && (
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                {def.unit}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last tested {getDaysAgo(metric.recorded_date)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getTrendBadge(metric.client_display_trend)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Metrics */}
      {customMetricsWithData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Custom Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customMetricsWithData.map((def) => {
                const metric = latestMetrics[def.metric_type];
                return (
                  <Card
                    key={def.metric_type}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openChartDialog(def.metric_type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            {def.display_name}
                          </p>
                          <p className="text-2xl font-bold">
                            {formatMetricDisplayValue(metric, def)}
                            {!isHandicapMetric(def.metric_type) && (
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                {def.unit}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last tested {getDaysAgo(metric.recorded_date)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getTrendBadge(metric.client_display_trend)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Metrics Message */}
      {hasNoMetrics && (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              No Performance Metrics Yet
            </p>
            <p className="text-sm text-muted-foreground">
              Your coach hasn't assigned any performance metrics yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Swing Videos */}
      <ClientSwingVideos clientId={clientId} />

      {/* Reported Issues */}
      <ClientFlagHistory clientId={clientId} />

      {/* Assessments */}
      {profile && (
        <ClientAssessmentHistory
          clientId={clientId}
          clientName={profile.full_name || "Client"}
        />
      )}

      {/* Chart Dialog */}
      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedMetric && getDefinition(selectedMetric)?.display_name} History
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            {selectedMetric && (
              <>
                {selectedChartData.length > 1 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="displayDate"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          domain={["auto", "auto"]}
                          tickFormatter={isSelectedHandicap ? (val: number) => formatHandicap(val) : undefined}
                          reversed={isSelectedHandicap}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [
                            isSelectedHandicap 
                              ? formatHandicap(value)
                              : `${value.toFixed(1)} ${getDefinition(selectedMetric)?.unit || ""}`,
                            getDefinition(selectedMetric)?.display_name,
                          ]}
                        />
                        {showScratchLine && (
                          <ReferenceLine 
                            y={0} 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={1.5}
                            strokeDasharray="4 4" 
                            label={{ value: "Scratch", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    <p>Need at least 2 readings to show chart</p>
                  </div>
                )}

                {/* Recent Readings */}
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Recent Readings</p>
                  {selectedChartData
                    .slice()
                    .reverse()
                    .map((d, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {format(parseISO(d.date), "MMM d, yyyy")}
                        </span>
                        <span className="font-medium">
                          {isSelectedHandicap 
                            ? formatHandicap(d.value)
                            : `${d.value.toFixed(1)} ${getDefinition(selectedMetric)?.unit || ""}`
                          }
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgressTab;
