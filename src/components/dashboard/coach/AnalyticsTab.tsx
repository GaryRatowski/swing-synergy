import { useState } from "react";
import { useCoachDashboardAnalytics } from "@/hooks/useCoachDashboardAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Activity,
  Search,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnalyticsTabProps {
  coachId: string;
  onMessageClient?: (clientId: string) => void;
  onViewClient?: (clientId: string) => void;
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (current > previous) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" />+{current - previous}
      </span>
    );
  }
  if (current < previous) {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <TrendingDown className="h-3 w-3" />{current - previous}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />Same
    </span>
  );
}

function ComplianceBadge({ percent }: { percent: number }) {
  if (percent >= 75) {
    return <Badge className="bg-green-600 hover:bg-green-700 text-white">{percent}%</Badge>;
  }
  if (percent >= 50) {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{percent}%</Badge>;
  }
  return <Badge variant="destructive">{percent}%</Badge>;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function AnalyticsTab({ coachId, onMessageClient, onViewClient }: AnalyticsTabProps) {
  const [rosterSearch, setRosterSearch] = useState("");

  const {
    needsAttention,
    needsAttentionLoading,
    weeklySummary,
    weeklySummaryLoading,
    clientRoster,
    clientRosterLoading,
    refetchAll,
  } = useCoachDashboardAnalytics(coachId);

  const filteredRoster = clientRoster.filter((c) =>
    c.full_name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (c.programName || "").toLowerCase().includes(rosterSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Manage your clients at a glance</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* SECTION 1 — Needs Attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Needs Attention
          </CardTitle>
          <CardDescription>
            Clients who may need follow-up this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsAttentionLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : needsAttention.length === 0 ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <p className="text-green-700 dark:text-green-400 font-medium">
                All clients on track this week!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={client.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(client.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{client.full_name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {client.issues.map((issue, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-destructive border-destructive/30">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {onMessageClient && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onMessageClient(client.id)}
                        title="Message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    {onViewClient && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewClient(client.id)}
                        title="View profile"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2 — Weekly Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Weekly Summary</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Workouts */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Workouts</span>
              </div>
              {weeklySummaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{weeklySummary?.workoutsCompleted ?? 0}</p>
                  <TrendArrow
                    current={weeklySummary?.workoutsCompleted ?? 0}
                    previous={weeklySummary?.workoutsCompletedLastWeek ?? 0}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Check-ins */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Check-ins</span>
              </div>
              {weeklySummaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{weeklySummary?.checkinsReceived ?? 0}</p>
                  <TrendArrow
                    current={weeklySummary?.checkinsReceived ?? 0}
                    previous={weeklySummary?.checkinsReceivedLastWeek ?? 0}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Messages</span>
              </div>
              {weeklySummaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{weeklySummary?.messagesReceived ?? 0}</p>
                  <TrendArrow
                    current={weeklySummary?.messagesReceived ?? 0}
                    previous={weeklySummary?.messagesReceivedLastWeek ?? 0}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Avg Compliance */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Avg Compliance</span>
              </div>
              {weeklySummaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{weeklySummary?.avgCompliance ?? 0}%</p>
                  <TrendArrow
                    current={weeklySummary?.avgCompliance ?? 0}
                    previous={weeklySummary?.avgComplianceLastWeek ?? 0}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3 — Client Roster Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Client Roster</CardTitle>
              <CardDescription>Sorted by engagement level — lowest compliance first</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clientRosterLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRoster.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {rosterSearch ? "No clients match your search" : "No active clients yet"}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-center">Workouts</TableHead>
                    <TableHead className="text-center">Check-in</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-center pr-6">Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoster.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => onViewClient?.(client.id)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={client.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(client.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{client.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {client.programName || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">
                          {client.workoutsCompleted}/{client.workoutsScheduled}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {client.checkinStatus === "submitted" && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">
                            Submitted
                          </Badge>
                        )}
                        {client.checkinStatus === "pending" && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 text-xs">
                            Pending
                          </Badge>
                        )}
                        {client.checkinStatus === "no_template" && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {client.lastActive
                            ? formatDistanceToNow(new Date(client.lastActive), { addSuffix: true })
                            : "Never"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <ComplianceBadge percent={client.compliancePercent} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
