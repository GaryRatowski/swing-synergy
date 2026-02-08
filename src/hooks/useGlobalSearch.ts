import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClientResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  membership_type: string | null;
}

interface ExerciseResult {
  id: string;
  name: string;
  thumbnail_url: string | null;
  exercise_type: string | null;
  body_part: string | null;
}

interface ProgramResult {
  id: string;
  name: string;
  duration_weeks: number | null;
  exercise_count: number;
}

interface RecentItem {
  type: "client" | "exercise" | "program";
  id: string;
  name: string;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = "coach_recent_searches";
const MAX_RECENT_ITEMS = 5;

export function useGlobalSearch() {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [exercises, setExercises] = useState<ExerciseResult[]>([]);
  const [programs, setPrograms] = useState<ProgramResult[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentItems(JSON.parse(stored));
      } catch {
        setRecentItems([]);
      }
    }
  }, []);

  const addRecentItem = useCallback((item: Omit<RecentItem, "timestamp">) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((r) => !(r.type === item.type && r.id === item.id));
      const newItems = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_ITEMS);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const clearRecentItems = useCallback(() => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentItems([]);
  }, []);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!profile?.id || searchQuery.length < 2) {
        setClients([]);
        setExercises([]);
        setPrograms([]);
        return;
      }

      setIsSearching(true);
      const searchPattern = `%${searchQuery}%`;

      try {
        // Search clients
        const clientsPromise = supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, membership_type")
          .eq("role", "client")
          .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
          .limit(5);

        // Search exercises
        const exercisesPromise = supabase
          .from("exercises")
          .select("id, name, thumbnail_url, exercise_type, body_part")
          .or(`name.ilike.${searchPattern},body_part.ilike.${searchPattern}`)
          .limit(5);

        // Search programs
        const programsPromise = supabase
          .from("programs")
          .select(`
            id, 
            name, 
            duration_weeks,
            program_exercises(id)
          `)
          .eq("coach_id", profile.id)
          .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
          .limit(5);

        const [clientsRes, exercisesRes, programsRes] = await Promise.all([
          clientsPromise,
          exercisesPromise,
          programsPromise,
        ]);

        setClients(clientsRes.data || []);
        setExercises(exercisesRes.data || []);
        setPrograms(
          (programsRes.data || []).map((p) => ({
            id: p.id,
            name: p.name,
            duration_weeks: p.duration_weeks,
            exercise_count: Array.isArray(p.program_exercises) ? p.program_exercises.length : 0,
          }))
        );
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [profile?.id]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        search(query);
      } else {
        setClients([]);
        setExercises([]);
        setPrograms([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  const hasResults = clients.length > 0 || exercises.length > 0 || programs.length > 0;

  return {
    query,
    setQuery,
    isSearching,
    clients,
    exercises,
    programs,
    recentItems,
    addRecentItem,
    clearRecentItems,
    hasResults,
  };
}
