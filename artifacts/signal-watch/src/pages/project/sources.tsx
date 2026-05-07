import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useListSources, getListSourcesQueryKey, useCreateSource, useUpdateSource, useDeleteSource, useListEngineTypes, getListEngineTypesQueryKey, useTriggerSourceCollection } from "@workspace/api-client-react";
import { Database, Plus, Trash2, RefreshCw, Clock, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function ProjectSources({ params }: { params: { id: string } }) {
  const projectId = parseInt(params.id, 10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sources, isLoading: sourcesLoading } = useListSources(projectId, {
    query: { enabled: !!projectId, queryKey: getListSourcesQueryKey(projectId) }
  });

  const { data: engineTypes, isLoading: enginesLoading } = useListEngineTypes({
    query: { queryKey: getListEngineTypesQueryKey() }
  });

  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();
  const triggerCollection = useTriggerSourceCollection();

  const handleToggleEnabled = (sourceId: number, currentEnabled: boolean) => {
    updateSource.mutate(
      { projectId, id: sourceId, data: { isEnabled: !currentEnabled } },
      {
        onSuccess: () => {
          toast({ title: "Source updated" });
          queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey(projectId) });
        }
      }
    );
  };

  const handleDelete = (sourceId: number) => {
    deleteSource.mutate(
      { projectId, id: sourceId },
      {
        onSuccess: () => {
          toast({ title: "Source removed" });
          queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey(projectId) });
        }
      }
    );
  };

  const handleTrigger = (sourceId: number) => {
    triggerCollection.mutate(
      { projectId, id: sourceId },
      {
        onSuccess: (data) => {
          toast({ 
            title: "Collection triggered", 
            description: `Collected ${data.signalsCollected} new signals. ${data.message}` 
          });
          queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey(projectId) });
        },
        onError: () => {
          toast({ title: "Trigger failed", variant: "destructive" });
        }
      }
    );
  };

  return (
    <AppLayout projectId={params.id}>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
            <p className="text-muted-foreground mt-1">Configure where SENTINEL AI collects data from.</p>
          </div>
          <CreateSourceDialog 
            projectId={projectId} 
            engineTypes={engineTypes || []} 
            open={isCreateOpen} 
            onOpenChange={setIsCreateOpen} 
          />
        </div>

        {sourcesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : sources?.length === 0 ? (
          <div className="text-center py-20 border rounded-lg bg-card/50">
            <Database className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No sources configured</h3>
            <p className="text-muted-foreground mb-4">Add a data source to start collecting signals.</p>
            <Button onClick={() => setIsCreateOpen(true)}>Add Data Source</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sources?.map(source => (
              <Card key={source.id} className={`flex flex-col ${!source.isEnabled ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <Badge variant={source.isEnabled ? "default" : "secondary"}>
                        {source.isEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`toggle-${source.id}`} className="sr-only">Enable source</Label>
                      <Switch 
                        id={`toggle-${source.id}`} 
                        checked={source.isEnabled} 
                        onCheckedChange={() => handleToggleEnabled(source.id, source.isEnabled)}
                        disabled={updateSource.isPending && updateSource.variables?.id === source.id}
                      />
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <Settings className="h-3 w-3" /> {source.engineTypeName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {source.latency}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mb-2">
                    <div className="font-medium mb-1">Configuration</div>
                    <pre className="text-xs overflow-x-auto">{JSON.stringify(source.config || {}, null, 2)}</pre>
                  </div>
                  <div className="text-xs text-muted-foreground mt-4">
                    Last run: {source.lastRunAt ? formatDate(source.lastRunAt) : "Never"}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t flex justify-between bg-muted/10">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(source.id)}
                    disabled={deleteSource.isPending && deleteSource.variables?.id === source.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleTrigger(source.id)}
                    disabled={(!source.isEnabled) || (triggerCollection.isPending && triggerCollection.variables?.id === source.id)}
                  >
                    {triggerCollection.isPending && triggerCollection.variables?.id === source.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Trigger Collection
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function CreateSourceDialog({ projectId, engineTypes, open, onOpenChange }: { projectId: number, engineTypes: any[], open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [engineTypeId, setEngineTypeId] = useState<string>("");
  const [latency, setLatency] = useState<string>("realtime");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createSource = useCreateSource();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !engineTypeId) return;

    createSource.mutate(
      { 
        projectId,
        data: { 
          name, 
          engineTypeId: parseInt(engineTypeId, 10), 
          latency: latency as any,
          config: {}
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSourcesQueryKey(projectId) });
          toast({ title: "Source added successfully" });
          onOpenChange(false);
          setName("");
          setEngineTypeId("");
        },
        onError: () => {
          toast({ title: "Failed to add source", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Data Source</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
            <DialogDescription>
              Connect a new data source to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Source Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Subreddit Monitor" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="engine">Engine Type</Label>
              <Select value={engineTypeId} onValueChange={setEngineTypeId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an engine" />
                </SelectTrigger>
                <SelectContent>
                  {engineTypes.map(engine => (
                    <SelectItem key={engine.id} value={engine.id.toString()}>{engine.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="latency">Collection Frequency</Label>
              <Select value={latency} onValueChange={setLatency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (High priority)</SelectItem>
                  <SelectItem value="daily">Daily (Batch)</SelectItem>
                  <SelectItem value="weekly">Weekly (Reports)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createSource.isPending || !name || !engineTypeId}>
              {createSource.isPending ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
