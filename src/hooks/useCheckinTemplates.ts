import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export type CheckinTemplate = {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  fields: string; // JSON string
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CheckinField = {
  id: string;
  label: string;
  type: "text" | "number" | "scale" | "textarea" | "yes_no";
  required: boolean;
  scale_max?: number;
  placeholder?: string;
};

export const useCheckinTemplates = (programId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["checkin-templates", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_templates")
        .select("*")
        .eq("program_id", programId);

      if (error) throw error;
      return data as CheckinTemplate[];
    },
    enabled: !!programId,
  });

  const createTemplate = useMutation({
    mutationFn: async (
      template: {
        name: string;
        description?: string | null;
        created_by: string;
        fields: CheckinField[];
      }
    ) => {
      const { data, error } = await supabase
        .from("checkin_templates")
        .insert({
          program_id: programId,
          name: template.name,
          description: template.description || null,
          created_by: template.created_by,
          fields: JSON.stringify(template.fields),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["checkin-templates", programId],
      });
      toast({
        title: "Template created",
        description: "Check-in template has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string | null;
      fields?: CheckinField[];
      is_active?: boolean;
    }) => {
      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.fields) updateData.fields = JSON.stringify(updates.fields);
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("checkin_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["checkin-templates", programId],
      });
      toast({
        title: "Template updated",
        description: "Check-in template has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("checkin_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["checkin-templates", programId],
      });
      toast({
        title: "Template deleted",
        description: "Check-in template has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get active template for this program
  const activeTemplate = templatesQuery.data?.find(t => t.is_active) || null;

  return {
    templates: templatesQuery.data || [],
    activeTemplate,
    isLoading: templatesQuery.isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
