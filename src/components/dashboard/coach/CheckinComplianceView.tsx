import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCheckinCompliance, useCheckinSubmissions } from "@/hooks/useCheckinSubmissions";
import { CheckinTemplate } from "@/hooks/useCheckinTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface CheckinComplianceViewProps {
  template: CheckinTemplate;
}

export const CheckinComplianceView = ({ template }: CheckinComplianceViewProps) => {
  const { user } = useAuth();
  const { compliance, isLoading } = useCheckinCompliance(template.id);
  const { submissions } = useCheckinSubmissions(template.id);
  const [clientMap, setClientMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchClientNames = async () => {
      if (!compliance?.not_submitted) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", compliance.not_submitted);

      if (!error && data) {
        const map = new Map(data.map((p) => [p.id, p.full_name]));
        setClientMap(map);
      }
    };

    fetchClientNames();
  }, [compliance?.not_submitted]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const compliancePercent = compliance?.compliance_rate || 0;
  const submitted = compliance?.submitted || 0;
  const total = compliance?.total_clients || 0;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="submissions">Submissions</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Check-in Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{submitted}</p>
                <p className="text-sm text-gray-600">Submitted</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {total - submitted}
                </p>
                <p className="text-sm text-gray-600">Outstanding</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(compliancePercent)}%
                </p>
                <p className="text-sm text-gray-600">Compliance Rate</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-gray-600">
                  {submitted} of {total} clients
                </span>
              </div>
              <Progress value={compliancePercent} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Outstanding List */}
        {compliance && compliance.not_submitted.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Outstanding Check-ins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {compliance.not_submitted.map((clientId) => (
                  <div
                    key={clientId}
                    className="flex items-center justify-between p-2 bg-white rounded"
                  >
                    <span className="text-sm font-medium">
                      {clientMap.get(clientId) || "Loading..."}
                    </span>
                    <Badge variant="outline" className="bg-yellow-100">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="submissions" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No submissions yet
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.slice(0, 10).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {clientMap.get(submission.client_id) ||
                            submission.client_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(
                            new Date(submission.submitted_at || new Date()),
                            "MMM d, h:mm a"
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100">
                      Submitted
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
