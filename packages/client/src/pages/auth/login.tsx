// packages/client/src/pages/auth/login.tsx

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components";
import { Wallet } from "lucide-react";
import { ROUTES } from "@/utils";
import { useLogin } from "@/hooks";
import { t } from "@/lib";

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useLogin();
  const { mutateAsync, status } = mutation;
  const isLoading = status === "pending";

  const focusEmail = () => {
    const el = document.getElementById("email") as HTMLInputElement | null;
    if (el) {
      try {
        el.focus();
        el.select();
      } catch {}
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    // stronger prevention to avoid accidental navigation/refresh from default behaviour
    e.preventDefault();
    e.stopPropagation();

    setFormError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      const msg = "Email and password are required.";
      setFormError(msg);
      // show longer toast so user sees it
      t.error(msg, { duration: 8000 });
      focusEmail();
      return;
    }

    try {
      await mutateAsync({ email, password });
      // useLogin.onSuccess shows success toast centrally; just navigate
      navigate(ROUTES.DASHBOARD);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";
      setFormError(msg);
      // show toast with longer duration so user can read it
      t.error(msg, { duration: 8000 });
      focusEmail();
      // do not rethrow or navigate
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="bg-primary/10 p-3 rounded-full mb-2">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your email to sign in to your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-background/50"
              />
            </div>

            {formError && (
              <div className="text-sm text-destructive" role="alert">
                {formError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to={ROUTES.REGISTER}
              className="text-primary hover:underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
