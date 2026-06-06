import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Upload,
  LayoutDashboard,
  BarChart3,
  RotateCcw,
  GitCompare,
  Presentation,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { setPredictions, usePredictions } from "@/lib/predictions-store";
import {
  togglePresentationMode,
  usePresentationMode,
} from "@/lib/presentation-mode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Upload", icon: Upload, key: "U" },
  { to: "/overview", label: "Overview", icon: LayoutDashboard, key: "O" },
  { to: "/metrics", label: "Metrics", icon: BarChart3, key: "M" },
  { to: "/compare", label: "Compare", icon: GitCompare, key: "C" },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const data = usePredictions();
  const navigate = useNavigate();
  const presentation = usePresentationMode();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      const match = nav.find((n) => n.key.toLowerCase() === key);
      if (match) {
        e.preventDefault();
        navigate({ to: match.to });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {!presentation && (
        <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
          <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
            <span className="text-sm font-semibold tracking-tight">Model Eval</span>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {nav.map(({ to, label, icon: Icon, key }) => {
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
                  <span className="flex-1">{label}</span>
                  <kbd
                    className={cn(
                      "ml-auto inline-flex items-center justify-center rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-mono",
                      active ? "text-muted-foreground" : "text-muted-foreground/70",
                    )}
                  >
                    {key}
                  </kbd>
                </Link>
              );
            })}
          </nav>
        </aside>
      )}
      <div className="flex-1 min-w-0 flex flex-col relative">
        <header className="h-14 shrink-0 border-b border-border flex items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight">EvalKit</span>
          <div className="flex items-center gap-2">
            {!presentation && data && (
              <Link
                to="/"
                onClick={() => setPredictions(null)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Upload new file
              </Link>
            )}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={togglePresentationMode}
                    aria-pressed={presentation}
                    aria-label="Presentation mode"
                    className={cn(
                      "inline-flex items-center justify-center h-8 w-8 rounded-md border text-foreground transition-colors",
                      presentation
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <Presentation className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Presentation mode</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
        {!presentation && (
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
        )}
        {presentation && (
          <div className="pointer-events-none fixed bottom-4 right-6 text-[11px] text-muted-foreground/70 font-mono tracking-tight select-none">
            Model Insights · github.com/Ares19v
          </div>
        )}
      </div>
    </div>
  );
}
