import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Badge } from "@/components/ui/badge";
import { CloudOff, Cloud, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

const OfflineIndicator = ({ className, showWhenOnline = false }: OfflineIndicatorProps) => {
  const { isOnline, queueLength, isSyncing } = useOfflineQueue();

  // Don't show anything if online and no pending items (unless showWhenOnline)
  if (isOnline && queueLength === 0 && !showWhenOnline) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isOnline ? (
        <Badge variant="destructive" className="gap-1 animate-pulse">
          <CloudOff className="h-3 w-3" />
          Offline
        </Badge>
      ) : isSyncing ? (
        <Badge variant="secondary" className="gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Syncing...
        </Badge>
      ) : queueLength > 0 ? (
        <Badge variant="secondary" className="gap-1">
          <Cloud className="h-3 w-3" />
          {queueLength} pending
        </Badge>
      ) : showWhenOnline ? (
        <Badge variant="outline" className="gap-1 text-success border-success/30">
          <Cloud className="h-3 w-3" />
          Online
        </Badge>
      ) : null}
    </div>
  );
};

export default OfflineIndicator;
