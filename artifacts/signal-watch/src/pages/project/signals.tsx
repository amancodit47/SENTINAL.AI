import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useListSignals, getListSignalsQueryKey, useAnalyzeSignal } from "@workspace/api-client-react";
import { formatDate, formatNumber } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle, HelpCircle, FileText, Search, Filter, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProjectSignals({ params }: { params: { id: string } }) {
  const projectId = parseInt(params.id, 10);
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [safetyFilter, setSafetyFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const queryParams: any = { limit, offset: page * limit };
  if (sentimentFilter !== "all") queryParams.sentiment = sentimentFilter;
  if (safetyFilter === "safety_only") queryParams.hasSafetyFlag = "true";

  const { data, isLoading } = useListSignals(projectId, queryParams, {
    query: { enabled: !!projectId, queryKey: getListSignalsQueryKey(projectId, queryParams) }
  });

  const analyzeSignal = useAnalyzeSignal();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAnalyze = (signalId: number) => {
    analyzeSignal.mutate(
      { id: signalId },
      {
        onSuccess: () => {
          toast({ title: "Signal analyzed successfully" });
          queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey(projectId, queryParams) });
        },
        onError: () => {
          toast({ title: "Analysis failed", variant: "destructive" });
        }
      }
    );
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (sentiment === "positive") return <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Positive</Badge>;
    if (sentiment === "negative") return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"><XCircle className="h-3 w-3 mr-1" /> Negative</Badge>;
    if (sentiment === "neutral") return <Badge variant="secondary"><HelpCircle className="h-3 w-3 mr-1" /> Neutral</Badge>;
    return <Badge variant="outline">Unanalyzed</Badge>;
  };

  return (
    <AppLayout projectId={params.id}>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Signals Feed</h1>
            <p className="text-muted-foreground mt-1">Review and analyze social listening signals.</p>
          </div>
        </div>

        <Card className="p-4 bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search signals... (UI only placeholder)" className="pl-9" />
            </div>
            <div className="flex gap-4">
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={safetyFilter} onValueChange={setSafetyFilter}>
                <SelectTrigger className="w-[160px]">
                  <AlertTriangle className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Safety" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Signals</SelectItem>
                  <SelectItem value="safety_only">Safety Flags Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-4 w-1/4" /></CardHeader>
                <CardContent><Skeleton className="h-16 w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : data?.signals.length === 0 ? (
          <div className="text-center py-20 border rounded-lg bg-card/50">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No signals found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or wait for sources to collect more data.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {(data?.total || 0) > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, data?.total || 0)} of {data?.total || 0} signals
            </div>
            
            {data?.signals.map((signal) => (
              <Card key={signal.id} className={signal.hasSafetyFlag ? "border-destructive shadow-sm shadow-destructive/10" : ""}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="font-mono text-xs">{signal.sourceType}</Badge>
                    {signal.hasSafetyFlag && (
                      <Badge variant="destructive" className="animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Safety Flag
                      </Badge>
                    )}
                    {signal.hasPiiFlag && (
                      <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                        <ShieldAlert className="h-3 w-3 mr-1" /> PII Detected
                      </Badge>
                    )}
                    {getSentimentBadge(signal.sentiment ?? null)}
                    
                    {signal.confidenceScore && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Conf: {Math.round(signal.confidenceScore * 100)}%
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(signal.publishedAt || signal.createdAt)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base leading-relaxed">{signal.content}</p>
                  
                  {signal.hasSafetyFlag && signal.safetyReason && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive font-medium flex items-start">
                      <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                      {signal.safetyReason}
                    </div>
                  )}

                  {signal.entities && signal.entities.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {signal.entities.map((ent, idx) => (
                        <Badge key={idx} variant="outline" className={
                          ent.type === 'DRUG' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          ent.type === 'CONDITION' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                          'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                        }>
                          {ent.text} <span className="opacity-50 ml-1 text-[10px]">{ent.type}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">
                    {signal.author ? `By ${signal.author}` : "Unknown author"} 
                    {signal.url && <a href={signal.url} target="_blank" rel="noreferrer" className="ml-2 text-primary hover:underline">View original</a>}
                  </div>
                  
                  {!signal.isAnalyzed ? (
                    <Button variant="outline" size="sm" onClick={() => handleAnalyze(signal.id)} disabled={analyzeSignal.isPending && analyzeSignal.variables?.id === signal.id}>
                      {analyzeSignal.isPending && analyzeSignal.variables?.id === signal.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-3 w-3 mr-2" />
                      )}
                      Analyze Now
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> Analyzed
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
            
            <div className="flex justify-between items-center mt-6">
              <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={!data || data.signals.length < limit}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
