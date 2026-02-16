import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCheckinSubmissions } from "@/hooks/useCheckinSubmissions";
import { CheckinTemplate, CheckinField } from "@/hooks/useCheckinTemplates";
import { Loader2 } from "lucide-react";

interface CheckinHistoryProps {
  template: CheckinTemplate;
}

export const CheckinHistory = ({ template }: CheckinHistoryProps) => {
  const { submissions, isLoading } = useCheckinSubmissions(template.id);
  const fields: CheckinField[] = Array.isArray(template.fields)
    ? (template.fields as CheckinField[])
    : [];

  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check-in History</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-500 py-8">
          No check-ins submitted yet. Start with the form above!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-in History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {submissions.map((submission) => (
          <div key={submission.id}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">
                {format(
                  new Date(submission.submitted_at || new Date()),
                  "MMMM d, yyyy 'at' h:mm a"
                )}
              </h4>
              <Badge variant="outline">Submitted</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(submission.responses).map(([fieldId, value]) => {
                const field = fieldMap.get(fieldId);
                if (!field) return null;

                let displayValue = value;
                if (field.type === "scale") {
                  displayValue = `${value}/10`;
                } else if (value === null || value === undefined) {
                  displayValue = "-";
                } else if (typeof value === "object") {
                  displayValue = JSON.stringify(value);
                }

                return (
                  <div key={fieldId} className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">
                      {field.label}
                    </p>
                    <p className="text-base text-gray-900">
                      {String(displayValue)}
                    </p>
                  </div>
                );
              })}
            </div>

            <Separator className="mt-4" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
