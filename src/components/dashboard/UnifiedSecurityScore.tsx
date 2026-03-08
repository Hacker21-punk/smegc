import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Lock,
  Eye,
  Server,
  FileCheck,
  Zap,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SecurityDimension {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

interface UnifiedSecurityScoreProps {
  securityScore: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  accountCount: number;
  complianceScore: number;
}

export function UnifiedSecurityScore({
  securityScore,
  totalFindings,
  criticalFindings,
  highFindings,
  accountCount,
  complianceScore,
}: UnifiedSecurityScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [pulseKey, setPulseKey] = useState(0);

  // Compute unified score from multiple dimensions
  const unifiedScore = useMemo(() => {
    if (accountCount === 0) return 0;

    // Weighted composite: compliance (35%), risk posture (30%), findings health (20%), coverage (15%)
    const riskPosture = Math.max(0, 100 - securityScore); // invert risk to posture
    const findingsHealth =
      totalFindings === 0
        ? 100
        : Math.max(0, 100 - criticalFindings * 20 - highFindings * 8 - (totalFindings - criticalFindings - highFindings) * 2);
    const coverage = Math.min(100, accountCount * 25); // up to 4 accounts = full coverage

    return Math.round(
      complianceScore * 0.35 +
        riskPosture * 0.3 +
        findingsHealth * 0.2 +
        coverage * 0.15
    );
  }, [securityScore, totalFindings, criticalFindings, highFindings, accountCount, complianceScore]);

  // Dimensions breakdown
  const dimensions: SecurityDimension[] = useMemo(
    () => [
      {
        id: "compliance",
        label: "Compliance",
        score: complianceScore,
        maxScore: 100,
        icon: FileCheck,
        color: complianceScore >= 80 ? "text-success" : complianceScore >= 50 ? "text-warning" : "text-critical",
        description: "Alignment with security frameworks and standards",
      },
      {
        id: "risk-posture",
        label: "Risk Posture",
        score: Math.max(0, 100 - securityScore),
        maxScore: 100,
        icon: Shield,
        color: securityScore <= 30 ? "text-success" : securityScore <= 60 ? "text-warning" : "text-critical",
        description: "Overall risk level across all accounts",
      },
      {
        id: "findings",
        label: "Findings Health",
        score:
          totalFindings === 0
            ? 100
            : Math.max(
                0,
                100 - criticalFindings * 20 - highFindings * 8 - (totalFindings - criticalFindings - highFindings) * 2
              ),
        maxScore: 100,
        icon: Eye,
        color: totalFindings === 0 ? "text-success" : criticalFindings > 0 ? "text-critical" : "text-warning",
        description: "Active security findings severity distribution",
      },
      {
        id: "coverage",
        label: "Coverage",
        score: Math.min(100, accountCount * 25),
        maxScore: 100,
        icon: Server,
        color: accountCount >= 4 ? "text-success" : accountCount >= 2 ? "text-warning" : "text-info",
        description: "Percentage of infrastructure monitored",
      },
    ],
    [complianceScore, securityScore, totalFindings, criticalFindings, highFindings, accountCount]
  );

  // Animate score on mount/change
  useEffect(() => {
    const target = unifiedScore;
    const duration = 1200;
    const startTime = performance.now();
    const startVal = animatedScore;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [unifiedScore]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("unified-score-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_findings" },
        () => {
          setLastUpdate(new Date());
          setPulseKey((k) => k + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aws_accounts" },
        () => {
          setLastUpdate(new Date());
          setPulseKey((k) => k + 1);
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-critical";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Strong";
    if (score >= 60) return "Moderate";
    if (score >= 40) return "Weak";
    return "Critical";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return ShieldCheck;
    if (score >= 60) return Shield;
    return ShieldAlert;
  };

  const getTrendIcon = (score: number) => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Minus;
    return TrendingDown;
  };

  const ScoreIcon = getScoreIcon(unifiedScore);
  const TrendIcon = getTrendIcon(unifiedScore);
  const scoreColor = getScoreColor(unifiedScore);

  // SVG circle progress
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  const getStrokeColor = (score: number) => {
    if (score >= 80) return "stroke-success";
    if (score >= 60) return "stroke-warning";
    return "stroke-critical";
  };

  return (
    <Card className="relative overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.12s" }}>
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success via-warning to-critical opacity-30" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Unified Security Score
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge
                variant="outline"
                className="bg-success/10 text-success border-success/20 text-[10px] gap-1 animate-pulse"
              >
                <Activity className="h-2.5 w-2.5" />
                Live
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {lastUpdate.toLocaleTimeString()}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Last data update</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Circular Score */}
          <div className="relative flex-shrink-0">
            <svg width="172" height="172" viewBox="0 0 172 172" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="86"
                cy="86"
                r={radius}
                fill="none"
                strokeWidth="10"
                className="stroke-muted/20"
              />
              {/* Score arc */}
              <circle
                key={pulseKey}
                cx="86"
                cy="86"
                r={radius}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className={cn("transition-all duration-1000 ease-out", getStrokeColor(unifiedScore))}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <ScoreIcon className={cn("h-5 w-5 mb-1", scoreColor)} />
              <span className={cn("text-3xl font-bold tabular-nums tracking-tight", scoreColor)}>
                {animatedScore}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                out of 100
              </span>
            </div>
          </div>

          {/* Right side details */}
          <div className="flex-1 w-full space-y-4">
            {/* Overall label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    unifiedScore >= 80
                      ? "bg-success/10 text-success border-success/20"
                      : unifiedScore >= 60
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-critical/10 text-critical border-critical/20"
                  )}
                >
                  <TrendIcon className="h-3 w-3 mr-1" />
                  {getScoreLabel(unifiedScore)}
                </Badge>
              </div>
              {accountCount === 0 && (
                <span className="text-[10px] text-muted-foreground">Connect accounts to see data</span>
              )}
            </div>

            {/* Dimension bars */}
            <div className="space-y-3">
              {dimensions.map((dim) => {
                const Icon = dim.icon;
                const percentage = Math.round((dim.score / dim.maxScore) * 100);
                return (
                  <Tooltip key={dim.id}>
                    <TooltipTrigger asChild>
                      <div className="group cursor-default">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className={cn("h-3.5 w-3.5", dim.color)} />
                            <span className="text-xs font-medium">{dim.label}</span>
                          </div>
                          <span className={cn("text-xs font-semibold tabular-nums", dim.color)}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 ease-out",
                              percentage >= 80
                                ? "bg-success"
                                : percentage >= 50
                                ? "bg-warning"
                                : "bg-critical"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs max-w-[200px]">{dim.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom insight */}
        {accountCount > 0 && (
          <div className="mt-4 p-2.5 rounded-lg bg-muted/10 border border-border/50 flex items-center gap-2.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {unifiedScore >= 80
                ? "Your security posture is strong. Keep monitoring for changes."
                : unifiedScore >= 60
                ? "Some areas need attention. Review findings to improve your score."
                : "Multiple security dimensions need immediate attention. Prioritize critical findings."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
