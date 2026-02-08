import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  className?: string;
}

const OfflineBanner = ({ className }: OfflineBannerProps) => {
  const { isOnline, queueLength, isSyncing } = useOfflineQueue();

  if (isOnline && !isSyncing) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
        !isOnline
          ? "bg-destructive/10 text-destructive border-b border-destructive/20"
          : "bg-primary/10 text-primary border-b border-primary/20",
        className
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>
            You're offline.
            {queueLength > 0 && ` ${queueLength} workout${queueLength > 1 ? "s" : ""} will sync when connected.`}
          </span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing your workouts...</span>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
