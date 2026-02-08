import { useState } from "react";
import { useCoachAnalytics, DateRange } from "@/hooks/useCoachAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown, Target, Activity, DollarSign, Users, AlertTriangle, MessageSquare, Download, ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface AnalyticsTabProps {
  coachId: string;
  onMessageClient?: (clientId: string) => void;
}

const chartConfig = {
  clients: {
    label: "Clients",
    color: "hsl(var(--primary))",
  },
  sessions: {
    label: "Sessions",
    color: "hsl(var(--accent))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
};

const TIER_COLORS: Record<string, string> = {
  none: "hsl(var(--muted-foreground))",
  app_only: "hsl(220, 90%, 56%)",  // blue
  remote: "hsl(262, 83%, 58%)",     // purple
  hybrid: "hsl(142, 76%, 36%)",     // green
  in_person: "hsl(25, 95%, 53%)",   // orange
};

const TIER_LABELS: Record<string, string> = {
  none: "No Subscription",
  app_only: "App Only",
  remote: "Remote Coaching",
  hybrid: "Hybrid Coaching",
  in_person: "In-Person Training",
};

function formatMembershipType(type: string): string {
  switch (type) {
    case "individual_coaching":
      return "1-on-1 Coaching";
    case "community":
      return "Community";
    case "program_only":
      return "Program Only";
    default:
      return type;
  }
}

export function AnalyticsTab({ coachId, onMessageClient }: AnalyticsTabProps) {
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [analyticsView, setAnalyticsView] = useState<"overview" | "revenue">("overview");

  const {
    retention,
    retentionLoading,
    programPerformance,
    programsLoading,
    sessionStats,
    sessionsLoading,
    revenue,
    revenueLoading,
    atRiskClients,
    atRiskLoading,
    clientGrowthTrend,
    clientGrowthLoading,
    sessionVolumeTrend,
    sessionVolumeLoading,
    subscriptionMetrics,
    subscriptionMetricsLoading,
    revenueTrend,
    revenueTrendLoading,
  } = useCoachAnalytics(coachId, dateRange);

  const exportToCSV = (data: object[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? "")).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare pie chart data for tier distribution
  const tierChartData = (revenue?.byTier || [])
    .filter(t => t.tier !== "none" && t.count > 0)
    .map(t => ({
      name: TIER_LABELS[t.tier] || t.tier,
      value: t.count,
      mrr: t.mrr,
      fill: TIER_COLORS[t.tier] || TIER_COLORS.none,
    }));

  return (
    <div className="space-y-6">
      {/* Header with date range selector and view tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Track your coaching business metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={analyticsView} onValueChange={(v) => setAnalyticsView(v as "overview" | "revenue")}>
            <TabsList>
              <TabsTrigger value="overview" className="gap-2">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="revenue" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {analyticsView === "overview" ? (
        <>
          {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Retention Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            {retention?.netChange && retention.netChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            {retentionLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{retention?.retentionRate ?? 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {(retention?.netChange ?? 0) > 0 ? "+" : ""}
                  {retention?.netChange ?? 0} clients this period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Program Completion */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Program Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {programsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {programPerformance.length > 0
                    ? Math.round(
                        programPerformance.reduce((acc, p) => acc + p.completionRate, 0) /
                          programPerformance.length
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  {programPerformance.reduce((acc, p) => acc + p.completed, 0)} of{" "}
                  {programPerformance.reduce((acc, p) => acc + p.totalAssigned, 0)} programs
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Avg Sessions/Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sessions/Month</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{sessionStats?.avgSessionsPerMonth ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {sessionStats?.totalSessions ?? 0} total sessions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${(revenue?.mrr ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">MRR</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Client Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Client Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientGrowthLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clientGrowthTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="clients"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Session Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Session Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionVolumeLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionVolumeTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" name="sessions" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue Breakdown
          </CardTitle>
          <CardDescription>Monthly recurring revenue by membership type</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {(revenue?.byMembership || []).map((item) => (
                <div key={item.type} className="rounded-lg border p-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    {formatMembershipType(item.type)}
                  </div>
                  <div className="mt-1 text-2xl font-bold">${item.mrr.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{item.count} clients</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Program Performance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Program Performance</CardTitle>
            <CardDescription>Completion rates by program</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(programPerformance, "program-performance")}
            disabled={!programPerformance.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {programsLoading ? (
            <Skeleton className="h-48" />
          ) : programPerformance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No program data for this period
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program Name</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programPerformance.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.name}</TableCell>
                    <TableCell className="text-right">{program.totalAssigned}</TableCell>
                    <TableCell className="text-right">{program.completed}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          program.completionRate >= 70
                            ? "default"
                            : program.completionRate >= 40
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {program.completionRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* At-Risk Clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              At-Risk Clients
            </CardTitle>
            <CardDescription>Clients with no sessions in the last 14 days</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                atRiskClients.map((c) => ({
                  name: c.full_name,
                  email: c.email,
                  daysSinceLastSession: c.daysSinceLastSession,
                })),
                "at-risk-clients"
              )
            }
            disabled={!atRiskClients.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {atRiskLoading ? (
            <Skeleton className="h-48" />
          ) : atRiskClients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              🎉 All clients are active!
            </p>
          ) : (
            <div className="space-y-3">
              {atRiskClients.slice(0, 10).map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={client.avatar_url || undefined} />
                      <AvatarFallback>
                        {client.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      {client.lastSessionDate ? (
                        <span className="text-muted-foreground">
                          Last session: {formatDistanceToNow(new Date(client.lastSessionDate))} ago
                        </span>
                      ) : (
                        <span className="text-destructive">No sessions logged</span>
                      )}
                    </div>
                    {onMessageClient && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMessageClient(client.id)}
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Message
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {atRiskClients.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  +{atRiskClients.length - 10} more at-risk clients
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </>
      ) : (
        /* Revenue Analytics View */
        <>
          {/* Revenue KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* MRR */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">${(revenue?.mrr ?? 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      from {revenue?.byTier?.reduce((acc, t) => acc + (t.mrr > 0 ? t.count : 0), 0) || 0} paying clients
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* New Signups */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Signups</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                {subscriptionMetricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{subscriptionMetrics?.signups || 0}</div>
                    <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Upgrades */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upgrades</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                {subscriptionMetricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{subscriptionMetrics?.upgrades || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      vs {subscriptionMetrics?.downgrades || 0} downgrades
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cancellations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cancellations</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {subscriptionMetricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{subscriptionMetrics?.cancellations || 0}</div>
                    <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue Trend
                </CardTitle>
                <CardDescription>Monthly revenue over last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueTrendLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : revenueTrend.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                        />
                        <Bar dataKey="revenue" name="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <p>No payment data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tier Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Client Distribution by Tier
                </CardTitle>
                <CardDescription>Active subscribers by plan</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : tierChartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tierChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {tierChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: { payload?: { mrr?: number } }) => [
                            `${value} clients ($${props.payload?.mrr?.toLocaleString() || 0}/mo)`,
                            name,
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <p>No active subscriptions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tier Breakdown Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Revenue by Tier</CardTitle>
                <CardDescription>Monthly recurring revenue breakdown by subscription tier</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(
                    (revenue?.byTier || []).map((t) => ({
                      tier: TIER_LABELS[t.tier] || t.tier,
                      clients: t.count,
                      percentage: t.percentage.toFixed(1) + "%",
                      monthlyRevenue: "$" + t.mrr.toFixed(2),
                      avgPerClient: "$" + (t.count > 0 ? (t.mrr / t.count).toFixed(2) : "0.00"),
                    })),
                    "revenue-by-tier"
                  )
                }
                disabled={!revenue?.byTier?.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Clients</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                      <TableHead className="text-right">Monthly Revenue</TableHead>
                      <TableHead className="text-right">Avg per Client</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(revenue?.byTier || [])
                      .filter((tier) => tier.tier !== "none")
                      .map((tier) => (
                        <TableRow key={tier.tier}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: TIER_COLORS[tier.tier] }}
                              />
                              <span className="font-medium">{TIER_LABELS[tier.tier] || tier.tier}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{tier.count}</TableCell>
                          <TableCell className="text-right">{tier.percentage.toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-medium">${tier.mrr.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            ${tier.count > 0 ? (tier.mrr / tier.count).toFixed(2) : "0.00"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Subscription Changes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Subscription Changes</CardTitle>
                <CardDescription>Last {dateRange} days of upgrades, downgrades, and cancellations</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(
                    (subscriptionMetrics?.recentChanges || []).map((c) => ({
                      client: c.profile?.full_name || "Unknown",
                      email: c.profile?.email || "",
                      change: c.reason || "unknown",
                      from: TIER_LABELS[c.previous_tier || ""] || c.previous_tier || "-",
                      to: TIER_LABELS[c.new_tier || ""] || c.new_tier || "-",
                      date: c.changed_at ? format(new Date(c.changed_at), "yyyy-MM-dd") : "",
                    })),
                    "subscription-changes"
                  )
                }
                disabled={!subscriptionMetrics?.recentChanges?.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {subscriptionMetricsLoading ? (
                <Skeleton className="h-48" />
              ) : (subscriptionMetrics?.recentChanges || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No subscription changes in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subscriptionMetrics?.recentChanges || []).map((change) => (
                      <TableRow key={change.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{change.profile?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{change.profile?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              change.reason === "upgrade"
                                ? "default"
                                : change.reason === "signup"
                                ? "default"
                                : change.reason === "downgrade"
                                ? "secondary"
                                : "destructive"
                            }
                            className="capitalize"
                          >
                            {change.reason === "upgrade" && <ArrowUpRight className="mr-1 h-3 w-3" />}
                            {change.reason === "downgrade" && <ArrowDownRight className="mr-1 h-3 w-3" />}
                            {change.reason || "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {change.previous_tier ? TIER_LABELS[change.previous_tier] || change.previous_tier : "-"}
                        </TableCell>
                        <TableCell>
                          {change.new_tier ? TIER_LABELS[change.new_tier] || change.new_tier : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {change.changed_at ? format(new Date(change.changed_at), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
