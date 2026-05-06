import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useGetProject, getGetProjectQueryKey, useGetProjectSummary, getGetProjectSummaryQueryKey, useGetSignalTimeline, getGetSignalTimelineQueryKey, useGetSentimentBreakdown, getGetSentimentBreakdownQueryKey, useGetTopEntities, getGetTopEntitiesQueryKey, useGetSafetyAlerts, getGetSafetyAlertsQueryKey, useAnalyzeProjectBatch } from "@workspace/api-client-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { Activity, AlertTriangle, ShieldAlert, BarChart3, TrendingUp, Tags, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProjectDashboard({ params }: { params: { id: string } }) {
  const projectId = parseInt(params.id, 10);
  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });
  const { data: summary, isLoading: isSummaryLoading } = useGetProjectSummary(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectSummaryQueryKey(projectId) } });
  const { data: timeline } = useGetSignalTimeline(projectId, { days: 30 } as any, { query: { enabled: !!projectId, queryKey: getGetSignalTimelineQueryKey(projectId, { days: 30 }) } });
  const { data: sentiment } = useGetSentimentBreakdown(projectId, { days: 30 } as any, { query: { enabled: !!projectId, queryKey: getGetSentimentBreakdownQueryKey(projectId, { days: 30 }) } });
  const { data: entities } = useGetTopEntities(projectId, { limit: 10 } as any, { query: { enabled: !!projectId, queryKey: getGetTopEntitiesQueryKey(projectId, { limit: 10 }) } });
  const { data: safetyAlerts } = useGetSafetyAlerts(projectId, { query: { enabled: !!projectId, queryKey: getGetSafetyAlertsQueryKey(projectId) } });

  const analyzeBatch = useAnalyzeProjectBatch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAnalyzeBatch = () => {
    analyzeBatch.mutate(
      { projectId },
      {
        onSuccess: (res: any) => {
          toast({ title: "Analysis complete", description: res?.message || `Analyzed signals.` });
          queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey(projectId) });
        },
        onError: () => {
          toast({ title: "Analysis failed", variant: "destructive" });
        }
      }
    );
  };

  const isLoading = isProjectLoading || isSummaryLoading;

  if (isLoading) {
    return (
      <AppLayout projectId={params.id}>
        <div className="p-8">
          <Skeleton className="h-10 w-1/4 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  const SENTIMENT_COLORS = {
    positive: "hsl(var(--primary))",
    negative: "hsl(var(--destructive))",
    neutral: "hsl(var(--chart-4))",
    unanalyzed: "hsl(var(--muted-foreground))"
  };

  const sentimentData = sentiment ? [
    { name: "Positive", value: sentiment.positive, color: SENTIMENT_COLORS.positive },
    { name: "Negative", value: sentiment.negative, color: SENTIMENT_COLORS.negative },
    { name: "Neutral", value: sentiment.neutral, color: SENTIMENT_COLORS.neutral },
  ].filter(d => d.value > 0) : [];

  return (
    <AppLayout projectId={params.id}>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project?.name} Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time signal overview and safety alerts.</p>
          </div>
          <Button onClick={handleAnalyzeBatch} disabled={analyzeBatch.isPending}>
            {analyzeBatch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Batch Analyze Unprocessed
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary?.totalSignals || 0)}</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Safety Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatNumber(summary?.safetyAlerts || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negative Sentiment</CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary?.negativeCount || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PII Flags</CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary?.piiFlags || 0)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Signal Volume (30 Days)</CardTitle>
              <CardDescription>Daily signal volume by sentiment and safety alerts.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {timeline && timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAlert" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(val) => formatDate(val).split(',')[0]} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTotal)" name="Total Signals" />
                    <Area type="monotone" dataKey="safetyAlerts" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorAlert)" name="Safety Alerts" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No timeline data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentiment</CardTitle>
              <CardDescription>Breakdown of analyzed signals</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              {sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground">No sentiment data</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Entities</CardTitle>
              <CardDescription>Most frequently mentioned medical terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {entities?.length ? entities.map((entity: any) => (
                  <div key={entity.text} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        entity.type === 'DRUG' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        entity.type === 'CONDITION' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                        'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                      }>
                        {entity.type}
                      </Badge>
                      <span className="font-medium">{entity.text}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatNumber(entity.count)}</span>
                  </div>
                )) : (
                  <div className="text-muted-foreground py-4 text-center">No entities found</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Safety Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(safetyAlerts as any)?.signals?.length ? (safetyAlerts as any).signals.map((signal: any) => (
                  <div key={signal.id} className="p-3 border border-destructive/20 rounded-md bg-destructive/5">
                    <p className="text-sm line-clamp-2 mb-2">{signal.content}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-destructive">{signal.safetyReason}</span>
                      <span className="text-muted-foreground">{formatDate(signal.publishedAt || signal.createdAt)}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-muted-foreground py-4 text-center">No recent safety alerts</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
