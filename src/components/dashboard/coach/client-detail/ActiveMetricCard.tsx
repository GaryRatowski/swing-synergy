import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, History, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { MetricDefinition } from "@/hooks/useMetricDefinitions";
import { isHandicapMetric, formatHandicap } from "@/lib/metricsConfig";

interface LatestReading {
  value: number;
  client_display_value: string | null;
  client_display_trend: string | null;
  recorded_date: string | null;
  is_bilateral: boolean | null;
  value_left: number | null;
  value_right: number | null;
}

interface ActiveMetricCardProps {
  metricDefinition: MetricDefinition;
  latestReading?: LatestReading;
  onAddReading: () => void;
  onViewHistory: () => void;
  onRemove: () => void;
}

const ActiveMetricCard = ({
  metricDefinition,
  latestReading,
  onAddReading,
  onViewHistory,
  onRemove,
}: ActiveMetricCardProps) => {
  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3.5 w-3.5 text-success" />;
      case "down":
        return <TrendingDown className="h-3.5 w-3.5 text-warning" />;
      case "stable":
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getTrendBadge = (trend: string | null) => {
    switch (trend) {
      case "up":
        return (
          <Badge variant="outline" className="text-success border-success/50 text-xs">
            ↑ Improved
          </Badge>
        );
      case "down":
        return (
          <Badge variant="outline" className="text-warning border-warning/50 text-xs">
            ↓ Needs Work
          </Badge>
        );
      case "stable":
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            → Stable
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-primary border-primary/50 text-xs">
            Baseline
          </Badge>
        );
    }
  };

  const getDaysAgo = (dateStr: string | null) => {
    if (!dateStr) return null;
    const days = differenceInDays(new Date(), parseISO(dateStr));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <Card className="relative group">
      {/* Remove button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Metric</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{metricDefinition.display_name}" from this client's tracked
              metrics? Historical data will be preserved, but the metric won't
              appear in their dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardContent className="p-4">
        {/* Header with name and trend */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="font-medium text-sm">
              {metricDefinition.display_name}
            </h4>
            {metricDefinition.is_bilateral && (
              <Badge variant="secondary" className="text-xs mt-1">
                Bilateral
              </Badge>
            )}
          </div>
          {latestReading && getTrendIcon(latestReading.client_display_trend)}
        </div>

        {/* Value display */}
        {latestReading ? (
          <div className="space-y-1 mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {isHandicapMetric(metricDefinition.metric_type)
                  ? formatHandicap(latestReading.value)
                  : (latestReading.client_display_value || latestReading.value.toFixed(1))}
              </span>
              {!isHandicapMetric(metricDefinition.metric_type) && (
                <span className="text-sm text-muted-foreground">
                  {metricDefinition.unit}
                </span>
              )}
            </div>

            {latestReading.is_bilateral &&
              latestReading.value_left &&
              latestReading.value_right && (
                <p className="text-xs text-muted-foreground">
                  L: {latestReading.value_left}
                  {metricDefinition.unit} R: {latestReading.value_right}
                  {metricDefinition.unit}
                </p>
              )}

            <div className="flex items-center gap-2">
              {getTrendBadge(latestReading.client_display_trend)}
              <span className="text-xs text-muted-foreground">
                {getDaysAgo(latestReading.recorded_date)}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-3 mb-3">
            <p className="text-sm text-muted-foreground">No readings yet</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="default" className="flex-1" onClick={onAddReading}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Reading
          </Button>
          {latestReading && (
            <Button size="sm" variant="outline" onClick={onViewHistory}>
              <History className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveMetricCard;
