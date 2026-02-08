import { useState } from "react";
import { useProgressReports, ProgressReport, ReportData } from "@/hooks/useProgressReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Download,
  Share,
  Mail,
  Trophy,
  Target,
  Edit2,
  Save,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Calendar
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateProgressReportPdf } from "@/lib/progressReportPdf";

interface ProgressReportViewProps {
  report: ProgressReport;
  client: { full_name: string; avatar_url?: string | null } | null | undefined;
  coachId: string;
  onBack: () => void;
  isPublic?: boolean;
}

export default function ProgressReportView({
  report,
  client,
  coachId,
  onBack,
  isPublic = false
}: ProgressReportViewProps) {
  const { updateReport } = useProgressReports(report.client_id, coachId);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [coachNotes, setCoachNotes] = useState(report.report_data.coach_notes);
  const [goals, setGoals] = useState<string[]>(report.report_data.next_month_goals);
  const [newGoal, setNewGoal] = useState("");

  const data = report.report_data;

  const handleSaveNotes = () => {
    updateReport({
      reportId: report.id,
      updates: { coach_notes: coachNotes }
    });
    setIsEditingNotes(false);
  };

  const handleSaveGoals = () => {
    updateReport({
      reportId: report.id,
      updates: { next_month_goals: goals }
    });
    setIsEditingGoals(false);
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleCopyShareLink = () => {
    if (report.share_token) {
      const shareUrl = `${window.location.origin}/share/report/${report.share_token}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    }
  };

  const handleDownloadPdf = () => {
    generateProgressReportPdf(report, client?.full_name || "Client");
  };

  const getRatingVariant = (rating: string) => {
    switch (rating) {
      case "Excellent": return "default";
      case "Good": return "secondary";
      case "Fair": return "outline";
      default: return "destructive";
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      {!isPublic && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleCopyShareLink}>
              <Share className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="max-w-4xl mx-auto space-y-8 pr-4">
          {/* Cover Section */}
          <div className="text-center space-y-4 pb-8 border-b">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src={client?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(client?.full_name || "?")}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-4xl font-bold">
              {format(new Date(report.period_start), "MMMM yyyy")} Progress Report
            </h1>
            <p className="text-xl text-muted-foreground">
              {client?.full_name}
            </p>
            <p className="text-sm text-muted-foreground">
              Report Period: {format(new Date(report.period_start), "MMM d")} - {format(new Date(report.period_end), "MMM d, yyyy")}
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.summary.total_sessions}/{data.summary.expected_sessions}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.summary.compliance_rate.toFixed(0)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Top Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold truncate">
                  {data.summary.top_achievement}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Overall</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge 
                  variant={getRatingVariant(data.summary.overall_rating)}
                  className="text-lg px-3 py-1"
                >
                  {data.summary.overall_rating}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          {data.metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {data.metrics.map((metric) => (
                  <div key={metric.metric_type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{metric.metric_name}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {metric.start_value}{metric.unit} → {metric.end_value}{metric.unit}
                        </span>
                        <Badge 
                          variant={metric.change_percent > 0 ? "default" : "destructive"}
                          className="flex items-center gap-1"
                        >
                          {metric.change_percent > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {metric.change_percent > 0 ? "+" : ""}{metric.change_percent.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    {metric.data_points.length > 1 && (
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={metric.data_points}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => format(new Date(date), "MMM d")}
                            className="text-xs"
                          />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            labelFormatter={(date) => format(new Date(date as string), "MMM d, yyyy")}
                            formatter={(value) => [`${value}${metric.unit}`, metric.metric_name]}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={metric.change_percent >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--background))", strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Workout Compliance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Workout Compliance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Weekly Breakdown */}
              <div className="space-y-3">
                {data.compliance.weekly_breakdown.map((week) => (
                  <div key={week.week_number} className="flex items-center gap-4">
                    <span className="w-20 text-sm text-muted-foreground">
                      Week {week.week_number}
                    </span>
                    <Progress 
                      value={(week.completed / Math.max(week.expected, 1)) * 100} 
                      className="flex-1" 
                    />
                    <span className="w-16 text-sm text-right">
                      {week.completed}/{week.expected}
                    </span>
                  </div>
                ))}
              </div>

              {/* Homework Rate */}
              {data.compliance.homework_completion_rate !== undefined && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Homework Completion</span>
                    <span className="text-sm font-semibold">
                      {data.compliance.homework_completion_rate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={data.compliance.homework_completion_rate} 
                    className="mt-2" 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          {data.achievements.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <CardTitle>Highlights & Achievements</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.achievements.map((achievement, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-3 p-3 bg-accent/50 rounded-lg"
                    >
                      <Trophy className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">{achievement.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coach Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Coach Notes</CardTitle>
                {!isPublic && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isEditingNotes) {
                        handleSaveNotes();
                      } else {
                        setIsEditingNotes(true);
                      }
                    }}
                  >
                    {isEditingNotes ? (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <Textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  rows={6}
                  placeholder="Add your observations, feedback, and recommendations..."
                />
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {coachNotes || "No notes added yet."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Next Month Goals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Goals for Next Month</CardTitle>
                </div>
                {!isPublic && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isEditingGoals) {
                        handleSaveGoals();
                      } else {
                        setIsEditingGoals(true);
                      }
                    }}
                  >
                    {isEditingGoals ? (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingGoals ? (
                <div className="space-y-3">
                  {goals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={goal} readOnly className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveGoal(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="Add a new goal..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                    />
                    <Button variant="outline" onClick={handleAddGoal}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : goals.length > 0 ? (
                <ul className="space-y-2">
                  {goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No goals set yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Footer Actions (for public view) */}
          {isPublic && (
            <div className="flex justify-center gap-4 pt-8 border-t">
              <Button onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
