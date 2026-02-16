import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCheckinSubmissions } from "@/hooks/useCheckinSubmissions";
import { CheckinTemplate, CheckinField } from "@/hooks/useCheckinTemplates";
import { Loader2, ClipboardList } from "lucide-react";

interface CheckinHistoryProps {
  template: CheckinTemplate;
}

export const CheckinHistory = ({ template }: CheckinHistoryProps) => {
  const { submissions, isLoading } = useCheckinSubmissions(template.id);

  const fields: CheckinField[] = (() => {
    try {
      const raw = template.fields;
      if (Array.isArray(raw)) return raw as CheckinField[];
      if (typeof raw === "string") return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  })();

  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Check-in History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No check-ins submitted yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Check-in History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {submissions.map((submission, idx) => (
          <div key={submission.id}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm sm:text-base">
                {format(
                  new Date(submission.submitted_at || new Date()),
                  "MMM d, yyyy"
                )}
              </h4>
              <Badge variant="outline">Submitted</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(submission.responses).map(([fieldId, value]) => {
                const field = fieldMap.get(fieldId);
                if (!field) return null;

                let displayValue: string;
                if (field.type === "scale") {
                  displayValue = `${value}/${field.scale_max || 10}`;
                } else if (field.type === "yes_no") {
                  displayValue = value === "yes" ? "Yes" : value === "no" ? "No" : String(value ?? "-");
                } else if (value === null || value === undefined) {
                  displayValue = "-";
                } else if (typeof value === "object") {
                  displayValue = JSON.stringify(value);
                } else {
                  displayValue = String(value);
                }

                return (
                  <div key={fieldId} className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </p>
                    <p className="text-sm text-foreground">
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>

            {idx < submissions.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
