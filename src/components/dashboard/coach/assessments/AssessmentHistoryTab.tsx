import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ClipboardList, Eye, GitCompare, Check, X, FileVideo, Image } from "lucide-react";

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

interface AssessmentHistoryTabProps {
  clientId: string;
}

const AssessmentHistoryTab = ({ clientId }: AssessmentHistoryTabProps) => {
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentLog | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["assessment-logs", clientId],
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

  const compareAssessments = assessments?.filter((a) => selectedForCompare.includes(a.id)) || [];

  const toggleCompareSelection = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((i) => i !== id));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

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
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Loading assessments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Assessment History</h3>
        {assessments && assessments.length > 1 && (
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedForCompare([]);
            }}
          >
            <GitCompare className="h-4 w-4 mr-1" />
            {compareMode ? "Cancel Compare" : "Compare"}
          </Button>
        )}
      </div>

      {compareMode && selectedForCompare.length === 2 && (
        <Button onClick={() => setShowCompareDialog(true)} className="w-full">
          Compare Selected Assessments
        </Button>
      )}

      {!assessments || assessments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No assessments recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assessments.map((assessment) => (
            <Card
              key={assessment.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                selectedForCompare.includes(assessment.id) ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => !compareMode && setSelectedAssessment(assessment)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {compareMode && (
                      <Checkbox
                        checked={selectedForCompare.includes(assessment.id)}
                        onCheckedChange={() => toggleCompareSelection(assessment.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div>
                      <h4 className="font-medium">
                        {assessment.assessment_templates?.name || "Unknown Template"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(assessment.assessed_date), "MMM d, yyyy")}
                        {assessment.assessor && ` • by ${assessment.assessor.full_name}`}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {Object.entries(assessment.results).slice(0, 3).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key}: {value === "pass" ? "✓" : value === "fail" ? "✗" : value}
                          </Badge>
                        ))}
                        {Object.keys(assessment.results).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(assessment.results).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {!compareMode && (
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assessment Detail Dialog */}
      <Dialog open={!!selectedAssessment} onOpenChange={() => setSelectedAssessment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedAssessment?.assessment_templates?.name || "Assessment Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedAssessment && format(new Date(selectedAssessment.assessed_date), "MMMM d, yyyy")}
              {selectedAssessment?.assessor && ` • Assessed by ${selectedAssessment.assessor.full_name}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
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

              {selectedAssessment?.attachments && selectedAssessment.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Attachments</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAssessment.attachments.map((attachment, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            {attachment.type === "video" ? (
                              <FileVideo className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Image className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{attachment.itemName}</p>
                              <p className="text-xs text-muted-foreground truncate">{attachment.name}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedAssessment?.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAssessment.notes}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assessment Comparison</DialogTitle>
            <DialogDescription>
              Side-by-side comparison of selected assessments
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            {compareAssessments.length === 2 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>
                      {format(new Date(compareAssessments[0].assessed_date), "MMM d, yyyy")}
                    </TableHead>
                    <TableHead>
                      {format(new Date(compareAssessments[1].assessed_date), "MMM d, yyyy")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareAssessments[0].assessment_templates?.checklist_items.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {renderResultValue(compareAssessments[0].results[item.name], item.type)}
                      </TableCell>
                      <TableCell>
                        {renderResultValue(compareAssessments[1].results[item.name], item.type)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentHistoryTab;
