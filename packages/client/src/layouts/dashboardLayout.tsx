// src/layouts/DashboardLayout.tsx
import React, { useState } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import ROUTES from "@/utils/routes";
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
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", to: ROUTES.DASHBOARD, icon: LayoutDashboard },
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
}: {
  to: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
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

export default function DashboardLayout(): JSX.Element {
  const [open, setOpen] = useState(false);

  // close drawer when navigating (mobile)
  const handleNavigate = () => setOpen(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border/40 hidden md:flex flex-col sticky top-0 h-screen bg-card/30 backdrop-blur-md">
        <div className="p-6">
          <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight text-xl">LuxeSpend</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon}>
              {item.name}
            </NavItem>
          ))}
        </nav>

        <div className="p-4 border-t border-border/40">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            asChild
          >
            <Link to={ROUTES.LOGIN}>
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-4 md:px-8 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile: hamburger */}
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
              Welcome back, John Doe
            </p>
            <Button size="sm" className="rounded-full px-4">
              Add Expense
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
            {/* make the panel a column so we can place logout at the bottom naturally */}
            <div className="flex flex-col h-full pb-28">
              {/* header */}
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

              {/* scrollable nav items */}
              <div className="p-4 space-y-1 overflow-auto flex-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    onClick={handleNavigate}
                  >
                    {item.name}
                  </NavItem>
                ))}
              </div>

              {/* logout: placed as a normal block so it's above the bottom nav because of pb-28 */}
              <div className="p-4 border-t border-border/40">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                  asChild
                >
                  <Link to={ROUTES.LOGIN} onClick={handleNavigate}>
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Link>
                </Button>
              </div>
            </div>
          </nav>
        </div>

        {/* Page content */}
        <main className="p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>

        {/* Mobile bottom navigation (visible on small screens) */}
        <nav className="fixed bottom-4 left-4 right-4 md:hidden z-40">
          <div className="mx-auto max-w-3xl bg-card/80 backdrop-blur-md border border-border/40 rounded-full px-2 py-2 flex justify-between items-center shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
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
