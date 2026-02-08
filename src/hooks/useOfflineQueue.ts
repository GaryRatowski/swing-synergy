import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface QueueItem {
  id: string;
  type: "exercise_log" | "workout_log" | "habit_log";
  data: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = "offlineQueue";

export const useOfflineQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get current queue
  const getQueue = useCallback((): QueueItem[] => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch {
      return [];
    }
  }, []);

  // Update queue length
  const updateQueueLength = useCallback(() => {
    setQueueLength(getQueue().length);
  }, [getQueue]);

  // Add item to queue
  const addToQueue = useCallback(
    (type: QueueItem["type"], data: Record<string, unknown>) => {
      const queue = getQueue();
      const item: QueueItem = {
        id: crypto.randomUUID(),
        type,
        data,
        timestamp: Date.now(),
      };
      queue.push(item);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      updateQueueLength();
      return item.id;
    },
    [getQueue, updateQueueLength]
  );

  // Remove item from queue
  const removeFromQueue = useCallback(
    (id: string) => {
      const queue = getQueue().filter((item) => item.id !== id);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      updateQueueLength();
    },
    [getQueue, updateQueueLength]
  );

  // Sync single item
  const syncItem = async (item: QueueItem): Promise<boolean> => {
    try {
      const tableMap: Record<QueueItem["type"], string> = {
        exercise_log: "exercise_logs",
        workout_log: "workout_logs",
        habit_log: "habit_logs",
      };

      const table = tableMap[item.type];
      if (!table) return false;

      // Use type assertion since we're dynamically selecting the table
      const { error } = await supabase
        .from(table as "exercise_logs")
        .insert(item.data as any);
      return !error;
    } catch {
      return false;
    }
  };

  // Sync all queued items
  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      const success = await syncItem(item);
      if (success) {
        removeFromQueue(item.id);
        synced++;
      } else {
        failed++;
      }
    }

    setIsSyncing(false);

    if (synced > 0) {
      toast({
        title: "Workouts Synced",
        description: `${synced} offline workout${synced > 1 ? "s" : ""} saved to cloud.`,
      });
    }

    if (failed > 0) {
      toast({
        title: "Sync Issue",
        description: `${failed} item${failed > 1 ? "s" : ""} failed to sync. Will retry.`,
        variant: "destructive",
      });
    }
  }, [getQueue, removeFromQueue, isSyncing]);

  // Smart save function - uses queue if offline
  const saveWithOfflineSupport = useCallback(
    async (
      type: QueueItem["type"],
      data: Record<string, unknown>,
      onlineAction: () => Promise<{ error: unknown }>
    ): Promise<{ offline: boolean; error: unknown }> => {
      if (!navigator.onLine) {
        addToQueue(type, data);
        toast({
          title: "Saved Offline",
          description: "Your workout will sync when you're back online.",
        });
        return { offline: true, error: null };
      }

      const result = await onlineAction();
      return { offline: false, error: result.error };
    },
    [addToQueue]
  );

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Syncing your workouts...",
      });
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're Offline",
        description: "Don't worry - your workouts will be saved locally.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    updateQueueLength();

    // Try to sync on mount if online
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue, updateQueueLength]);

  return {
    isOnline,
    queueLength,
    isSyncing,
    addToQueue,
    syncQueue,
    saveWithOfflineSupport,
  };
};
