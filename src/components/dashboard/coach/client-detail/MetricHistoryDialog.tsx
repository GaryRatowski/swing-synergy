import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MetricDefinition } from "@/hooks/useMetricDefinitions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateTrend, calculateDisplayValue, isHandicapMetric, formatHandicap, parseHandicapInput } from "@/lib/metricsConfig";

interface MetricReading {
  id: string;
  value: number;
  recorded_date: string | null;
  client_display_value: string | null;
  client_display_trend: string | null;
  is_bilateral: boolean | null;
  value_left: number | null;
  value_right: number | null;
  notes: string | null;
}

interface MetricHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricDefinition: MetricDefinition;
  readings: MetricReading[];
  onRefresh: () => void;
}

const MetricHistoryDialog = ({
  open,
  onOpenChange,
  metricDefinition,
  readings,
  onRefresh,
}: MetricHistoryDialogProps) => {
  const [editingReading, setEditingReading] = useState<MetricReading | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editValueLeft, setEditValueLeft] = useState("");
  const [editValueRight, setEditValueRight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBilateral = metricDefinition.is_bilateral;
  const isHandicap = isHandicapMetric(metricDefinition.metric_type);

  // Prepare chart data - for handicap, we need to handle display differently
  // Store values are: positive = regular handicap, negative = plus handicap
  // For chart, we plot the raw stored values but format the tooltip
  const chartData = readings.map((r) => ({
    date: r.recorded_date ? format(parseISO(r.recorded_date), "MMM d") : "N/A",
    value: r.value,
    left: r.value_left,
    right: r.value_right,
  }));

  // For handicap charts, always show reference line at scratch (0)
  const showScratchLine = isHandicap;

  const getTrendBadge = (trend: string | null) => {
    switch (trend) {
      case "up":
        return (
          <Badge variant="outline" className="text-success border-success/50">
            ↑ Improved
          </Badge>
        );
      case "down":
        return (
          <Badge variant="outline" className="text-warning border-warning/50">
            ↓ Needs Work
          </Badge>
        );
      case "stable":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            → Stable
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-primary border-primary/50">
            Baseline
          </Badge>
        );
    }
  };

  const openEditForm = (reading: MetricReading) => {
    setEditingReading(reading);
    if (reading.is_bilateral) {
      setEditValueLeft(reading.value_left?.toString() || "");
      setEditValueRight(reading.value_right?.toString() || "");
      setEditValue("");
    } else if (isHandicap) {
      // For handicap, show the formatted value (e.g., "+2" for stored -2)
      setEditValue(formatHandicap(reading.value));
      setEditValueLeft("");
      setEditValueRight("");
    } else {
      setEditValue(reading.value.toString());
      setEditValueLeft("");
      setEditValueRight("");
    }
  };

  const handleEdit = async () => {
    if (!editingReading) return;

    setIsSubmitting(true);

    try {
      let finalValue: number;
      let finalValueLeft: number | null = null;
      let finalValueRight: number | null = null;

      if (isBilateral) {
        if (!editValueLeft || !editValueRight) {
          toast({
            title: "Error",
            description: "Both values are required",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        finalValueLeft = parseFloat(editValueLeft);
        finalValueRight = parseFloat(editValueRight);
        finalValue = (finalValueLeft + finalValueRight) / 2;
      } else if (isHandicap) {
        const parsed = parseHandicapInput(editValue);
        if (parsed === null) {
          toast({
            title: "Error",
            description: "Invalid handicap format",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        finalValue = parsed;
      } else {
        finalValue = parseFloat(editValue);
      }

      // Recalculate trend based on previous reading
      const sortedReadings = readings
        .filter((r) => r.id !== editingReading.id)
        .sort(
          (a, b) =>
            new Date(b.recorded_date || "").getTime() -
            new Date(a.recorded_date || "").getTime()
        );
      const previousValue = sortedReadings.length > 0 ? sortedReadings[0].value : null;
      const trend = calculateTrend(finalValue, previousValue, metricDefinition.metric_type);
      const displayValue = calculateDisplayValue(
        finalValue,
        finalValueLeft,
        finalValueRight,
        isBilateral,
        metricDefinition.metric_type
      );

      const { error } = await supabase
        .from("performance_metrics")
        .update({
          value: finalValue,
          value_left: finalValueLeft,
          value_right: finalValueRight,
          client_display_value: displayValue,
          client_display_trend: trend,
        })
        .eq("id", editingReading.id);

      if (error) throw error;

      toast({ title: "Success", description: "Reading updated" });
      setEditingReading(null);
      onRefresh();
    } catch (error) {
      console.error("Error updating reading:", error);
      toast({
        title: "Error",
        description: "Failed to update reading",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (readingId: string) => {
    try {
      const { error } = await supabase
        .from("performance_metrics")
        .delete()
        .eq("id", readingId);

      if (error) throw error;

      toast({ title: "Success", description: "Reading deleted" });
      onRefresh();
    } catch (error) {
      console.error("Error deleting reading:", error);
      toast({
        title: "Error",
        description: "Failed to delete reading",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{metricDefinition.display_name} History</DialogTitle>
          <DialogDescription>
            View all recorded readings for this metric
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pt-4">
          {/* Chart */}
          {chartData.length > 1 ? (
            <div className="h-64 border rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={isHandicap ? (val: number) => formatHandicap(val) : undefined}
                    domain={isHandicap ? ['auto', 'auto'] : undefined}
                    reversed={isHandicap} // For handicap, lower (including negative) is better, so reverse axis
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={isHandicap 
                      ? (value: number) => [formatHandicap(value), metricDefinition.display_name]
                      : undefined
                    }
                  />
                  {/* Reference line at 0 for handicap to show scratch golfer level */}
                  {showScratchLine && (
                    <ReferenceLine 
                      y={0} 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4" 
                      label={{ value: "Scratch", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                    />
                  )}
                  {isBilateral ? (
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
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground border rounded-lg">
              Need at least 2 readings to show chart
            </div>
          )}

          {/* Readings List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">All Readings</h4>
            {readings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No readings yet</p>
            ) : (
              <div className="space-y-2">
                {[...readings].reverse().map((reading) => (
                  <div
                    key={reading.id}
                    className="flex justify-between items-center text-sm py-2 px-3 border rounded-md"
                  >
                    <div className="space-y-1">
                      <span className="text-muted-foreground">
                        {reading.recorded_date
                          ? format(parseISO(reading.recorded_date), "MMM d, yyyy")
                          : "N/A"}
                      </span>
                      {reading.is_bilateral && (
                        <p className="text-xs text-muted-foreground">
                          L: {reading.value_left}
                          {metricDefinition.unit} R: {reading.value_right}
                          {metricDefinition.unit}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendBadge(reading.client_display_trend)}
                      <span className="font-medium">
                        {isHandicap 
                          ? formatHandicap(reading.value)
                          : `${reading.client_display_value || reading.value.toFixed(1)} ${metricDefinition.unit}`
                        }
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditForm(reading)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this metric entry?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(reading.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Form Dialog */}
        <Dialog
          open={!!editingReading}
          onOpenChange={(open) => !open && setEditingReading(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Reading</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {isBilateral ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Left ({metricDefinition.unit})</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editValueLeft}
                      onChange={(e) => setEditValueLeft(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Right ({metricDefinition.unit})</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editValueRight}
                      onChange={(e) => setEditValueRight(e.target.value)}
                    />
                  </div>
                </div>
              ) : isHandicap ? (
                <div>
                  <Label>Handicap</Label>
                  <Input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g., 5, 10, +2, +3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use + prefix for plus handicaps
                  </p>
                </div>
              ) : (
                <div>
                  <Label>Value ({metricDefinition.unit})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                </div>
              )}
              <Button
                onClick={handleEdit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default MetricHistoryDialog;
