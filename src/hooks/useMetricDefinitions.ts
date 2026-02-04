import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MetricDefinition {
  id: string;
  metric_type: string;
  display_name: string;
  unit: string;
  is_bilateral: boolean;
  category: string;
  description: string | null;
  is_system_default: boolean;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClientActiveMetric {
  id: string;
  client_id: string;
  metric_type: string;
  enabled_by: string;
  enabled_date: string;
  created_at: string;
  metric_definition?: MetricDefinition;
}

export const useMetricDefinitions = () => {
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDefinitions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("metric_definitions")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      console.error("Error fetching metric definitions:", error);
    } else {
      setDefinitions(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const getDefinitionByType = (metricType: string): MetricDefinition | undefined => {
    return definitions.find((d) => d.metric_type === metricType);
  };

  const getGolfMetrics = () => definitions.filter((d) => d.category === "Golf Performance");
  const getPhysicalMetrics = () => definitions.filter((d) => d.category === "Physical Assessment");
  const getCustomMetrics = () => definitions.filter((d) => d.category === "Custom");

  return {
    definitions,
    isLoading,
    refetch: fetchDefinitions,
    getDefinitionByType,
    getGolfMetrics,
    getPhysicalMetrics,
    getCustomMetrics,
  };
};

export const useClientActiveMetrics = (clientId: string) => {
  const [activeMetrics, setActiveMetrics] = useState<ClientActiveMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveMetrics = async () => {
    if (!clientId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("client_active_metrics")
      .select(`
        *,
        metric_definition:metric_definitions(*)
      `)
      .eq("client_id", clientId);

    if (error) {
      console.error("Error fetching client active metrics:", error);
    } else {
      // Transform the data to match our interface
      const transformed = (data || []).map((item: any) => ({
        ...item,
        metric_definition: item.metric_definition as MetricDefinition,
      }));
      setActiveMetrics(transformed);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchActiveMetrics();
  }, [clientId]);

  const enableMetrics = async (metricTypes: string[], enabledBy: string) => {
    const inserts = metricTypes.map((metric_type) => ({
      client_id: clientId,
      metric_type,
      enabled_by: enabledBy,
    }));

    const { error } = await supabase
      .from("client_active_metrics")
      .insert(inserts);

    if (error) {
      console.error("Error enabling metrics:", error);
      throw error;
    }
    
    await fetchActiveMetrics();
  };

  const disableMetric = async (metricType: string) => {
    const { error } = await supabase
      .from("client_active_metrics")
      .delete()
      .eq("client_id", clientId)
      .eq("metric_type", metricType);

    if (error) {
      console.error("Error disabling metric:", error);
      throw error;
    }
    
    await fetchActiveMetrics();
  };

  const isMetricEnabled = (metricType: string) => {
    return activeMetrics.some((m) => m.metric_type === metricType);
  };

  return {
    activeMetrics,
    isLoading,
    refetch: fetchActiveMetrics,
    enableMetrics,
    disableMetric,
    isMetricEnabled,
  };
};

export const createCustomMetric = async (
  displayName: string,
  unit: string,
  category: string,
  isBilateral: boolean,
  description: string | null,
  createdBy: string
): Promise<MetricDefinition | null> => {
  const metricType = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");

  const { data, error } = await supabase
    .from("metric_definitions")
    .insert({
      metric_type: metricType,
      display_name: displayName,
      unit,
      is_bilateral: isBilateral,
      category,
      description,
      is_system_default: false,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating custom metric:", error);
    throw error;
  }

  return data;
};
