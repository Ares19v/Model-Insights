import { Link, useRouterState } from "@tanstack/react-router";
import { Upload, LayoutDashboard, BarChart3, RotateCcw, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { setPredictions, usePredictions } from "@/lib/predictions-store";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Upload", icon: Upload },
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/metrics", label: "Metrics", icon: BarChart3 },
  { to: "/compare", label: "Compare", icon: GitCompare },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const data = usePredictions();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
          <span className="text-sm font-semibold tracking-tight">Model Eval</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 border-b border-border flex items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight">EvalKit</span>
          {data && (
            <Link
              to="/"
              onClick={() => setPredictions(null)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Upload new file
            </Link>
          )}
        </header>
        <main className="flex-1 min-w-0">{children}</main>
        <footer className="shrink-0 border-t border-border px-6 py-3">
          <a
            href="https://github.com/Ares19v"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            github.com/Ares19v
          </a>
        </footer>
      </div>
    </div>
  );
}
