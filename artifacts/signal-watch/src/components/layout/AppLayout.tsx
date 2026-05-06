import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ActivitySquare, 
  Tags, 
  Database,
  Settings,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  projectId?: string;
}

export function AppLayout({ children, projectId }: AppLayoutProps) {
  const [location] = useLocation();

  const navItems = projectId ? [
    { name: "Dashboard", href: `/projects/${projectId}/dashboard`, icon: LayoutDashboard },
    { name: "Signals feed", href: `/projects/${projectId}/signals`, icon: ActivitySquare },
    { name: "Keywords", href: `/projects/${projectId}/keywords`, icon: Tags },
    { name: "Sources", href: `/projects/${projectId}/sources`, icon: Database },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/projects" className="flex items-center gap-2 text-primary font-bold text-xl">
            <ActivitySquare className="h-6 w-6" />
            SignalWatch
          </Link>
        </div>

        {projectId && (
          <div className="p-4 border-b border-border">
            <Link href="/projects" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="h-4 w-4" />
              Back to Projects
            </Link>
            <h2 className="font-semibold text-foreground truncate">Project Workspace</h2>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}

          {!projectId && (
            <Link href="/projects">
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location === "/projects" || location === "/" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <LayoutDashboard className="h-4 w-4" />
                All Projects
              </div>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <Link href="/admin/engine-types">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
              location.startsWith("/admin") 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <Settings className="h-4 w-4" />
              Admin
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
