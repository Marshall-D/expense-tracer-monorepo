// packages/client/src/pages/auth/register.tsx

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils";
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
import { useRegister } from "@/hooks";
import { t } from "@/lib";

export default function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useRegister();
  const { mutateAsync, status } = mutation;
  const isLoading = status === "pending";

  const focusField = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) {
      try {
        el.focus();
        el.select();
      } catch {}
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setFormError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!name || !email || !password) {
      const msg = "All fields are required.";
      setFormError(msg);
      t.error(msg, { duration: 8000 });
      // focus the first missing field
      if (!name) focusField("name");
      else if (!email) focusField("email");
      else focusField("password");
      return;
    }

    try {
      await mutateAsync({ name, email, password });
      // onSuccess toast is handled in useRegister
      navigate(ROUTES.DASHBOARD);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Registration failed";
      setFormError(msg);
      t.error(msg, { duration: 8000 });
      // focus email for correction (server validation likely about email/password)
      focusField("email");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="bg-primary/10 p-3 rounded-full mb-2">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your details to get started with LuxeSpend
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                required
                className="bg-background/50"
              />
            </div>

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
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={ROUTES.LOGIN}
              className="text-primary hover:underline underline-offset-4"
            >
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
