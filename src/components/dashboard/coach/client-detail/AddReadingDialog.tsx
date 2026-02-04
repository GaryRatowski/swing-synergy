import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MetricDefinition } from "@/hooks/useMetricDefinitions";
import { calculateTrend, calculateDisplayValue } from "@/lib/metricsConfig";

interface AddReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricDefinition: MetricDefinition;
  clientId: string;
  existingReadings: { value: number; recorded_date: string | null }[];
  onSuccess: () => void;
}

const AddReadingDialog = ({
  open,
  onOpenChange,
  metricDefinition,
  clientId,
  existingReadings,
  onSuccess,
}: AddReadingDialogProps) => {
  const [value, setValue] = useState("");
  const [valueLeft, setValueLeft] = useState("");
  const [valueRight, setValueRight] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBilateral = metricDefinition.is_bilateral;

  const handleSubmit = async () => {
    // Validation
    if (isBilateral) {
      if (!valueLeft || !valueRight) {
        toast({
          title: "Error",
          description: "Both left and right values are required",
          variant: "destructive",
        });
        return;
      }
      const left = parseFloat(valueLeft);
      const right = parseFloat(valueRight);
      if (left <= 0 || right <= 0) {
        toast({
          title: "Error",
          description: "Values must be positive numbers",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!value) {
        toast({
          title: "Error",
          description: "Please enter a value",
          variant: "destructive",
        });
        return;
      }
      const val = parseFloat(value);
      if (val <= 0 && metricDefinition.metric_type !== "handicap") {
        toast({
          title: "Error",
          description: "Value must be a positive number",
          variant: "destructive",
        });
        return;
      }
    }

    if (date > new Date()) {
      toast({
        title: "Error",
        description: "Date cannot be in the future",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let finalValue: number;
      let finalValueLeft: number | null = null;
      let finalValueRight: number | null = null;

      if (isBilateral) {
        finalValueLeft = parseFloat(valueLeft);
        finalValueRight = parseFloat(valueRight);
        finalValue = (finalValueLeft + finalValueRight) / 2;
      } else {
        finalValue = parseFloat(value);
      }

      // Get previous value for trend calculation
      const sortedReadings = [...existingReadings].sort(
        (a, b) =>
          new Date(b.recorded_date || "").getTime() -
          new Date(a.recorded_date || "").getTime()
      );
      const previousValue = sortedReadings.length > 0 ? sortedReadings[0].value : null;
      const trend = calculateTrend(finalValue, previousValue);
      const displayValue = calculateDisplayValue(
        finalValue,
        finalValueLeft,
        finalValueRight,
        isBilateral
      );

      const { error } = await supabase.from("performance_metrics").insert({
        client_id: clientId,
        metric_type: metricDefinition.metric_type,
        value: finalValue,
        unit: metricDefinition.unit || null,
        notes: notes || null,
        recorded_date: format(date, "yyyy-MM-dd"),
        client_display_value: displayValue,
        client_display_trend: trend,
        is_bilateral: isBilateral,
        value_left: finalValueLeft,
        value_right: finalValueRight,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reading added successfully",
      });

      // Reset form
      setValue("");
      setValueLeft("");
      setValueRight("");
      setNotes("");
      setDate(new Date());
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding reading:", error);
      toast({
        title: "Error",
        description: "Failed to add reading",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setValue("");
    setValueLeft("");
    setValueRight("");
    setNotes("");
    setDate(new Date());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reading: {metricDefinition.display_name}</DialogTitle>
          <DialogDescription>
            Record a new measurement for this metric
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Metric Name (disabled/readonly display) */}
          <div>
            <Label>Metric</Label>
            <Input
              value={metricDefinition.display_name}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Conditional Value Inputs */}
          {isBilateral ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Left ({metricDefinition.unit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={valueLeft}
                  onChange={(e) => setValueLeft(e.target.value)}
                  placeholder="Left side"
                />
              </div>
              <div>
                <Label>Right ({metricDefinition.unit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={valueRight}
                  onChange={(e) => setValueRight(e.target.value)}
                  placeholder="Right side"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label>Value ({metricDefinition.unit})</Label>
              <Input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Enter ${metricDefinition.display_name.toLowerCase()}`}
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
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, compensations, test conditions..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Save Reading"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddReadingDialog;
