// packages/client/src/pages/landingPage.tsx

import React from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardContent } from "@/components";
import { ArrowRight, Wallet, PieChart, ShieldCheck } from "lucide-react";
import { ROUTES } from "@/utils";

export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <Link
          className="flex items-center justify-center gap-2"
          to={ROUTES.HOME}
        >
          <Wallet className="h-6 w-6 text-primary" />
          <span className="font-bold tracking-tight text-xl">LuxeSpend</span>
        </Link>

        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium hover:text-primary transition-colors"
            to={ROUTES.LOGIN}
          >
            Login
          </Link>
          <Link
            className="text-sm font-medium hover:text-primary transition-colors"
            to={ROUTES.REGISTER}
          >
            Register
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* hero + features — same as your current content */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex flex-col items-center justify-center text-center px-4">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
              Master Your Wealth with{" "}
              <span className="text-primary">Elegance</span>
            </h1>

            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
              A minimalist, sophisticated expense tracker designed for those who
              value clarity and financial freedom.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link to={ROUTES.REGISTER}>
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 bg-transparent"
              >
                <Link to={ROUTES.LOGIN}>Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-card/50 border-border/40 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <PieChart className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">Smart Analytics</h3>
                  <p className="text-muted-foreground">
                    Visualize your spending patterns with intuitive charts and
                    reports.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/40 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                  <p className="text-muted-foreground">
                    Your financial data is encrypted and secure with JWT-based
                    authentication.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/40 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <Wallet className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">Budgeting</h3>
                  <p className="text-muted-foreground">
                    Set custom category budgets and track your progress in
                    real-time.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          © 2025 LuxeSpend Inc. All rights reserved.
        </p>

        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-xs hover:underline underline-offset-4 text-muted-foreground hover:text-foreground"
            to="#"
          >
            Terms of Service
          </Link>
          <Link
            className="text-xs hover:underline underline-offset-4 text-muted-foreground hover:text-foreground"
            to="#"
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
