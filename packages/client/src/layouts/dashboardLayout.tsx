// packages/client/src/layouts/dashboardLayout.tsx
import React, { useState, useEffect } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { ROUTES } from "@/utils";
import {
  Wallet,
  LayoutDashboard,
  ReceiptText,
  Tags,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components";
import { useAuth } from "@/context";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib";
import * as categoryService from "@/services";

// navItems: mark Dashboard with `end: true` so it's only active on exact /dashboard
const navItems = [
  { name: "Dashboard", to: ROUTES.DASHBOARD, icon: LayoutDashboard, end: true },
  { name: "Expenses", to: ROUTES.EXPENSES, icon: ReceiptText },
  { name: "Categories", to: ROUTES.CATEGORIES, icon: Tags },
  { name: "Budgets", to: ROUTES.BUDGETS, icon: Wallet },
  { name: "Reports", to: ROUTES.REPORTS, icon: BarChart3 },
];

function NavItem({
  to,
  icon: Icon,
  children,
  onClick,
  end,
}: {
  to: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  onClick?: () => void;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          isActive
            ? "text-foreground bg-accent/30"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
        }`
      }
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </NavLink>
  );
}

export function DashboardLayout(): JSX.Element {
  const [open, setOpen] = useState(false);
  const handleNavigate = () => setOpen(false);

  const { user, logout } = useAuth();
  const qc = useQueryClient();

  // Prefetch categories once when layout mounts (so Add form is instant)
  useEffect(() => {
    qc.prefetchQuery({
      queryKey: [queryKeys.categories, { includeGlobal: true }],
      queryFn: () => categoryService.fetchCategories(true),
    }).catch(() => {});
    // run on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border/40 hidden md:flex flex-col sticky top-0 h-screen bg-card/30 backdrop-blur-md">
        <div className="p-6">
          <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight text-xl">LuxeSpend</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} end={item.end}>
              {item.name}
            </NavItem>
          ))}
        </nav>

        <div className="p-4 border-t border-border/40">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-4 md:px-8 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold hidden md:inline">LuxeSpend</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground hidden md:block">
              Welcome back, {user?.name ?? "Guest"}
            </p>

            {/* Add Expense -> prefetch categories on hover for extra speed */}
            <Button asChild size="sm" className="rounded-full px-4">
              <Link
                to={ROUTES.EXPENSES_NEW}
                onMouseEnter={() =>
                  qc.prefetchQuery({
                    queryKey: [queryKeys.categories, { includeGlobal: true }],
                    queryFn: () => categoryService.fetchCategories(true),
                  })
                }
              >
                Add Expense
              </Link>
            </Button>
          </div>
        </header>

        {/* Off-canvas mobile drawer */}
        <div
          aria-hidden={!open}
          className={`fixed inset-0 z-40 md:hidden transition-opacity ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpen(false)}
          />

          {/* panel */}
          <nav
            className={`absolute left-0 top-0 bottom-0 w-72 bg-card/90 backdrop-blur-md border-r border-border/40 transform transition-transform ${
              open ? "translate-x-0" : "-translate-x-full"
            }`}
            aria-label="Mobile menu"
          >
            <div className="flex flex-col h-full pb-28">
              <div className="p-4 flex items-center justify-between border-b border-border/40">
                <Link
                  to={ROUTES.DASHBOARD}
                  onClick={handleNavigate}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-6 w-6 text-primary" />
                  <span className="font-bold tracking-tight text-lg">
                    LuxeSpend
                  </span>
                </Link>
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-1 overflow-auto flex-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    onClick={handleNavigate}
                    end={item.end}
                  >
                    {item.name}
                  </NavItem>
                ))}
              </div>

              <div className="p-4 border-t border-border/40">
                {/* Mobile logout */}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </nav>
        </div>

        <main className="p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>

        <nav className="fixed bottom-4 left-4 right-4 md:hidden z-40">
          <div className="mx-auto max-w-3xl bg-card/80 backdrop-blur-md border border-border/40 rounded-full px-2 py-2 flex justify-between items-center shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex-1 flex flex-col items-center justify-center text-xs gap-1 py-1 px-2 rounded-full transition-colors ${
                      isActive
                        ? "text-foreground bg-accent/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                  aria-label={item.name}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:block text-[11px]">
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
