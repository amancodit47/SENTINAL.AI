import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListKeywords, getListKeywordsQueryKey, useCreateKeyword, useDeleteKeyword } from "@workspace/api-client-react";
import { Tags, Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function ProjectKeywords({ params }: { params: { id: string } }) {
  const projectId = parseInt(params.id, 10);
  const [newKeyword, setNewKeyword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: keywords, isLoading } = useListKeywords(projectId, {
    query: { enabled: !!projectId, queryKey: getListKeywordsQueryKey(projectId) }
  });

  const createKeyword = useCreateKeyword();
  const deleteKeyword = useDeleteKeyword();

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    createKeyword.mutate(
      { projectId, data: { term: newKeyword.trim() } },
      {
        onSuccess: () => {
          setNewKeyword("");
          toast({ title: "Keyword added" });
          queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey(projectId) });
        },
        onError: () => {
          toast({ title: "Error adding keyword", variant: "destructive" });
        }
      }
    );
  };

  const handleDeleteKeyword = (id: number) => {
    deleteKeyword.mutate(
      { projectId, id },
      {
        onSuccess: () => {
          toast({ title: "Keyword removed" });
          queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey(projectId) });
        },
        onError: () => {
          toast({ title: "Error removing keyword", variant: "destructive" });
        }
      }
    );
  };

  return (
    <AppLayout projectId={params.id}>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keywords</h1>
          <p className="text-muted-foreground mt-1">Manage the terms used for social listening.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Keyword</CardTitle>
            <CardDescription>Enter a medical term, drug name, or condition to monitor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddKeyword} className="flex gap-4 max-w-md">
              <Input
                placeholder="e.g. Pembrolizumab"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                disabled={createKeyword.isPending}
              />
              <Button type="submit" disabled={createKeyword.isPending || !newKeyword.trim()}>
                {createKeyword.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Active Keywords
            </CardTitle>
            <CardDescription>Currently monitoring {keywords?.length || 0} terms.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}
              </div>
            ) : keywords?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border rounded-md border-dashed">
                No keywords added yet. Add a keyword above to start monitoring.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {keywords?.map((kw) => (
                  <Badge key={kw.id} variant="secondary" className="px-3 py-1.5 text-sm flex items-center gap-2 group border-border">
                    {kw.term}
                    <button
                      onClick={() => handleDeleteKeyword(kw.id)}
                      className="text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                      disabled={deleteKeyword.isPending && deleteKeyword.variables?.id === kw.id}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
