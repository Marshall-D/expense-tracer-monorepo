// packages/client/src/components/ui/infoModal.tsx

import React from "react";
import { Button } from "@/components";

/**
 * Simple, reusable information/confirmation modal.
 * - `open` controls visibility
 * - `title` & `message` are shown to the user
 * - `onConfirm` and `onCancel` are callbacks
 * - `confirmLabel` / `cancelLabel` default to "Confirm" / "Cancel"
 *
 * This is intentionally lightweight so you can style/replace with
 * a design-system Dialog later.
 */
type Props = {
  open: boolean;
  title?: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function InfoModal({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    // overlay
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />
      <div className="relative z-10 w-full max-w-md bg-card/90 border border-border/30 rounded-lg p-4 shadow-lg">
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="text-sm text-muted-foreground mb-4">{message}</div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm()}
            disabled={loading}
            className="rounded-md"
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
