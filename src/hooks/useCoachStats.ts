import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCoachStats(coachId: string | undefined) {
  const activeClients = useQuery({
    queryKey: ['coachStats', 'activeClients', coachId],
    queryFn: async () => {
      if (!coachId) return 0;
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', coachId)
        .eq('role', 'client')
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const activePrograms = useQuery({
    queryKey: ['coachStats', 'activePrograms', coachId],
    queryFn: async () => {
      if (!coachId) return 0;
      const { data } = await supabase
        .from('client_programs')
        .select(`
          program_id,
          profiles!inner(coach_id)
        `)
        .eq('profiles.coach_id', coachId)
        .eq('is_active', true);
      
      // Count unique programs
      const uniquePrograms = new Set(data?.map(cp => cp.program_id));
      return uniquePrograms.size;
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  const totalExercises = useQuery({
    queryKey: ['coachStats', 'totalExercises', coachId],
    queryFn: async () => {
      if (!coachId) return 0;
      const { count } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  const completionRate = useQuery({
    queryKey: ['coachStats', 'completionRate', coachId],
    queryFn: async () => {
      if (!coachId) return null;
      
      // Get all clients for this coach
      const { data: clients } = await supabase
        .from('profiles')
        .select('id')
        .eq('coach_id', coachId)
        .eq('role', 'client')
        .eq('status', 'active');
      
      if (!clients || clients.length === 0) return null;
      
      const clientIds = clients.map(c => c.id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Count homework assignments in last 30 days
      const { count: assignmentCount } = await supabase
        .from('homework_assignments')
        .select('*', { count: 'exact', head: true })
        .in('client_id', clientIds)
        .gte('start_date', thirtyDaysAgo.toISOString().split('T')[0]);
      
      // Count completed homework logs in last 30 days
      const { count: completedCount } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .in('client_id', clientIds)
        .eq('session_type', 'homework')
        .not('completed_at', 'is', null)
        .gte('workout_date', thirtyDaysAgo.toISOString().split('T')[0]);
      
      if (!assignmentCount || assignmentCount === 0) return null;
      
      return Math.round(((completedCount || 0) / assignmentCount) * 100);
    },
    enabled: !!coachId,
    staleTime: 1000 * 60 * 5,
  });

  const refetchAll = () => {
    activeClients.refetch();
    activePrograms.refetch();
    totalExercises.refetch();
    completionRate.refetch();
  };

  return {
    activeClients: {
      value: activeClients.data ?? 0,
      isLoading: activeClients.isLoading,
    },
    activePrograms: {
      value: activePrograms.data ?? 0,
      isLoading: activePrograms.isLoading,
    },
    totalExercises: {
      value: totalExercises.data ?? 0,
      isLoading: totalExercises.isLoading,
    },
    completionRate: {
      value: completionRate.data,
      isLoading: completionRate.isLoading,
    },
    refetchAll,
    isLoading: activeClients.isLoading || activePrograms.isLoading || 
               totalExercises.isLoading || completionRate.isLoading,
  };
}
