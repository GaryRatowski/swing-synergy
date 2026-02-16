import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CheckinSubmission {
  id: string;
  template_id: string;
  client_id: string;
  coach_id: string;
  responses: Record<string, any>;
  submitted_at: string;
  created_at: string;
}

export const useCheckinSubmissions = (templateId: string, clientId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submissionsQuery = useQuery({
    queryKey: ["checkin-submissions", templateId, clientId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("checkin_submissions")
        .select("*")
        .eq("template_id", templateId);

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query.order("submitted_at", {
        ascending: false,
      });

      if (error) throw error;
      return (data || []) as CheckinSubmission[];
    },
  });

  const submitCheckin = useMutation({
    mutationFn: async ({
      responses,
      coachId,
    }: {
      responses: Record<string, any>;
      coachId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("checkin_submissions")
        .insert({
          template_id: templateId,
          client_id: clientId || user.id,
          coach_id: coachId,
          responses: responses,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["checkin-submissions", templateId, clientId],
      });
      toast({
        title: "Check-in submitted!",
        description: "Your check-in has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    submissions: submissionsQuery.data || [],
    isLoading: submissionsQuery.isLoading,
    submitCheckin,
    refetch: submissionsQuery.refetch,
  };
};

// Hook for coaches to view compliance across clients
export const useCheckinCompliance = (templateId: string) => {
  const complianceQuery = useQuery({
    queryKey: ["checkin-compliance", templateId],
    queryFn: async () => {
      const { data: submissions, error } = await (supabase as any)
        .from("checkin_submissions")
        .select("client_id, submitted_at")
        .eq("template_id", templateId);

      if (error) throw error;

      const { data: template, error: templateError } = await supabase
        .from("checkin_templates")
        .select("program_id")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      const { data: clientPrograms, error: clientError } = await supabase
        .from("client_programs")
        .select("client_id")
        .eq("program_id", template.program_id);

      if (clientError) throw clientError;

      const clientSet = new Set(clientPrograms?.map((cp) => cp.client_id) || []);
      const submissionsByClient = new Map<string, number>();

      (submissions || []).forEach((sub: any) => {
        submissionsByClient.set(
          sub.client_id,
          (submissionsByClient.get(sub.client_id) || 0) + 1
        );
      });

      return {
        total_clients: clientSet.size,
        submitted: submissionsByClient.size,
        compliance_rate:
          clientSet.size > 0
            ? (submissionsByClient.size / clientSet.size) * 100
            : 0,
        not_submitted: Array.from(clientSet).filter(
          (id) => !submissionsByClient.has(id)
        ),
      };
    },
  });

  return {
    compliance: complianceQuery.data,
    isLoading: complianceQuery.isLoading,
  };
};
