import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Activity, Zap, RotateCcw, Loader2 } from "lucide-react";

interface MetricEntry {
  id?: string;
  metric_type: string;
  value: number;
  unit: string;
  recorded_date: string;
}

interface MetricHistory {
  metric_type: string;
  data: { date: string; value: number }[];
}

interface SessionMetricsProps {
  clientId: string;
  sessionDate: string;
  onMetricsChange: (metrics: MetricEntry[]) => void;
}

const METRIC_TYPES = [
  { value: "clubhead_speed", label: "Clubhead Speed", unit: "mph" },
  { value: "ball_speed", label: "Ball Speed", unit: "mph" },
  { value: "smash_factor", label: "Smash Factor", unit: "" },
  { value: "carry_distance", label: "Carry Distance", unit: "yards" },
  { value: "total_distance", label: "Total Distance", unit: "yards" },
  { value: "launch_angle", label: "Launch Angle", unit: "°" },
  { value: "spin_rate", label: "Spin Rate", unit: "rpm" },
  { value: "mobility_score_hip", label: "Hip Mobility", unit: "°" },
  { value: "mobility_score_shoulder", label: "Shoulder Mobility", unit: "°" },
  { value: "mobility_score_thoracic", label: "T-Spine Rotation", unit: "°" },
  { value: "vertical_jump", label: "Vertical Jump", unit: "in" },
  { value: "med_ball_throw", label: "Med Ball Throw", unit: "ft" },
];

// Quick add metrics configuration
const QUICK_ADD_METRICS = [
  { value: "clubhead_speed", label: "Clubhead Speed", icon: Zap },
  { value: "mobility_score_thoracic", label: "Mobility Score", icon: RotateCcw },
];

// Mini trend component showing last 3 readings as connected dots
const MiniTrend = ({ data, unit }: { data: { date: string; value: number }[]; unit: string }) => {
  if (data.length < 2) return null;
  
  const lastThree = data.slice(-3);
  const values = lastThree.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  return (
    <div className="flex items-center gap-1">
      <svg width="48" height="24" className="overflow-visible">
        {/* Lines connecting dots */}
        {lastThree.map((point, i) => {
          if (i === 0) return null;
          const prevPoint = lastThree[i - 1];
          const x1 = (i - 1) * 20 + 4;
          const x2 = i * 20 + 4;
          const y1 = 20 - ((prevPoint.value - min) / range) * 16;
          const y2 = 20 - ((point.value - min) / range) * 16;
          return (
            <line
              key={`line-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        {/* Dots */}
        {lastThree.map((point, i) => {
          const x = i * 20 + 4;
          const y = 20 - ((point.value - min) / range) * 16;
          return (
            <circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r="4"
              fill="hsl(var(--primary))"
              className="cursor-pointer"
            >
              <title>{point.value} {unit}</title>
            </circle>
          );
        })}
      </svg>
      <span className="text-[10px] text-muted-foreground ml-1">
        Last {lastThree.length}
      </span>
    </div>
  );
};

const SessionMetrics = ({
  clientId,
  sessionDate,
  onMetricsChange,
}: SessionMetricsProps) => {
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [metricHistory, setMetricHistory] = useState<MetricHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  // Quick add dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState("");
  const [quickAddValue, setQuickAddValue] = useState("");

  useEffect(() => {
    loadMetrics();
  }, [clientId, sessionDate]);

  const loadMetrics = async () => {
    setLoading(true);

    // Load today's metrics
    const { data: todayMetrics } = await supabase
      .from("performance_metrics")
      .select("*")
      .eq("client_id", clientId)
      .eq("recorded_date", sessionDate);

    if (todayMetrics) {
      const entries: MetricEntry[] = todayMetrics.map((m) => ({
        id: m.id,
        metric_type: m.metric_type,
        value: m.value,
        unit: m.unit || "",
        recorded_date: m.recorded_date || sessionDate,
      }));
      setMetrics(entries);
      onMetricsChange(entries);
    }

    // Load history for all metric types
    const { data: historyData } = await supabase
      .from("performance_metrics")
      .select("metric_type, value, recorded_date")
      .eq("client_id", clientId)
      .order("recorded_date", { ascending: true })
      .limit(100);

    if (historyData) {
      const historyByType: Record<string, { date: string; value: number }[]> = {};

      historyData.forEach((m) => {
        if (!historyByType[m.metric_type]) {
          historyByType[m.metric_type] = [];
        }
        historyByType[m.metric_type].push({
          date: m.recorded_date || "",
          value: m.value,
        });
      });

      const history: MetricHistory[] = Object.entries(historyByType).map(
        ([metric_type, data]) => ({
          metric_type,
          data: data.slice(-5),
        })
      );
      setMetricHistory(history);
    }

    setLoading(false);
  };

  const handleAddMetric = async (metricType: string, value: string) => {
    if (!metricType || !value) {
      toast({
        title: "Error",
        description: "Please select a metric type and enter a value",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);

    const metricConfig = METRIC_TYPES.find((m) => m.value === metricType);
    const unit = metricConfig?.unit || "";

    const { data, error } = await supabase
      .from("performance_metrics")
      .insert({
        client_id: clientId,
        metric_type: metricType,
        value: parseFloat(value),
        unit,
        recorded_date: sessionDate,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add metric",
        variant: "destructive",
      });
      setAdding(false);
      return;
    }

    const newEntry: MetricEntry = {
      id: data.id,
      metric_type: metricType,
      value: parseFloat(value),
      unit,
      recorded_date: sessionDate,
    };

    const updatedMetrics = [...metrics, newEntry];
    setMetrics(updatedMetrics);
    onMetricsChange(updatedMetrics);

    // Update history
    const existingHistory = metricHistory.find((h) => h.metric_type === metricType);
    if (existingHistory) {
      existingHistory.data.push({ date: sessionDate, value: parseFloat(value) });
      if (existingHistory.data.length > 5) existingHistory.data.shift();
      setMetricHistory([...metricHistory]);
    } else {
      setMetricHistory([
        ...metricHistory,
        {
          metric_type: metricType,
          data: [{ date: sessionDate, value: parseFloat(value) }],
        },
      ]);
    }

    setAdding(false);
    toast({ title: "Metric added" });
  };

  const handleQuickAdd = async () => {
    await handleAddMetric(quickAddType, quickAddValue);
    setQuickAddOpen(false);
    setQuickAddType("");
    setQuickAddValue("");
  };

  const openQuickAdd = (metricType: string) => {
    setQuickAddType(metricType);
    setQuickAddValue("");
    setQuickAddOpen(true);
  };

  const handleDeleteMetric = async (index: number) => {
    const metric = metrics[index];
    if (metric.id) {
      const { error } = await supabase
        .from("performance_metrics")
        .delete()
        .eq("id", metric.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete metric",
          variant: "destructive",
        });
        return;
      }
    }

    const updatedMetrics = metrics.filter((_, i) => i !== index);
    setMetrics(updatedMetrics);
    onMetricsChange(updatedMetrics);
    toast({ title: "Metric removed" });
  };

  const getMetricLabel = (type: string) => {
    return METRIC_TYPES.find((m) => m.value === type)?.label || type;
  };

  const getMetricUnit = (type: string) => {
    return METRIC_TYPES.find((m) => m.value === type)?.unit || "";
  };

  const getHistoryForMetric = (type: string) => {
    return metricHistory.find((h) => h.metric_type === type)?.data || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <p className="text-sm text-muted-foreground">Loading metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Performance Metrics
      </Label>

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ADD_METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <Button
              key={metric.value}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => openQuickAdd(metric.value)}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {metric.label}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => openQuickAdd("")}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Other
        </Button>
      </div>

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Add Metric</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Metric Type</Label>
              <Select value={quickAddType} onValueChange={setQuickAddType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metric..." />
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
            <div className="space-y-2">
              <Label>
                Value
                {quickAddType && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({getMetricUnit(quickAddType) || "no unit"})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="Enter value..."
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              onClick={handleQuickAdd}
              disabled={adding || !quickAddType || !quickAddValue}
              className="w-full"
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recorded metrics with mini trend */}
      {metrics.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No metrics recorded for this session yet.
        </p>
      ) : (
        <div className="space-y-2">
          {metrics.map((metric, index) => {
            const history = getHistoryForMetric(metric.metric_type);
            return (
              <Card key={metric.id || index}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">
                          {getMetricLabel(metric.metric_type)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMetric(index)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-bold text-primary">
                          {metric.value}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            {metric.unit}
                          </span>
                        </span>
                        {history.length > 1 && (
                          <MiniTrend data={history} unit={metric.unit} />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionMetrics;
