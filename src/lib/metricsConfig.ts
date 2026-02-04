// Centralized metrics configuration for physical and golf performance tracking
// Note: Metric definitions are now stored in the database (metric_definitions table)
// This file contains utility functions for trend calculation and display

// Calculate trend based on previous value
export type TrendType = "up" | "down" | "stable" | "baseline";

/**
 * Check if a metric type is handicap
 */
export const isHandicapMetric = (metricType: string): boolean => {
  return metricType === "handicap";
};

/**
 * Format handicap for display
 * - Positive storage values (5, 10, 15) = regular handicaps, display as-is
 * - Negative storage values (-1, -2, -3) = plus handicaps, display as "+1", "+2", "+3"
 * - Zero (0) = scratch golfer
 */
export const formatHandicap = (value: number | null): string => {
  if (value === null || value === undefined) return "N/A";
  
  if (value === 0) return "0";
  
  // Negative stored value = plus handicap, display with "+"
  if (value < 0) {
    return `+${Math.abs(value)}`;
  }
  
  // Positive stored value = regular handicap
  return value.toString();
};

/**
 * Parse handicap input from user
 * - Input "+2" or "+2.5" becomes stored value -2 or -2.5
 * - Input "5" becomes stored value 5
 * - Input "0" becomes stored value 0
 */
export const parseHandicapInput = (input: string): number | null => {
  if (!input || input.trim() === "") return null;
  
  const trimmed = input.trim();
  
  // Handle plus handicap input (e.g., "+2" -> store as -2)
  if (trimmed.startsWith("+")) {
    const numPart = trimmed.slice(1);
    const parsed = parseFloat(numPart);
    if (isNaN(parsed)) return null;
    return -parsed; // Store as negative
  }
  
  // Regular handicap
  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) return null;
  return parsed;
};

/**
 * Calculate trend based on previous value
 * For handicap metrics, lower is better (inverted logic)
 */
export const calculateTrend = (
  currentValue: number,
  previousValue: number | null,
  metricType?: string
): TrendType => {
  if (previousValue === null) return "baseline";
  
  // Avoid division by zero
  if (previousValue === 0) {
    if (currentValue === 0) return "stable";
    // For handicap: going from 0 to negative (plus handicap) is improvement
    // For handicap: going from 0 to positive is getting worse
    if (isHandicapMetric(metricType || "")) {
      return currentValue < 0 ? "up" : "down";
    }
    return currentValue > 0 ? "up" : "down";
  }
  
  const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  
  // For handicap, lower is better (inverted logic)
  if (isHandicapMetric(metricType || "")) {
    // Value went down (improved) by 5% or more
    if (percentChange <= -5) return "up";
    // Value went up (got worse) by 5% or more
    if (percentChange >= 5) return "down";
    return "stable";
  }
  
  // Standard logic: higher is better
  if (percentChange >= 5) return "up";
  if (percentChange <= -5) return "down";
  return "stable";
};

/**
 * Calculate display value for metrics
 * - For bilateral metrics: average of left and right
 * - For handicap: format with plus sign handling
 * - For other metrics: simple decimal formatting
 */
export const calculateDisplayValue = (
  value: number | null,
  valueLeft: number | null,
  valueRight: number | null,
  isBilateral: boolean,
  metricType?: string
): string => {
  if (isBilateral && valueLeft !== null && valueRight !== null) {
    const avg = (valueLeft + valueRight) / 2;
    return avg.toFixed(1);
  }
  
  if (isHandicapMetric(metricType || "")) {
    return formatHandicap(value);
  }
  
  return value?.toFixed(1) || "0";
};

/**
 * Format a metric value for display based on metric type
 */
export const formatMetricValue = (
  value: number | null,
  metricType: string,
  unit?: string
): string => {
  if (value === null || value === undefined) return "N/A";
  
  if (isHandicapMetric(metricType)) {
    return formatHandicap(value);
  }
  
  return `${value.toFixed(1)}${unit ? ` ${unit}` : ""}`;
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
