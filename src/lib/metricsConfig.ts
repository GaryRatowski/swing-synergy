// Centralized metrics configuration for physical and golf performance tracking
// Note: Metric definitions are now stored in the database (metric_definitions table)
// This file contains utility functions for trend calculation and display

// Calculate trend based on previous value
export type TrendType = "up" | "down" | "stable" | "baseline";

export const calculateTrend = (
  currentValue: number,
  previousValue: number | null
): TrendType => {
  if (previousValue === null) return "baseline";
  
  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  
  if (percentChange >= 5) return "up";
  if (percentChange <= -5) return "down";
  return "stable";
};

// Calculate display value for bilateral metrics
export const calculateDisplayValue = (
  value: number | null,
  valueLeft: number | null,
  valueRight: number | null,
  isBilateral: boolean
): string => {
  if (isBilateral && valueLeft !== null && valueRight !== null) {
    const avg = (valueLeft + valueRight) / 2;
    return avg.toFixed(1);
  }
  return value?.toFixed(1) || "0";
};

// Trend display configuration
export const TREND_CONFIG: Record<TrendType, { label: string; color: string; icon: "up" | "down" | "stable" | "baseline" }> = {
  up: { label: "Improved", color: "text-success bg-success/10", icon: "up" },
  down: { label: "Needs Work", color: "text-warning bg-warning/10", icon: "down" },
  stable: { label: "Stable", color: "text-muted-foreground bg-muted", icon: "stable" },
  baseline: { label: "Baseline", color: "text-primary bg-primary/10", icon: "baseline" },
};

// Legacy exports for backward compatibility
// These are kept for any code that might still reference them,
// but metric definitions should now be fetched from the database

export interface MetricConfig {
  value: string;
  label: string;
  unit: string;
  category: "golf" | "physical";
  bilateral: boolean;
}

export const METRIC_CONFIGS: MetricConfig[] = [
  // Golf Performance Metrics
  { value: "clubhead_speed", label: "Clubhead Speed", unit: "mph", category: "golf", bilateral: false },
  { value: "ball_speed", label: "Ball Speed", unit: "mph", category: "golf", bilateral: false },
  { value: "handicap", label: "Handicap", unit: "strokes", category: "golf", bilateral: false },
  { value: "carry_distance", label: "Carry Distance", unit: "yards", category: "golf", bilateral: false },
  { value: "smash_factor", label: "Smash Factor", unit: "", category: "golf", bilateral: false },
  { value: "launch_angle", label: "Launch Angle", unit: "°", category: "golf", bilateral: false },
  { value: "spin_rate", label: "Spin Rate", unit: "rpm", category: "golf", bilateral: false },
  
  // Physical Assessment Metrics
  { value: "hip_mobility", label: "Hip Mobility", unit: "°", category: "physical", bilateral: true },
  { value: "thoracic_rotation", label: "Thoracic Rotation", unit: "°", category: "physical", bilateral: true },
  { value: "ankle_mobility", label: "Ankle Mobility", unit: "°", category: "physical", bilateral: true },
  { value: "vertical_jump", label: "Vertical Jump", unit: "in", category: "physical", bilateral: false },
  { value: "single_leg_balance", label: "Single Leg Balance", unit: "sec", category: "physical", bilateral: true },
  { value: "med_ball_throw", label: "Med Ball Throw", unit: "ft", category: "physical", bilateral: false },
];

export const GOLF_METRICS = METRIC_CONFIGS.filter(m => m.category === "golf");
export const PHYSICAL_METRICS = METRIC_CONFIGS.filter(m => m.category === "physical");

export const getMetricConfig = (metricType: string): MetricConfig | undefined => {
  return METRIC_CONFIGS.find(m => m.value === metricType);
};

export const getMetricLabel = (metricType: string): string => {
  return getMetricConfig(metricType)?.label || metricType;
};

export const getMetricUnit = (metricType: string): string => {
  return getMetricConfig(metricType)?.unit || "";
};

export const isMetricBilateral = (metricType: string): boolean => {
  return getMetricConfig(metricType)?.bilateral || false;
};
