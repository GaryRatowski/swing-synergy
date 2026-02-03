import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ClientFlagHistoryProps {
  clientId: string;
}

interface ExerciseFlag {
  id: string;
  exercise_id: string | null;
  flag_type: string;
  description: string;
  flagged_date: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  coach_response: string | null;
  exercise?: {
    name: string;
  };
}

const ClientFlagHistory = ({ clientId }: ClientFlagHistoryProps) => {
  const [flags, setFlags] = useState<ExerciseFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<ExerciseFlag | null>(null);

  useEffect(() => {
    fetchFlags();
  }, [clientId]);

  const fetchFlags = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("exercise_flags")
        .select(`
          *,
          exercise:exercises(name)
        `)
        .eq("client_id", clientId)
        .order("flagged_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const transformedData = (data || []).map(flag => ({
        ...flag,
        exercise: Array.isArray(flag.exercise) ? flag.exercise[0] : flag.exercise,
      }));
      
      setFlags(transformedData);
    } catch (error) {
      console.error("Error fetching flags:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFlagTypeBadge = (type: string) => {
    const variants: Record<string, { variant: "destructive" | "secondary" | "outline" | "default"; label: string }> = {
      pain: { variant: "destructive", label: "Pain" },
      discomfort: { variant: "default", label: "Discomfort" },
      fatigue: { variant: "secondary", label: "Too Difficult" },
      other: { variant: "outline", label: "Other" },
    };
    return variants[type] || variants.other;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (flags.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Reported Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map((flag) => {
            const badgeInfo = getFlagTypeBadge(flag.flag_type);
            const isReviewed = !!flag.reviewed_by;

            return (
              <div
                key={flag.id}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                  !isReviewed ? "border-warning/50 bg-warning/5" : ""
                }`}
                onClick={() => setSelectedFlag(flag)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {flag.exercise?.name || "Unknown Exercise"}
                      </span>
                      <Badge variant={badgeInfo.variant} className="text-xs">
                        {badgeInfo.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {flag.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isReviewed ? (
                      <div className="flex items-center gap-1 text-success text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Reviewed
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-warning text-xs">
                        <Clock className="h-3 w-3" />
                        Pending
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Flag Detail Dialog */}
      <Dialog open={!!selectedFlag} onOpenChange={(open) => !open && setSelectedFlag(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Issue Details
            </DialogTitle>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium mb-1">Exercise</p>
                <p className="text-foreground">{selectedFlag.exercise?.name || "Unknown Exercise"}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={getFlagTypeBadge(selectedFlag.flag_type).variant}>
                  {getFlagTypeBadge(selectedFlag.flag_type).label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(selectedFlag.flagged_date), "MMM d, yyyy")}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Your Description</p>
                <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                  {selectedFlag.description}
                </p>
              </div>

              {selectedFlag.reviewed_by ? (
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Coach Response
                  </p>
                  {selectedFlag.coach_response ? (
                    <p className="text-sm text-foreground bg-success/10 border border-success/20 p-3 rounded-lg whitespace-pre-wrap">
                      {selectedFlag.coach_response}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Coach reviewed but didn't leave a response
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Reviewed on {format(parseISO(selectedFlag.reviewed_at!), "MMM d, yyyy")}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-warning bg-warning/10 p-3 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Pending coach review</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientFlagHistory;
