import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProgressReport } from "@/hooks/useProgressReports";
import ProgressReportView from "@/components/dashboard/coach/client-detail/ProgressReportView";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { FileX } from "lucide-react";

export default function ShareReport() {
  const { shareToken } = useParams<{ shareToken: string }>();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["publicReport", shareToken],
    queryFn: async () => {
      if (!shareToken) throw new Error("No share token provided");

      const { data, error } = await supabase
        .from("progress_reports")
        .select("*")
        .eq("share_token", shareToken)
        .single();

      if (error) throw error;
      return data as unknown as ProgressReport;
    },
    enabled: !!shareToken
  });

  // Fetch client info
  const { data: client } = useQuery({
    queryKey: ["publicReportClient", report?.client_id],
    queryFn: async () => {
      if (!report?.client_id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", report.client_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!report?.client_id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileX className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
            <p className="text-muted-foreground">
              This report link may have expired or been removed.
              Please contact your coach for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <ProgressReportView
        report={report}
        client={client}
        coachId={report.coach_id}
        onBack={() => window.history.back()}
        isPublic
      />
    </div>
  );
}
