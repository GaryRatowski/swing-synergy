import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, TrendingUp, TrendingDown, Minus, Pencil, Trash2, Activity, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  METRIC_CONFIGS,
  GOLF_METRICS,
  PHYSICAL_METRICS,
  getMetricConfig,
  getMetricLabel,
  getMetricUnit,
  isMetricBilateral,
  calculateTrend,
  calculateDisplayValue,
  TrendType,
} from "@/lib/metricsConfig";

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
  client_display_value: string | null;
  client_display_trend: string | null;
  is_bilateral: boolean | null;
  value_left: number | null;
  value_right: number | null;
}

const MetricsTab = ({ clientId }: MetricsTabProps) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"golf" | "physical">("golf");
  const [selectedType, setSelectedType] = useState("clubhead_speed");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);

  // New metric form state
  const [newMetric, setNewMetric] = useState({
    type: "clubhead_speed",
    value: "",
    valueLeft: "",
    valueRight: "",
    notes: "",
    date: new Date(),
  });

  // Edit form state
  const [editValue, setEditValue] = useState("");
  const [editValueLeft, setEditValueLeft] = useState("");
  const [editValueRight, setEditValueRight] = useState("");

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
    const config = getMetricConfig(newMetric.type);
    if (!config) return;

    const isBilateral = config.bilateral;
    let value: number;
    let valueLeft: number | null = null;
    let valueRight: number | null = null;

    // Validation
    if (isBilateral) {
      if (!newMetric.valueLeft || !newMetric.valueRight) {
        toast({
          title: "Error",
          description: "Both left and right values are required for bilateral metrics",
          variant: "destructive",
        });
        return;
      }
      valueLeft = parseFloat(newMetric.valueLeft);
      valueRight = parseFloat(newMetric.valueRight);
      if (valueLeft <= 0 || valueRight <= 0) {
        toast({
          title: "Error",
          description: "Values must be positive numbers",
          variant: "destructive",
        });
        return;
      }
      value = (valueLeft + valueRight) / 2;
    } else {
      if (!newMetric.value) {
        toast({
          title: "Error",
          description: "Please enter a value",
          variant: "destructive",
        });
        return;
      }
      value = parseFloat(newMetric.value);
      if (value <= 0 && newMetric.type !== "handicap") {
        toast({
          title: "Error",
          description: "Value must be a positive number",
          variant: "destructive",
        });
        return;
      }
    }

    // Date validation
    if (newMetric.date > new Date()) {
      toast({
        title: "Error",
        description: "Date cannot be in the future",
        variant: "destructive",
      });
      return;
    }

    // Get previous value for trend calculation
    const previousMetrics = metrics
      .filter(m => m.metric_type === newMetric.type)
      .sort((a, b) => new Date(b.recorded_date || "").getTime() - new Date(a.recorded_date || "").getTime());
    
    const previousValue = previousMetrics.length > 0 ? previousMetrics[0].value : null;
    const trend = calculateTrend(value, previousValue);
    const displayValue = calculateDisplayValue(value, valueLeft, valueRight, isBilateral);

    const { error } = await supabase.from("performance_metrics").insert({
      client_id: clientId,
      metric_type: newMetric.type,
      value,
      unit: config.unit || null,
      notes: newMetric.notes || null,
      recorded_date: format(newMetric.date, "yyyy-MM-dd"),
      client_display_value: displayValue,
      client_display_trend: trend,
      is_bilateral: isBilateral,
      value_left: valueLeft,
      value_right: valueRight,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add metric", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Metric added successfully" });
      setNewMetric({
        type: newMetric.type,
        value: "",
        valueLeft: "",
        valueRight: "",
        notes: "",
        date: new Date(),
      });
      setIsDialogOpen(false);
      fetchMetrics();
    }
  };

  const handleEditMetric = async () => {
    if (!editingMetric) return;

    const config = getMetricConfig(editingMetric.metric_type);
    const isBilateral = config?.bilateral || false;
    let value: number;
    let valueLeft: number | null = null;
    let valueRight: number | null = null;

    if (isBilateral) {
      if (!editValueLeft || !editValueRight) {
        toast({
          title: "Error",
          description: "Both left and right values are required",
          variant: "destructive",
        });
        return;
      }
      valueLeft = parseFloat(editValueLeft);
      valueRight = parseFloat(editValueRight);
      value = (valueLeft + valueRight) / 2;
    } else {
      value = parseFloat(editValue);
    }

    // Recalculate trend
    const previousMetrics = metrics
      .filter(m => m.metric_type === editingMetric.metric_type && m.id !== editingMetric.id)
      .sort((a, b) => new Date(b.recorded_date || "").getTime() - new Date(a.recorded_date || "").getTime());
    
    const previousValue = previousMetrics.length > 0 ? previousMetrics[0].value : null;
    const trend = calculateTrend(value, previousValue);
    const displayValue = calculateDisplayValue(value, valueLeft, valueRight, isBilateral);

    const { error } = await supabase
      .from("performance_metrics")
      .update({
        value,
        value_left: valueLeft,
        value_right: valueRight,
        client_display_value: displayValue,
        client_display_trend: trend,
      })
      .eq("id", editingMetric.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update metric", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Metric updated successfully" });
      setIsEditDialogOpen(false);
      setEditingMetric(null);
      fetchMetrics();
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    const { error } = await supabase
      .from("performance_metrics")
      .delete()
      .eq("id", metricId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete metric", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Metric deleted successfully" });
      fetchMetrics();
    }
  };

  const openEditDialog = (metric: Metric) => {
    setEditingMetric(metric);
    if (metric.is_bilateral) {
      setEditValueLeft(metric.value_left?.toString() || "");
      setEditValueRight(metric.value_right?.toString() || "");
      setEditValue("");
    } else {
      setEditValue(metric.value.toString());
      setEditValueLeft("");
      setEditValueRight("");
    }
    setIsEditDialogOpen(true);
  };

  const selectedConfig = getMetricConfig(newMetric.type);
  const isBilateral = selectedConfig?.bilateral || false;

  const categoryMetrics = selectedCategory === "golf" ? GOLF_METRICS : PHYSICAL_METRICS;
  const filteredMetrics = metrics.filter(m => {
    const config = getMetricConfig(m.metric_type);
    return config?.category === selectedCategory;
  });

  const selectedMetricData = filteredMetrics.filter(m => m.metric_type === selectedType);

  // Prepare chart data
  const chartData = selectedMetricData.map(m => {
    const config = getMetricConfig(m.metric_type);
    return {
      date: m.recorded_date ? format(new Date(m.recorded_date), "MMM d") : "N/A",
      value: m.value,
      left: m.value_left,
      right: m.value_right,
      isBilateral: config?.bilateral || false,
    };
  });

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3.5 w-3.5 text-success" />;
      case "down":
        return <TrendingDown className="h-3.5 w-3.5 text-warning" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: string | null) => {
    switch (trend) {
      case "up":
        return <Badge variant="outline" className="text-success border-success/50">↑ Improved</Badge>;
      case "down":
        return <Badge variant="outline" className="text-warning border-warning/50">↓ Needs Work</Badge>;
      case "stable":
        return <Badge variant="outline" className="text-muted-foreground">→ Stable</Badge>;
      default:
        return <Badge variant="outline" className="text-primary border-primary/50">Baseline</Badge>;
    }
  };

  // Group metrics by type for summary cards
  const getLatestByType = () => {
    const latest: Record<string, Metric> = {};
    filteredMetrics.forEach(m => {
      if (!latest[m.metric_type] || 
          new Date(m.recorded_date || "") > new Date(latest[m.metric_type].recorded_date || "")) {
        latest[m.metric_type] = m;
      }
    });
    return latest;
  };

  const latestMetrics = getLatestByType();

  return (
    <div className="space-y-4">
      {/* Category Tabs and Add Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === "golf" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedCategory("golf");
              setSelectedType("clubhead_speed");
            }}
          >
            <Target className="h-4 w-4 mr-1.5" />
            Golf Performance
          </Button>
          <Button
            variant={selectedCategory === "physical" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedCategory("physical");
              setSelectedType("hip_mobility");
            }}
          >
            <Activity className="h-4 w-4 mr-1.5" />
            Physical Assessment
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Metric
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Metric</DialogTitle>
              <DialogDescription>Record a performance or physical assessment metric</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Metric Type Selector */}
              <div>
                <Label>Metric Type</Label>
                <Select
                  value={newMetric.type}
                  onValueChange={(v) => setNewMetric({ ...newMetric, type: v, value: "", valueLeft: "", valueRight: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Golf Performance</SelectLabel>
                      {GOLF_METRICS.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Physical Assessment</SelectLabel>
                      {PHYSICAL_METRICS.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Value Inputs */}
              {isBilateral ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Left ({selectedConfig?.unit})</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={newMetric.valueLeft}
                      onChange={(e) => setNewMetric({ ...newMetric, valueLeft: e.target.value })}
                      placeholder="Left side"
                    />
                  </div>
                  <div>
                    <Label>Right ({selectedConfig?.unit})</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={newMetric.valueRight}
                      onChange={(e) => setNewMetric({ ...newMetric, valueRight: e.target.value })}
                      placeholder="Right side"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Value {selectedConfig?.unit && `(${selectedConfig.unit})`}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newMetric.value}
                    onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                    placeholder={`Enter ${selectedConfig?.label.toLowerCase()}`}
                  />
                </div>
              )}

              {/* Date Picker */}
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newMetric.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newMetric.date ? format(newMetric.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newMetric.date}
                      onSelect={(date) => date && setNewMetric({ ...newMetric, date })}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={newMetric.notes}
                  onChange={(e) => setNewMetric({ ...newMetric, notes: e.target.value })}
                  placeholder="Observations, compensations, test conditions..."
                  rows={3}
                />
              </div>

              <Button onClick={handleAddMetric} className="w-full">
                Save Metric
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categoryMetrics.slice(0, 4).map(config => {
          const latest = latestMetrics[config.value];
          if (!latest) return (
            <Card key={config.value} className="opacity-60">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                <p className="text-lg font-semibold text-muted-foreground">—</p>
              </CardContent>
            </Card>
          );
          
          return (
            <Card key={config.value} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedType(config.value)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                  {getTrendIcon(latest.client_display_trend)}
                </div>
                <p className="text-lg font-semibold">
                  {latest.client_display_value || latest.value.toFixed(1)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{config.unit}</span>
                </p>
                {latest.is_bilateral && (
                  <p className="text-xs text-muted-foreground">
                    L: {latest.value_left}{config.unit} R: {latest.value_right}{config.unit}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metric Type Selector */}
      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categoryMetrics.map(type => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {getMetricLabel(selectedType)} History
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
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  {chartData[0]?.isBilateral ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="left"
                        name="Left"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="right"
                        name="Right"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--accent))" }}
                      />
                      <Legend />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  )}
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
          {selectedMetricData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet</p>
          ) : (
            <div className="space-y-2">
              {selectedMetricData.slice(-5).reverse().map(metric => {
                const config = getMetricConfig(metric.metric_type);
                return (
                  <div
                    key={metric.id}
                    className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0"
                  >
                    <div className="space-y-1">
                      <span className="text-muted-foreground">
                        {metric.recorded_date ? format(new Date(metric.recorded_date), "MMM d, yyyy") : "N/A"}
                      </span>
                      {metric.is_bilateral && (
                        <p className="text-xs text-muted-foreground">
                          L: {metric.value_left}{config?.unit} R: {metric.value_right}{config?.unit}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendBadge(metric.client_display_trend)}
                      <span className="font-medium">
                        {metric.client_display_value || metric.value.toFixed(1)} {config?.unit}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(metric)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this metric entry? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMetric(metric.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Metric Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Metric</DialogTitle>
            <DialogDescription>Update the metric value</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingMetric?.is_bilateral ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Left ({getMetricUnit(editingMetric.metric_type)})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editValueLeft}
                    onChange={(e) => setEditValueLeft(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Right ({getMetricUnit(editingMetric.metric_type)})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editValueRight}
                    onChange={(e) => setEditValueRight(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label>
                  Value {editingMetric && `(${getMetricUnit(editingMetric.metric_type)})`}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter value"
                />
              </div>
            )}
            <Button
              onClick={handleEditMetric}
              className="w-full"
              disabled={editingMetric?.is_bilateral ? (!editValueLeft || !editValueRight) : !editValue}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MetricsTab;
