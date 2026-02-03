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
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { format, parseISO } from "date-fns";

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

const SessionMetrics = ({
  clientId,
  sessionDate,
  onMetricsChange,
}: SessionMetricsProps) => {
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [metricHistory, setMetricHistory] = useState<MetricHistory[]>([]);
  const [newMetricType, setNewMetricType] = useState("");
  const [newMetricValue, setNewMetricValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

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
          data: data.slice(-5), // Last 5 readings
        })
      );
      setMetricHistory(history);
    }

    setLoading(false);
  };

  const handleAddMetric = async () => {
    if (!newMetricType || !newMetricValue) {
      toast({
        title: "Error",
        description: "Please select a metric type and enter a value",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);

    const metricConfig = METRIC_TYPES.find((m) => m.value === newMetricType);
    const unit = metricConfig?.unit || "";

    const { data, error } = await supabase
      .from("performance_metrics")
      .insert({
        client_id: clientId,
        metric_type: newMetricType,
        value: parseFloat(newMetricValue),
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
      metric_type: newMetricType,
      value: parseFloat(newMetricValue),
      unit,
      recorded_date: sessionDate,
    };

    const updatedMetrics = [...metrics, newEntry];
    setMetrics(updatedMetrics);
    onMetricsChange(updatedMetrics);

    // Update history
    const existingHistory = metricHistory.find((h) => h.metric_type === newMetricType);
    if (existingHistory) {
      existingHistory.data.push({ date: sessionDate, value: parseFloat(newMetricValue) });
      if (existingHistory.data.length > 5) existingHistory.data.shift();
      setMetricHistory([...metricHistory]);
    } else {
      setMetricHistory([
        ...metricHistory,
        {
          metric_type: newMetricType,
          data: [{ date: sessionDate, value: parseFloat(newMetricValue) }],
        },
      ]);
    }

    setNewMetricType("");
    setNewMetricValue("");
    setAdding(false);
    toast({ title: "Metric added" });
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

  const getHistoryForMetric = (type: string) => {
    return metricHistory.find((h) => h.metric_type === type)?.data || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
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

      {/* Add new metric */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Select value={newMetricType} onValueChange={setNewMetricType}>
              <SelectTrigger className="flex-1 h-9">
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
            <Input
              type="number"
              step="any"
              placeholder="Value"
              value={newMetricValue}
              onChange={(e) => setNewMetricValue(e.target.value)}
              className="w-24 h-9"
            />
            <Button
              onClick={handleAddMetric}
              disabled={adding || !newMetricType || !newMetricValue}
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recorded metrics with mini charts */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {getMetricLabel(metric.metric_type)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMetric(index)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-primary">
                          {metric.value}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {metric.unit}
                          </span>
                        </span>
                        {history.length > 1 && (
                          <div className="flex-1 h-10">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={history}>
                                <YAxis domain={["auto", "auto"]} hide />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-popover text-popover-foreground border rounded px-2 py-1 text-xs">
                                          {payload[0].value} {metric.unit}
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth={2}
                                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                      {history.length > 1 && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Last {history.length} readings
                          </span>
                        </div>
                      )}
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
