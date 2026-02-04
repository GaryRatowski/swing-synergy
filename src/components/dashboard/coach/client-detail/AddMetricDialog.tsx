import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  MetricDefinition,
  createCustomMetric,
} from "@/hooks/useMetricDefinitions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AddMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  definitions: MetricDefinition[];
  enabledMetricTypes: string[];
  coachProfileId: string;
  onEnableMetrics: (metricTypes: string[]) => Promise<void>;
  onDefinitionsRefetch: () => void;
}

const AddMetricDialog = ({
  open,
  onOpenChange,
  clientName,
  definitions,
  enabledMetricTypes,
  coachProfileId,
  onEnableMetrics,
  onDefinitionsRefetch,
}: AddMetricDialogProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom metric form state
  const [customMetric, setCustomMetric] = useState({
    displayName: "",
    unit: "",
    category: "Custom" as string,
    isBilateral: false,
    description: "",
  });

  const groupedDefinitions = {
    "Golf Performance": definitions.filter(
      (d) => d.category === "Golf Performance"
    ),
    "Physical Assessment": definitions.filter(
      (d) => d.category === "Physical Assessment"
    ),
    Custom: definitions.filter((d) => d.category === "Custom"),
  };

  const handleToggleMetric = (metricType: string) => {
    if (enabledMetricTypes.includes(metricType)) return; // Already enabled, can't toggle

    setSelectedMetrics((prev) =>
      prev.includes(metricType)
        ? prev.filter((m) => m !== metricType)
        : [...prev, metricType]
    );
  };

  const handleAddSelected = async () => {
    if (selectedMetrics.length === 0) return;

    setIsSubmitting(true);
    try {
      await onEnableMetrics(selectedMetrics);
      toast({
        title: "Success",
        description: `Added ${selectedMetrics.length} metric(s) for ${clientName}`,
      });
      setSelectedMetrics([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add metrics",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!customMetric.displayName || !customMetric.unit) {
      toast({
        title: "Error",
        description: "Display name and unit are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newMetric = await createCustomMetric(
        customMetric.displayName,
        customMetric.unit,
        customMetric.category,
        customMetric.isBilateral,
        customMetric.description || null,
        coachProfileId
      );

      if (newMetric) {
        // Enable it for this client immediately
        await onEnableMetrics([newMetric.metric_type]);
        onDefinitionsRefetch();

        toast({
          title: "Success",
          description: `Created and enabled "${customMetric.displayName}" for ${clientName}`,
        });

        // Reset form
        setCustomMetric({
          displayName: "",
          unit: "",
          category: "Custom",
          isBilateral: false,
          description: "",
        });
        setShowCreateCustom(false);
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message?.includes("duplicate")
          ? "A metric with this name already exists"
          : "Failed to create custom metric",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSelectedMetrics([]);
    setShowCreateCustom(false);
    setCustomMetric({
      displayName: "",
      unit: "",
      category: "Custom",
      isBilateral: false,
      description: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {showCreateCustom ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowCreateCustom(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Create Custom Metric
              </div>
            ) : (
              `Add Metrics for ${clientName}`
            )}
          </DialogTitle>
          <DialogDescription>
            {showCreateCustom
              ? "Create a new metric specific to your coaching needs"
              : "Select metrics to track for this client"}
          </DialogDescription>
        </DialogHeader>

        {showCreateCustom ? (
          // Create Custom Metric Form
          <div className="space-y-4 pt-4 overflow-y-auto flex-1">
            <div>
              <Label>Display Name *</Label>
              <Input
                value={customMetric.displayName}
                onChange={(e) =>
                  setCustomMetric({ ...customMetric, displayName: e.target.value })
                }
                placeholder="e.g., Pelvic Rotation"
              />
            </div>

            <div>
              <Label>Unit *</Label>
              <Input
                value={customMetric.unit}
                onChange={(e) =>
                  setCustomMetric({ ...customMetric, unit: e.target.value })
                }
                placeholder="e.g., degrees, feet, score 1-10"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={customMetric.category}
                onValueChange={(v) =>
                  setCustomMetric({ ...customMetric, category: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Golf Performance">Golf Performance</SelectItem>
                  <SelectItem value="Physical Assessment">
                    Physical Assessment
                  </SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bilateral Tracking</Label>
                <p className="text-xs text-muted-foreground">
                  Track left and right sides separately
                </p>
              </div>
              <Switch
                checked={customMetric.isBilateral}
                onCheckedChange={(checked) =>
                  setCustomMetric({ ...customMetric, isBilateral: checked })
                }
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={customMetric.description}
                onChange={(e) =>
                  setCustomMetric({ ...customMetric, description: e.target.value })
                }
                placeholder="How to measure, what it indicates..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleCreateCustom}
              disabled={
                isSubmitting || !customMetric.displayName || !customMetric.unit
              }
              className="w-full"
            >
              {isSubmitting ? "Creating..." : "Create & Enable"}
            </Button>
          </div>
        ) : (
          // Metric Selection List
          <>
            <div className="flex-1 overflow-y-auto space-y-4 pt-2">
              <TooltipProvider>
                {Object.entries(groupedDefinitions).map(([category, metrics]) => {
                  if (metrics.length === 0) return null;

                  return (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {metrics.map((metric) => {
                          const isEnabled = enabledMetricTypes.includes(
                            metric.metric_type
                          );
                          const isSelected = selectedMetrics.includes(
                            metric.metric_type
                          );

                          return (
                            <div
                              key={metric.metric_type}
                              className={`flex items-center justify-between p-2 rounded-md border ${
                                isEnabled
                                  ? "bg-muted/50 border-muted"
                                  : isSelected
                                  ? "bg-primary/5 border-primary/30"
                                  : "border-border hover:border-primary/30"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isEnabled || isSelected}
                                  disabled={isEnabled}
                                  onCheckedChange={() =>
                                    handleToggleMetric(metric.metric_type)
                                  }
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm ${
                                        isEnabled ? "text-muted-foreground" : ""
                                      }`}
                                    >
                                      {metric.display_name}
                                    </span>
                                    {metric.is_bilateral && (
                                      <Badge variant="outline" className="text-xs">
                                        Bilateral
                                      </Badge>
                                    )}
                                    {isEnabled && (
                                      <Badge variant="secondary" className="text-xs">
                                        Enabled
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    Unit: {metric.unit || "—"}
                                  </span>
                                </div>
                              </div>

                              {metric.description && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[200px]">
                                    <p className="text-xs">{metric.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </TooltipProvider>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCreateCustom(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Metric
              </Button>

              <Button
                onClick={handleAddSelected}
                disabled={selectedMetrics.length === 0 || isSubmitting}
                className="w-full"
              >
                {isSubmitting
                  ? "Adding..."
                  : `Add Selected (${selectedMetrics.length})`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddMetricDialog;
