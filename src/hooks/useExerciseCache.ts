import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Exercise {
  id: string;
  name: string;
  body_part: string | null;
  exercise_type: string | null;
  thumbnail_url: string | null;
}

interface RecentExercise extends Exercise {
  last_sets: number | null;
  last_reps: string | null;
  use_count: number;
}

const CACHE_KEY = "exercise_library_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  exercises: Exercise[];
  timestamp: number;
}

export const useExerciseCache = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromCache = useCallback((): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CacheData = JSON.parse(cached);
        const isExpired = Date.now() - data.timestamp > CACHE_DURATION;
        if (!isExpired && data.exercises?.length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.error("Error reading exercise cache:", e);
    }
    return null;
  }, []);

  const saveToCache = useCallback((exerciseData: Exercise[]) => {
    try {
      const cacheData: CacheData = {
        exercises: exerciseData,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error("Error saving exercise cache:", e);
    }
  }, []);

  const fetchExercises = useCallback(async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        setExercises(cached.exercises);
        setIsLoading(false);
        return cached.exercises;
      }
    }

    // Fetch from database
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, body_part, exercise_type, thumbnail_url")
      .order("name");

    if (error) {
      console.error("Error fetching exercises:", error);
      setIsLoading(false);
      return [];
    }

    const exerciseData = data || [];
    setExercises(exerciseData);
    saveToCache(exerciseData);
    setIsLoading(false);
    return exerciseData;
  }, [loadFromCache, saveToCache]);

  const fetchRecentExercises = useCallback(async () => {
    // Get coach's most used exercises from recent workout logs
    const { data, error } = await supabase
      .from("exercise_logs")
      .select(`
        exercise_id,
        sets_completed,
        reps_completed,
        exercises(id, name, body_part, exercise_type, thumbnail_url)
      `)
      .not("exercise_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching recent exercises:", error);
      return;
    }

    // Group by exercise and count usage, keeping most recent settings
    const exerciseMap = new Map<string, RecentExercise>();
    
    data?.forEach((log: any) => {
      if (!log.exercises) return;
      const exerciseId = log.exercise_id;
      
      if (exerciseMap.has(exerciseId)) {
        const existing = exerciseMap.get(exerciseId)!;
        existing.use_count += 1;
      } else {
        exerciseMap.set(exerciseId, {
          id: log.exercises.id,
          name: log.exercises.name,
          body_part: log.exercises.body_part,
          exercise_type: log.exercises.exercise_type,
          thumbnail_url: log.exercises.thumbnail_url,
          last_sets: log.sets_completed,
          last_reps: log.reps_completed,
          use_count: 1,
        });
      }
    });

    // Sort by use count and take top 5
    const sorted = Array.from(exerciseMap.values())
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, 5);

    setRecentExercises(sorted);
  }, []);

  useEffect(() => {
    fetchExercises();
    fetchRecentExercises();
  }, [fetchExercises, fetchRecentExercises]);

  const refreshCache = useCallback(() => {
    return fetchExercises(true);
  }, [fetchExercises]);

  return {
    exercises,
    recentExercises,
    isLoading,
    refreshCache,
  };
};
