import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Flame,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import ClientAssessmentHistory from "./ClientAssessmentHistory";

interface ProgressTabProps {
  clientId: string;
}

interface MetricData {
  id: string;
  metric_type: string;
  value: number;
  unit: string | null;
  recorded_date: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
  displayDate: string;
}

interface WorkoutSummary {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  streak: number;
}

const METRIC_TYPES = [
  { value: "clubhead_speed", label: "Clubhead Speed", unit: "mph" },
  { value: "ball_speed", label: "Ball Speed", unit: "mph" },
  { value: "handicap", label: "Handicap", unit: "" },
  { value: "carry_distance", label: "Carry Distance", unit: "yards" },
  { value: "smash_factor", label: "Smash Factor", unit: "" },
];

const ProgressTab = ({ clientId }: ProgressTabProps) => {
  const { profile } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState("clubhead_speed");
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary>({
    totalWorkouts: 0,
    thisWeek: 0,
    thisMonth: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [newMetric, setNewMetric] = useState({
    type: "clubhead_speed",
    value: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  useEffect(() => {
    if (metrics.length > 0) {
      filterChartData(selectedMetric);
    }
  }, [selectedMetric, metrics]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchWorkoutSummary(),
      ]);
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
    filterChartData(selectedMetric, data || []);
  };

  const filterChartData = (metricType: string, data?: MetricData[]) => {
    const sourceData = data || metrics;
    const filtered = sourceData
      .filter(m => m.metric_type === metricType)
      .map(m => ({
        date: m.recorded_date,
        value: m.value,
        displayDate: format(parseISO(m.recorded_date), "MMM d"),
      }));
    setChartData(filtered);
  };

  const fetchWorkoutSummary = async () => {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);

    // Total completed workouts
    const { count: totalCount } = await supabase
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("completed_at", "is", null);

    // This week
    const { count: weekCount } = await supabase
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("workout_date", format(weekAgo, "yyyy-MM-dd"));

    // This month
    const { count: monthCount } = await supabase
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("completed_at", "is", null)
      .gte("workout_date", format(monthAgo, "yyyy-MM-dd"));

    // Calculate streak
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
      
      // Check if worked out today or yesterday
      const hasRecent = recentWorkouts.some(w => 
        w.workout_date === todayStr || w.workout_date === yesterdayStr
      );

      if (hasRecent) {
        for (let i = 0; i < recentWorkouts.length; i++) {
          const expectedDate = format(subDays(today, i), "yyyy-MM-dd");
          const prevDate = format(subDays(today, i + 1), "yyyy-MM-dd");
          
          if (recentWorkouts.some(w => w.workout_date === expectedDate || w.workout_date === prevDate)) {
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

  const handleAddMetric = async () => {
    if (!newMetric.value) return;

    setIsSaving(true);
    try {
      const metricConfig = METRIC_TYPES.find(m => m.value === newMetric.type);
      
      const { error } = await supabase
        .from("performance_metrics")
        .insert({
          client_id: clientId,
          metric_type: newMetric.type,
          value: parseFloat(newMetric.value),
          unit: metricConfig?.unit || null,
          recorded_date: format(new Date(), "yyyy-MM-dd"),
        });

      if (error) throw error;

      toast({
        title: "Metric Added",
        description: "Your performance metric has been recorded.",
      });

      setShowAddMetric(false);
      setNewMetric({ type: "clubhead_speed", value: "" });
      fetchMetrics();
    } catch (error) {
      console.error("Error adding metric:", error);
      toast({
        title: "Error",
        description: "Failed to add metric. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getLatestMetric = (type: string) => {
    const filtered = metrics.filter(m => m.metric_type === type);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  };

  const getMetricChange = (type: string) => {
    const filtered = metrics.filter(m => m.metric_type === type);
    if (filtered.length < 2) return null;
    
    const latest = filtered[filtered.length - 1].value;
    const previous = filtered[filtered.length - 2].value;
    return latest - previous;
  };

  if (isLoading) {
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

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Performance Metrics</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAddMetric(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedMetric} onValueChange={setSelectedMetric}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              {METRIC_TYPES.slice(0, 3).map((metric) => (
                <TabsTrigger key={metric.value} value={metric.value} className="flex-1 text-xs">
                  {metric.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {METRIC_TYPES.map((metric) => {
              const latest = getLatestMetric(metric.value);
              const change = getMetricChange(metric.value);

              return (
                <TabsContent key={metric.value} value={metric.value} className="mt-4">
                  {/* Current Value */}
                  {latest && (
                    <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Current</p>
                        <p className="text-2xl font-bold text-foreground">
                          {metric.value === "handicap" && latest.value < 0 ? "+" : ""}
                          {Math.abs(latest.value).toFixed(1)}
                          {metric.unit && <span className="text-sm font-normal ml-1">{metric.unit}</span>}
                        </p>
                      </div>
                      {change !== null && (
                        <div className={`flex items-center gap-1 ${
                          (metric.value === "handicap" ? change < 0 : change > 0) 
                            ? "text-success" 
                            : "text-destructive"
                        }`}>
                          {(metric.value === "handicap" ? change < 0 : change > 0) ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">
                            {change > 0 ? "+" : ""}{change.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chart */}
                  {chartData.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="displayDate" 
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      <p>No data recorded yet</p>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Assessments */}
      {profile && (
        <ClientAssessmentHistory 
          clientId={clientId} 
          clientName={profile.full_name || "Client"} 
        />
      )}

      {/* Add Metric Dialog */}
      <Dialog open={showAddMetric} onOpenChange={setShowAddMetric}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Performance Metric</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Metric Type
              </label>
              <Select
                value={newMetric.type}
                onValueChange={(value) => setNewMetric(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_TYPES.map((metric) => (
                    <SelectItem key={metric.value} value={metric.value}>
                      {metric.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Value
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder={`Enter ${METRIC_TYPES.find(m => m.value === newMetric.type)?.label.toLowerCase()}`}
                value={newMetric.value}
                onChange={(e) => setNewMetric(prev => ({ ...prev, value: e.target.value }))}
              />
              {METRIC_TYPES.find(m => m.value === newMetric.type)?.unit && (
                <p className="text-xs text-muted-foreground mt-1">
                  Unit: {METRIC_TYPES.find(m => m.value === newMetric.type)?.unit}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMetric(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMetric} disabled={!newMetric.value || isSaving}>
              {isSaving ? "Saving..." : "Add Metric"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgressTab;
