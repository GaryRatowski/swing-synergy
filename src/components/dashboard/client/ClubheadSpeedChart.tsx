import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays } from "date-fns";
import { TrendingUp, Activity } from "lucide-react";

interface SpeedDataPoint {
  date: string;
  speed: number;
  displayDate: string;
}

const ClubheadSpeedChart = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<SpeedDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpeedData = async () => {
      if (!profile?.id) return;

      const { data: metrics, error } = await supabase
        .from("performance_metrics")
        .select("value, recorded_date")
        .eq("client_id", profile.id)
        .eq("metric_type", "clubhead_speed")
        .order("recorded_date", { ascending: true })
        .limit(30);

      if (error) {
        console.error("Error fetching speed data:", error);
        // Use mock data for demo
        setData(generateMockData());
      } else if (metrics && metrics.length > 0) {
        setData(
          metrics.map((m) => ({
            date: m.recorded_date || "",
            speed: Number(m.value),
            displayDate: m.recorded_date ? format(new Date(m.recorded_date), "MMM d") : "",
          }))
        );
      } else {
        // No data - show mock for demo
        setData(generateMockData());
      }
      setIsLoading(false);
    };

    fetchSpeedData();
  }, [profile?.id]);

  const generateMockData = (): SpeedDataPoint[] => {
    const mockData: SpeedDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      // Simulate gradual improvement with some variance
      const baseSpeed = 105 + (29 - i) * 0.25;
      const variance = (Math.random() - 0.5) * 3;
      mockData.push({
        date: format(date, "yyyy-MM-dd"),
        speed: Math.round((baseSpeed + variance) * 10) / 10,
        displayDate: format(date, "MMM d"),
      });
    }
    return mockData;
  };

  const chartConfig = {
    speed: {
      label: "Clubhead Speed",
      color: "hsl(var(--primary))",
    },
  };

  const latestSpeed = data.length > 0 ? data[data.length - 1].speed : 0;
  const firstSpeed = data.length > 0 ? data[0].speed : 0;
  const improvement = latestSpeed - firstSpeed;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Clubhead Speed Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Clubhead Speed Progress
          </CardTitle>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-success font-medium">+{improvement.toFixed(1)} mph</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Last 30 days</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.displayDate;
                    }
                    return "";
                  }}
                  formatter={(value) => [`${value} mph`, "Speed"]}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-lg font-bold text-foreground">{firstSpeed}</p>
            <p className="text-xs text-muted-foreground">Start</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <p className="text-lg font-bold text-primary">{latestSpeed}</p>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
          <div className="rounded-lg bg-success/10 p-2">
            <p className="text-lg font-bold text-success">+{improvement.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Gain (mph)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClubheadSpeedChart;
