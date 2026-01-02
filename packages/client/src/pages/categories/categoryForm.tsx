// packages/client/src/pages/categories/CategoryForm.tsx
import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category } from "@/types/categories";
import { t } from "@/lib/toast";

type Props = {
  initial?: Partial<Category>;
  onSubmit: (payload: any) => Promise<void>;
  submitLabel?: string;
};

export default function CategoryForm({
  initial = {},
  onSubmit,
  submitLabel = "Save",
}: Props) {
  const [name, setName] = useState(initial.name ?? "");
  const [color, setColor] = useState(initial.color ?? "#60a5fa");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement | null>(null);

  // If editing a global category, do not allow changing it in the UI (server will also prevent)
  const isGlobal = initial?.type === "Global";
  // inside CategoryForm.tsx (only the handle function changed)
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      const msg = "Name required";
      setError(msg);
      nameRef.current?.focus();
      return;
    }
    if (isGlobal) {
      const msg = "Global categories cannot be edited.";
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      // IMPORTANT: do NOT show toasts here. Delegate success toast to parent.
      await onSubmit({ name: trimmed, color });
      // leave success handling to the parent (which performs the API call).
    } catch (err: any) {
      // err is expected to be the normalized error object from the service
      const friendly =
        err?.friendlyMessage ?? err?.serverMessage ?? err?.message ?? "Failed";
      setError(friendly);

      // focus the field if the server told us which field is problematic
      if (err?.field === "name") {
        nameRef.current?.focus();
      }

      // rethrow so the caller (parent) can show a toast / handle global errors
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{submitLabel} category</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handle} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isGlobal || loading}
            />
            {isGlobal && (
              <div className="text-sm text-muted-foreground mt-1">
                Global category (cannot be edited)
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="color">Color</Label>
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 rounded-md"
                disabled={isGlobal || loading}
              />
            </div>
            <div>
              <Label>Type</Label>
              <div className="h-10 px-3 rounded-md flex items-center border border-border/20">
                <span className="text-sm">{initial?.type ?? "Custom"}</span>
              </div>
            </div>
          </div>

          {error && <div className="text-destructive text-sm">{error}</div>}

          <div>
            <Button
              type="submit"
              className="rounded-full"
              disabled={loading || isGlobal}
              aria-busy={loading}
            >
              {loading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
