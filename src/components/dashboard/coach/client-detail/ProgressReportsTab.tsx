import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProgressReports, ProgressReport } from "@/hooks/useProgressReports";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, 
  Plus, 
  Calendar as CalendarIcon, 
  Download, 
  Share, 
  Trash2,
  Eye,
  Loader2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import ProgressReportView from "./ProgressReportView";

interface ProgressReportsTabProps {
  clientId: string;
  coachId: string;
}

export default function ProgressReportsTab({ clientId, coachId }: ProgressReportsTabProps) {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(subMonths(new Date(), 1));
  const [viewingReport, setViewingReport] = useState<ProgressReport | null>(null);
  
  const { 
    reports, 
    isLoadingReports, 
    isGenerating,
    generateReportAsync,
    deleteReport 
  } = useProgressReports(clientId, coachId);

  // Fetch client info
  const { data: client } = useQuery({
    queryKey: ["clientProfile", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const handleGenerateReport = async () => {
    const periodStart = startOfMonth(selectedMonth);
    const periodEnd = endOfMonth(selectedMonth);
    
    try {
      const report = await generateReportAsync({
        targetClientId: clientId,
        periodStart,
        periodEnd
      });
      setIsGenerateDialogOpen(false);
      setViewingReport(report);
    } catch (error) {
      console.error("Failed to generate report:", error);
    }
  };

  const handleCopyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/share/report/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const getRatingVariant = (rating: string) => {
    switch (rating) {
      case "Excellent": return "default";
      case "Good": return "secondary";
      case "Fair": return "outline";
      default: return "destructive";
    }
  };

  if (viewingReport) {
    return (
      <ProgressReportView
        report={viewingReport}
        client={client}
        coachId={coachId}
        onBack={() => setViewingReport(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Progress Reports</h2>
          <p className="text-muted-foreground">
            Monthly progress summaries with metrics and achievements
          </p>
        </div>
        <Button onClick={() => setIsGenerateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Reports List */}
      {isLoadingReports ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {format(new Date(report.period_start), "MMMM yyyy")} Report
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(report.period_start), "MMM d")} - {format(new Date(report.period_end), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getRatingVariant(report.report_data.summary.overall_rating)}>
                      {report.report_data.summary.overall_rating}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>
                        <strong>{report.report_data.summary.total_sessions}</strong> sessions
                      </span>
                      <span>
                        <strong>{report.report_data.summary.compliance_rate.toFixed(0)}%</strong> compliance
                      </span>
                      <span>
                        <strong>{report.report_data.metrics.length}</strong> metrics tracked
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {report.share_token && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyShareLink(report.share_token!)}
                        >
                          <Share className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteReport(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Generate your first progress report to track client achievements over time.
            </p>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate First Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generate Report Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Progress Report</DialogTitle>
            <DialogDescription>
              Select the month for which you want to generate a progress report.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Month</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedMonth, "MMMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedMonth}
                    onSelect={(date) => date && setSelectedMonth(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  This will generate a comprehensive report including:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Session attendance and compliance rates</li>
                  <li>• Performance metric trends and improvements</li>
                  <li>• Personal bests and achievements</li>
                  <li>• Homework completion statistics</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
