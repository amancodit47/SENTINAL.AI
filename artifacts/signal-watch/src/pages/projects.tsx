import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDate } from "@/lib/utils";
import { Activity, AlertTriangle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListProjectsQueryKey } from "@workspace/api-client-react";

export default function ProjectsList() {
  const { data: projects, isLoading } = useListProjects();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monitoring Projects</h1>
            <p className="text-muted-foreground mt-2">Manage your healthcare social listening projects.</p>
          </div>
          <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-card/50">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">Create your first monitoring project to start tracking healthcare signals.</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ProjectCard({ project }: { project: any }) {
  return (
    <Link href={`/projects/${project.id}/dashboard`}>
      <Card className="h-full hover:border-primary transition-colors cursor-pointer flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="line-clamp-1">{project.name}</CardTitle>
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2 min-h-[40px]">
            {project.description || "No description provided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-semibold">{formatNumber(project.totalSignals)}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" /> Signals
              </span>
            </div>
            <div className="flex flex-col">
              <span className={project.safetyAlerts > 0 ? "text-2xl font-semibold text-destructive" : "text-2xl font-semibold"}>
                {formatNumber(project.safetyAlerts)}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Alerts
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-4 border-t text-xs text-muted-foreground">
          Created {formatDate(project.createdAt)}
        </CardFooter>
      </Card>
    </Link>
  );
}

function CreateProjectDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const createProject = useCreateProject();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    createProject.mutate(
      { data: { name, description } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Project created", description: "Your new project is ready." });
          onOpenChange(false);
          setLocation(`/projects/${data.id}/dashboard`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create project", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Monitoring Project</DialogTitle>
            <DialogDescription>
              Set up a new project to monitor signals and track safety events.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Oncology Q3 Monitor" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Details about this project..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
