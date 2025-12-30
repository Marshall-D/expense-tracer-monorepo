// packages/client/src/pages/categories/CategoryForm.tsx

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category } from "@/types/categories";

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

  // If editing a global category, do not allow changing it in the UI (server will also prevent)
  const isGlobal = initial?.type === "Global";

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    if (isGlobal) {
      setError("Global categories cannot be edited.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), color });
    } catch (err: any) {
      setError(err?.message ?? "Failed");
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
        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isGlobal}
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
                disabled={isGlobal}
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
            >
              {loading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
