import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskTrendChartProps {
  data: { date: string; score: number }[];
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  // Calculate trend
  const firstScore = data[0]?.score || 0;
  const lastScore = data[data.length - 1]?.score || 0;
  const trend = lastScore - firstScore;
  const trendPercentage = firstScore > 0 ? Math.round((trend / firstScore) * 100) : 0;

  // Find min and max for better visualization
  const scores = data.map(d => d.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 100);
  
  // Determine chart color based on trend (improving = green, worsening = red)
  const isImproving = trend <= 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            Risk Score Trend
          </CardTitle>
          <CardDescription>Last 30 days performance</CardDescription>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
          trend < 0 ? "bg-success/10 text-success" :
          trend > 0 ? "bg-critical/10 text-critical" :
          "bg-muted text-muted-foreground"
        )}>
          {trend < 0 ? (
            <TrendingDown className="h-4 w-4" />
          ) : trend > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
          <span>{trend < 0 ? '' : '+'}{trend} pts</span>
          {trendPercentage !== 0 && (
            <span className="text-xs opacity-70">({trendPercentage}%)</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={isImproving ? "hsl(var(--success))" : "hsl(var(--critical))"} 
                    stopOpacity={0.3} 
                  />
                  <stop 
                    offset="95%" 
                    stopColor={isImproving ? "hsl(var(--success))" : "hsl(var(--critical))"} 
                    stopOpacity={0} 
                  />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
                tickMargin={8}
              />
              <YAxis 
                domain={[Math.max(0, minScore - 10), Math.min(100, maxScore + 10)]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-10}
                tickMargin={8}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  padding: "12px 16px"
                }}
                labelStyle={{ 
                  color: "hsl(var(--foreground))",
                  fontWeight: 600,
                  marginBottom: "4px"
                }}
                itemStyle={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "14px"
                }}
                formatter={(value: number) => [`Risk Score: ${value}`, '']}
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={isImproving ? "hsl(var(--success))" : "hsl(var(--critical))"}
                strokeWidth={2.5}
                fill="url(#riskGradient)"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: isImproving ? "hsl(var(--success))" : "hsl(var(--critical))",
                  stroke: "hsl(var(--card))",
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend / Info */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span>Lower = Better</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Current: {lastScore}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
