import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import FlagReviewDialog from "./FlagReviewDialog";

interface ExerciseFlag {
  id: string;
  client_id: string;
  exercise_log_id: string | null;
  exercise_id: string | null;
  flag_type: string;
  description: string;
  flagged_date: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  coach_response: string | null;
  created_at: string;
  client?: {
    full_name: string;
  };
  exercise?: {
    name: string;
  };
}

const FlaggedExercisesQueue = () => {
  const { profile } = useAuth();
  const [flags, setFlags] = useState<ExerciseFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<ExerciseFlag | null>(null);
  const [filter, setFilter] = useState<"pending" | "reviewed" | "all">("pending");

  useEffect(() => {
    fetchFlags();
  }, [filter]);

  const fetchFlags = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("exercise_flags")
        .select("*")
        .order("flagged_date", { ascending: false });

      if (filter === "pending") {
        query = query.is("reviewed_by", null);
      } else if (filter === "reviewed") {
        query = query.not("reviewed_by", "is", null);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      
      // Fetch client and exercise names separately
      const flagsWithDetails = await Promise.all(
        (data || []).map(async (flag) => {
          const [clientResult, exerciseResult] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", flag.client_id).single(),
            flag.exercise_id 
              ? supabase.from("exercises").select("name").eq("id", flag.exercise_id).single()
              : Promise.resolve({ data: null })
          ]);
          
          return {
            ...flag,
            client: clientResult.data ? { full_name: clientResult.data.full_name } : undefined,
            exercise: exerciseResult.data ? { name: exerciseResult.data.name } : undefined,
          };
        })
      );
      
      setFlags(flagsWithDetails);
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

  const pendingCount = flags.filter(f => !f.reviewed_by).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Flagged Exercises
              {filter === "pending" && pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </CardTitle>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              <Clock className="h-4 w-4 mr-1" />
              Pending
            </Button>
            <Button
              variant={filter === "reviewed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("reviewed")}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Reviewed
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {flags.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {flags.map((flag) => {
                  const badgeInfo = getFlagTypeBadge(flag.flag_type);
                  return (
                    <div
                      key={flag.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        !flag.reviewed_by ? "border-warning/50 bg-warning/5" : ""
                      }`}
                      onClick={() => setSelectedFlag(flag)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {flag.client?.full_name || "Unknown Client"}
                            </span>
                            <Badge variant={badgeInfo.variant} className="text-xs">
                              {badgeInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {flag.exercise?.name || "Unknown Exercise"}
                          </p>
                          <p className="text-sm text-foreground line-clamp-2">
                            {flag.description.length > 80 
                              ? `${flag.description.slice(0, 80)}...` 
                              : flag.description
                            }
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{format(parseISO(flag.flagged_date), "MMM d, yyyy")}</span>
                            {flag.reviewed_at && (
                              <span className="flex items-center gap-1 text-success">
                                <CheckCircle2 className="h-3 w-3" />
                                Reviewed
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No {filter === "pending" ? "pending" : filter === "reviewed" ? "reviewed" : ""} flagged exercises</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedFlag && (
        <FlagReviewDialog
          flag={selectedFlag}
          open={!!selectedFlag}
          onOpenChange={(open) => !open && setSelectedFlag(null)}
          onUpdate={fetchFlags}
        />
      )}
    </>
  );
};

export default FlaggedExercisesQueue;
