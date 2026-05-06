import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import ProjectsList from "@/pages/projects";
import ProjectDashboard from "@/pages/project/dashboard";
import ProjectSignals from "@/pages/project/signals";
import ProjectKeywords from "@/pages/project/keywords";
import ProjectSources from "@/pages/project/sources";
import AdminEngineTypes from "@/pages/admin/engine-types";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/projects" />
      </Route>
      <Route path="/projects" component={ProjectsList} />
      
      <Route path="/projects/:id">
        {(params) => <Redirect to={`/projects/${params.id}/dashboard`} />}
      </Route>
      
      <Route path="/projects/:id/dashboard" component={ProjectDashboard} />
      <Route path="/projects/:id/signals" component={ProjectSignals} />
      <Route path="/projects/:id/keywords" component={ProjectKeywords} />
      <Route path="/projects/:id/sources" component={ProjectSources} />
      
      <Route path="/admin/engine-types" component={AdminEngineTypes} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
