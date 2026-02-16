import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useToast } from "@/components/ui/use-toast";

export type CheckinTemplate = Tables<"checkin_templates">;
export type CheckinField = {
  id: string;
  label: string;
  type: "text" | "number" | "scale" | "textarea";
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
  });

  const createTemplate = useMutation({
    mutationFn: async (
      template: Omit<CheckinTemplate, "id" | "created_at" | "updated_at"> & {
        fields: CheckinField[];
      }
    ) => {
      const { data, error } = await supabase
        .from("checkin_templates")
        .insert({
          program_id: programId,
          name: template.name,
          description: template.description,
          created_by: template.created_by,
          fields: JSON.stringify(template.fields),
        } as any)
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
      description?: string;
      fields?: CheckinField[];
    }) => {
      const updateData: any = { ...updates };
      if (updates.fields) {
        updateData.fields = JSON.stringify(updates.fields);
      }
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

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
