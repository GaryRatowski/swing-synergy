import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface MetricsTabProps {
  clientId: string;
}

interface Metric {
  id: string;
  metric_type: string;
  value: number;
  unit: string | null;
  recorded_date: string | null;
  notes: string | null;
}

const METRIC_TYPES = [
  { value: "clubhead_speed", label: "Clubhead Speed", unit: "mph" },
  { value: "ball_speed", label: "Ball Speed", unit: "mph" },
  { value: "handicap", label: "Handicap", unit: "" },
  { value: "driving_distance", label: "Driving Distance", unit: "yards" },
  { value: "body_weight", label: "Body Weight", unit: "lbs" },
];

const MetricsTab = ({ clientId }: MetricsTabProps) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("clubhead_speed");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMetric, setNewMetric] = useState({ type: "clubhead_speed", value: "", notes: "" });

  useEffect(() => {
    fetchMetrics();
  }, [clientId]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("performance_metrics")
      .select("*")
      .eq("client_id", clientId)
      .order("recorded_date", { ascending: true });

    if (error) {
      console.error("Error fetching metrics:", error);
    } else {
      setMetrics(data || []);
    }
    setIsLoading(false);
  };

  const handleAddMetric = async () => {
    const metricConfig = METRIC_TYPES.find(m => m.value === newMetric.type);
    
    // For handicap, convert "+" prefix to negative value (golf convention)
    let numericValue = newMetric.value.trim();
    if (newMetric.type === "handicap" && numericValue.startsWith("+")) {
      numericValue = `-${numericValue.slice(1)}`;
    }
    
    const { error } = await supabase.from("performance_metrics").insert({
      client_id: clientId,
      metric_type: newMetric.type,
      value: parseFloat(numericValue),
      unit: metricConfig?.unit || null,
      notes: newMetric.notes || null,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add metric", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Metric added successfully" });
      setNewMetric({ type: "clubhead_speed", value: "", notes: "" });
      setIsDialogOpen(false);
      fetchMetrics();
    }
  };

  const filteredMetrics = metrics.filter(m => m.metric_type === selectedType);
  const chartData = filteredMetrics.map(m => ({
    date: m.recorded_date ? new Date(m.recorded_date).toLocaleDateString() : "N/A",
    value: m.value,
  }));

  const selectedMetricConfig = METRIC_TYPES.find(m => m.value === selectedType);

  // Format handicap values: negative numbers get "+" prefix (golf convention)
  const formatHandicapValue = (value: number) => {
    if (selectedType === "handicap" && value < 0) {
      return `+${Math.abs(value)}`;
    }
    return value.toString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Metric
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Metric</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Metric Type</Label>
                <Select value={newMetric.type} onValueChange={(v) => setNewMetric({ ...newMetric, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Value {newMetric.type === "handicap" ? "(use + for plus handicap, e.g. +2.8)" : `(${METRIC_TYPES.find(m => m.value === newMetric.type)?.unit || ""})`}
                </Label>
                <Input
                  type={newMetric.type === "handicap" ? "text" : "number"}
                  value={newMetric.value}
                  onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                  placeholder={newMetric.type === "handicap" ? "e.g. 12.5 or +2.8" : "Enter value"}
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  value={newMetric.notes}
                  onChange={(e) => setNewMetric({ ...newMetric, notes: e.target.value })}
                  placeholder="Any notes..."
                />
              </div>
              <Button onClick={handleAddMetric} className="w-full" disabled={!newMetric.value}>
                Save Metric
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {selectedMetricConfig?.label} History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data recorded yet for this metric
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis 
                    className="text-xs" 
                    tickFormatter={(value) => selectedType === "handicap" && value < 0 ? `+${Math.abs(value)}` : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                    formatter={(value: number) => [
                      selectedType === "handicap" && value < 0 ? `+${Math.abs(value)}` : value,
                      selectedMetricConfig?.label
                    ]}
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
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet</p>
          ) : (
            <div className="space-y-2">
              {filteredMetrics.slice(-5).reverse().map(metric => (
                <div key={metric.id} className="flex justify-between items-center text-sm py-1 border-b border-border last:border-0">
                  <span className="text-muted-foreground">
                    {metric.recorded_date ? new Date(metric.recorded_date).toLocaleDateString() : "N/A"}
                  </span>
                  <span className="font-medium">
                    {formatHandicapValue(metric.value)} {metric.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsTab;
