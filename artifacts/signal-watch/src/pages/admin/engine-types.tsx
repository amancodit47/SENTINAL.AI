import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListEngineTypes, getListEngineTypesQueryKey, useCreateEngineType, useUpdateEngineType, useDeleteEngineType } from "@workspace/api-client-react";
import { Settings, Plus, Edit2, Trash2, Cpu, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function AdminEngineTypes() {
  const { data: engineTypes, isLoading } = useListEngineTypes({
    query: { queryKey: getListEngineTypesQueryKey() }
  });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEngine, setEditingEngine] = useState<any>(null);

  const deleteEngine = useDeleteEngineType();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    deleteEngine.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Engine type deleted" });
          queryClient.invalidateQueries({ queryKey: getListEngineTypesQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to delete engine type", variant: "destructive" });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Engine Types</h1>
            <p className="text-muted-foreground mt-1">Configure data collection engines available to projects.</p>
          </div>
          <CreateEngineDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : engineTypes?.length === 0 ? (
          <div className="text-center py-20 border rounded-lg bg-card/50">
            <Cpu className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No engine types</h3>
            <p className="text-muted-foreground mb-4">Configure an engine type to collect signals.</p>
            <Button onClick={() => setIsCreateOpen(true)}>Add Engine Type</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {engineTypes?.map(engine => (
              <Card key={engine.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-muted-foreground" />
                      {engine.name}
                    </CardTitle>
                    {engine.isBuiltIn && <Badge variant="secondary">Built-in</Badge>}
                  </div>
                  <CardDescription className="font-mono text-xs">{engine.slug}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {engine.description || "No description provided."}
                  </p>
                  
                  {engine.configSchema && Object.keys(engine.configSchema).length > 0 && (
                    <div className="bg-muted/50 p-3 rounded-md text-xs">
                      <div className="font-semibold mb-1">Config Schema</div>
                      <pre className="overflow-x-auto text-[10px] text-muted-foreground">
                        {JSON.stringify(engine.configSchema, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-3 border-t bg-muted/10 flex justify-end gap-2">
                  {!engine.isBuiltIn && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditingEngine(engine)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(engine.id)}
                        disabled={deleteEngine.isPending && deleteEngine.variables?.id === engine.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {editingEngine && (
          <EditEngineDialog 
            engine={editingEngine} 
            open={!!editingEngine} 
            onOpenChange={(open) => !open && setEditingEngine(null)} 
          />
        )}
      </div>
    </AppLayout>
  );
}

function CreateEngineDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [schemaStr, setSchemaStr] = useState("{}");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createEngine = useCreateEngineType();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    let configSchema = {};
    try {
      configSchema = JSON.parse(schemaStr);
    } catch (err) {
      toast({ title: "Invalid JSON in schema", variant: "destructive" });
      return;
    }

    createEngine.mutate(
      { data: { name, slug, description, configSchema } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEngineTypesQueryKey() });
          toast({ title: "Engine type created" });
          onOpenChange(false);
          setName("");
          setSlug("");
          setDescription("");
          setSchemaStr("{}");
        },
        onError: () => {
          toast({ title: "Failed to create engine type", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Engine Type</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Engine Type</DialogTitle>
            <DialogDescription>
              Define a new data collection engine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={handleNameChange} placeholder="e.g. RSS Fetcher" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="rss-fetcher" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schema">Config Schema (JSON)</Label>
              <Textarea 
                id="schema" 
                value={schemaStr} 
                onChange={e => setSchemaStr(e.target.value)} 
                placeholder="{}" 
                className="font-mono text-sm h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createEngine.isPending || !name || !slug}>
              {createEngine.isPending ? "Adding..." : "Add Engine Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEngineDialog({ engine, open, onOpenChange }: { engine: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState(engine.name);
  const [description, setDescription] = useState(engine.description || "");
  const [schemaStr, setSchemaStr] = useState(JSON.stringify(engine.configSchema || {}, null, 2));
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateEngine = useUpdateEngineType();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    let configSchema = {};
    try {
      configSchema = JSON.parse(schemaStr);
    } catch (err) {
      toast({ title: "Invalid JSON in schema", variant: "destructive" });
      return;
    }

    updateEngine.mutate(
      { id: engine.id, data: { name, description, configSchema } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEngineTypesQueryKey() });
          toast({ title: "Engine type updated" });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Failed to update engine type", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Engine Type</DialogTitle>
            <DialogDescription>
              Update configuration for {engine.slug}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-schema">Config Schema (JSON)</Label>
              <Textarea 
                id="edit-schema" 
                value={schemaStr} 
                onChange={e => setSchemaStr(e.target.value)} 
                className="font-mono text-sm h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateEngine.isPending || !name}>
              {updateEngine.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
