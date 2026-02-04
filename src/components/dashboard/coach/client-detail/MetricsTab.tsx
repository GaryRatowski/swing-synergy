import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Activity, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useMetricDefinitions,
  useClientActiveMetrics,
  MetricDefinition,
} from "@/hooks/useMetricDefinitions";
import AddMetricDialog from "./AddMetricDialog";
import ActiveMetricCard from "./ActiveMetricCard";
import AddReadingDialog from "./AddReadingDialog";
import MetricHistoryDialog from "./MetricHistoryDialog";

interface MetricsTabProps {
  clientId: string;
  clientName?: string;
}

interface MetricReading {
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

const MetricsTab = ({ clientId, clientName = "Client" }: MetricsTabProps) => {
  const { profile } = useAuth();
  const {
    definitions,
    isLoading: definitionsLoading,
    refetch: refetchDefinitions,
  } = useMetricDefinitions();
  const {
    activeMetrics,
    isLoading: activeMetricsLoading,
    refetch: refetchActiveMetrics,
    enableMetrics,
    disableMetric,
  } = useClientActiveMetrics(clientId);

  const [allReadings, setAllReadings] = useState<MetricReading[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(true);

  // Dialog states
  const [addMetricDialogOpen, setAddMetricDialogOpen] = useState(false);
  const [addReadingDialogOpen, setAddReadingDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedMetricDefinition, setSelectedMetricDefinition] =
    useState<MetricDefinition | null>(null);

  // Fetch all readings for this client
  const fetchReadings = async () => {
    setReadingsLoading(true);
    const { data, error } = await supabase
      .from("performance_metrics")
      .select("*")
      .eq("client_id", clientId)
      .order("recorded_date", { ascending: true });

    if (error) {
      console.error("Error fetching readings:", error);
    } else {
      setAllReadings(data || []);
    }
    setReadingsLoading(false);
  };

  useEffect(() => {
    if (clientId) {
      fetchReadings();
    }
  }, [clientId]);

  const isLoading = definitionsLoading || activeMetricsLoading || readingsLoading;

  // Get enabled metric types
  const enabledMetricTypes = activeMetrics.map((m) => m.metric_type);

  // Group active metrics by category
  const getActiveMetricsByCategory = () => {
    const grouped: Record<string, MetricDefinition[]> = {
      "Golf Performance": [],
      "Physical Assessment": [],
      Custom: [],
    };

    activeMetrics.forEach((am) => {
      const def = definitions.find((d) => d.metric_type === am.metric_type);
      if (def) {
        grouped[def.category]?.push(def);
      }
    });

    return grouped;
  };

  // Get latest reading for a metric type
  const getLatestReading = (metricType: string) => {
    const typeReadings = allReadings.filter((r) => r.metric_type === metricType);
    if (typeReadings.length === 0) return undefined;
    return typeReadings.reduce((latest, current) =>
      new Date(current.recorded_date || "") > new Date(latest.recorded_date || "")
        ? current
        : latest
    );
  };

  // Get all readings for a metric type
  const getReadingsForType = (metricType: string) => {
    return allReadings.filter((r) => r.metric_type === metricType);
  };

  const handleEnableMetrics = async (metricTypes: string[]) => {
    if (!profile?.id) return;
    await enableMetrics(metricTypes, profile.id);
  };

  const handleDisableMetric = async (metricType: string) => {
    try {
      await disableMetric(metricType);
      toast({
        title: "Success",
        description: "Metric removed from tracking",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove metric",
        variant: "destructive",
      });
    }
  };

  const openAddReading = (def: MetricDefinition) => {
    setSelectedMetricDefinition(def);
    setAddReadingDialogOpen(true);
  };

  const openHistory = (def: MetricDefinition) => {
    setSelectedMetricDefinition(def);
    setHistoryDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const groupedActiveMetrics = getActiveMetricsByCategory();
  const hasActiveMetrics = activeMetrics.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>
        <Button onClick={() => setAddMetricDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Metric to Track
        </Button>
      </div>

      {/* Empty State */}
      {!hasActiveMetrics && (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              No Metrics Tracked Yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking performance metrics for {clientName} by adding metrics
              to their profile.
            </p>
            <Button onClick={() => setAddMetricDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Metrics
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Golf Performance Section */}
      {groupedActiveMetrics["Golf Performance"].length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium text-muted-foreground">
              Golf Performance
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedActiveMetrics["Golf Performance"].map((def) => (
              <ActiveMetricCard
                key={def.metric_type}
                metricDefinition={def}
                latestReading={getLatestReading(def.metric_type)}
                onAddReading={() => openAddReading(def)}
                onViewHistory={() => openHistory(def)}
                onRemove={() => handleDisableMetric(def.metric_type)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Physical Assessment Section */}
      {groupedActiveMetrics["Physical Assessment"].length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium text-muted-foreground">
              Physical Assessment
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedActiveMetrics["Physical Assessment"].map((def) => (
              <ActiveMetricCard
                key={def.metric_type}
                metricDefinition={def}
                latestReading={getLatestReading(def.metric_type)}
                onAddReading={() => openAddReading(def)}
                onViewHistory={() => openHistory(def)}
                onRemove={() => handleDisableMetric(def.metric_type)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Metrics Section */}
      {groupedActiveMetrics["Custom"].length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Custom Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedActiveMetrics["Custom"].map((def) => (
              <ActiveMetricCard
                key={def.metric_type}
                metricDefinition={def}
                latestReading={getLatestReading(def.metric_type)}
                onAddReading={() => openAddReading(def)}
                onViewHistory={() => openHistory(def)}
                onRemove={() => handleDisableMetric(def.metric_type)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Metric Dialog */}
      <AddMetricDialog
        open={addMetricDialogOpen}
        onOpenChange={setAddMetricDialogOpen}
        clientName={clientName}
        definitions={definitions}
        enabledMetricTypes={enabledMetricTypes}
        coachProfileId={profile?.id || ""}
        onEnableMetrics={handleEnableMetrics}
        onDefinitionsRefetch={refetchDefinitions}
      />

      {/* Add Reading Dialog */}
      {selectedMetricDefinition && (
        <AddReadingDialog
          open={addReadingDialogOpen}
          onOpenChange={setAddReadingDialogOpen}
          metricDefinition={selectedMetricDefinition}
          clientId={clientId}
          existingReadings={getReadingsForType(selectedMetricDefinition.metric_type)}
          onSuccess={() => {
            fetchReadings();
            refetchActiveMetrics();
          }}
        />
      )}

      {/* History Dialog */}
      {selectedMetricDefinition && (
        <MetricHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          metricDefinition={selectedMetricDefinition}
          readings={getReadingsForType(selectedMetricDefinition.metric_type)}
          onRefresh={fetchReadings}
        />
      )}
    </div>
  );
};

export default MetricsTab;
