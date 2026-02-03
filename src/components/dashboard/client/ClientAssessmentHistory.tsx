import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Eye, Check, X, FileVideo, Image, Play } from "lucide-react";
import RunAssessmentWizard from "@/components/dashboard/coach/assessments/RunAssessmentWizard";

interface ChecklistItem {
  name: string;
  type: string;
  unit?: string;
}

interface AssessmentLog {
  id: string;
  client_id: string;
  template_id: string | null;
  assessed_date: string;
  assessed_by: string;
  results: Record<string, any>;
  attachments: { type: string; url: string; name: string; itemName: string }[];
  notes: string | null;
  created_at: string;
  assessment_templates?: {
    name: string;
    checklist_items: ChecklistItem[];
  } | null;
  assessor?: {
    full_name: string;
  } | null;
}

interface ClientAssessmentHistoryProps {
  clientId: string;
  clientName: string;
}

const ClientAssessmentHistory = ({ clientId, clientName }: ClientAssessmentHistoryProps) => {
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentLog | null>(null);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["client-assessments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_logs")
        .select(`
          *,
          assessment_templates (name, checklist_items),
          assessor:profiles!assessment_logs_assessed_by_fkey (full_name)
        `)
        .eq("client_id", clientId)
        .order("assessed_date", { ascending: false });
      
      if (error) throw error;
      return data as unknown as AssessmentLog[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["assessment-templates-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_templates")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const renderResultValue = (result: any, type?: string) => {
    if (result === "pass") {
      return <Badge className="bg-primary text-primary-foreground"><Check className="h-3 w-3 mr-1" /> Pass</Badge>;
    }
    if (result === "fail") {
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Fail</Badge>;
    }
    if (typeof result === "string" && result.includes("/")) {
      return (
        <span className="flex items-center gap-1 text-sm">
          {type === "video" ? <FileVideo className="h-4 w-4" /> : <Image className="h-4 w-4" />}
          File attached
        </span>
      );
    }
    return <span>{result}</span>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading assessments...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Assessments</h3>
          <p className="text-sm text-muted-foreground">Track your mobility and performance over time</p>
        </div>
        {templates && templates.length > 0 && (
          <Button size="sm" onClick={() => setShowSelfAssessment(true)}>
            <Play className="h-4 w-4 mr-2" />
            Self-Assessment
          </Button>
        )}
      </div>

      {!assessments || assessments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No assessments yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your coach will schedule assessments to track your progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((assessment) => (
            <Card
              key={assessment.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedAssessment(assessment)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">
                      {assessment.assessment_templates?.name || "Assessment"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(assessment.assessed_date), "MMM d, yyyy")}
                      {assessment.assessor && ` • by ${assessment.assessor.full_name}`}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {Object.entries(assessment.results).slice(0, 4).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {value === "pass" ? "✓" : value === "fail" ? "✗" : value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assessment Detail Dialog */}
      <Dialog open={!!selectedAssessment} onOpenChange={() => setSelectedAssessment(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedAssessment?.assessment_templates?.name || "Assessment Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedAssessment && format(new Date(selectedAssessment.assessed_date), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-4 p-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAssessment?.assessment_templates?.checklist_items.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {renderResultValue(selectedAssessment.results[item.name], item.type)}
                        {item.unit && selectedAssessment.results[item.name] && typeof selectedAssessment.results[item.name] === "number" && (
                          <span className="text-muted-foreground ml-1">{item.unit}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedAssessment?.notes && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAssessment.notes}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Self-Assessment Wizard */}
      <RunAssessmentWizard
        open={showSelfAssessment}
        onOpenChange={setShowSelfAssessment}
        clientId={clientId}
        clientName={clientName}
      />
    </div>
  );
};

export default ClientAssessmentHistory;
