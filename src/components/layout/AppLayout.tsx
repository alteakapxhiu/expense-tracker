import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, LayoutDashboard, Table2, Tags, LogOut, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const navCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-sidebar-accent-foreground">Ledgerly</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          <NavLink to="/" end className={navCls}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </NavLink>
          <NavLink to="/year" className={navCls}>
            <Table2 className="h-4 w-4" /> Year grid
          </NavLink>
          <NavLink to="/categories" className={navCls}>
            <Tags className="h-4 w-4" /> Categories
          </NavLink>
          <NavLink to="/budgets" className={navCls}>
            <Target className="h-4 w-4" /> Budgets
          </NavLink>
        </nav>
        <div className="mt-4 pt-4 border-t border-sidebar-border">
          <div className="px-2 mb-2">
            <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-primary flex items-center justify-center">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Ledgerly</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <main className="flex-1 overflow-x-hidden pt-16 md:pt-0">
        <Outlet />
        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border grid grid-cols-4 px-2 py-2">
          <NavLink to="/" end className={({ isActive }) => cn("flex flex-col items-center gap-1 py-1 text-xs", isActive ? "text-primary" : "text-sidebar-foreground")}>
            <LayoutDashboard className="h-4 w-4" /> Dash
          </NavLink>
          <NavLink to="/year" className={({ isActive }) => cn("flex flex-col items-center gap-1 py-1 text-xs", isActive ? "text-primary" : "text-sidebar-foreground")}>
            <Table2 className="h-4 w-4" /> Year
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => cn("flex flex-col items-center gap-1 py-1 text-xs", isActive ? "text-primary" : "text-sidebar-foreground")}>
            <Tags className="h-4 w-4" /> Cats
          </NavLink>
          <NavLink to="/budgets" className={({ isActive }) => cn("flex flex-col items-center gap-1 py-1 text-xs", isActive ? "text-primary" : "text-sidebar-foreground")}>
            <Target className="h-4 w-4" /> Budget
          </NavLink>
        </nav>
        <div className="md:hidden h-16" />
      </main>
    </div>
  );
}
