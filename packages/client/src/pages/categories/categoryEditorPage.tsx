// packages/client/src/pages/categories/CategoryEditorPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ROUTES from "@/utils/routes";
import type { Category } from "@/types/categories";
import { Button } from "@/components/ui/button";
import * as categoryService from "@/services/categoryService";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import CategoryForm from "./categoryForm";
import InfoModal from "@/components/ui/infoModal";
import { t } from "@/lib/toast";

export default function CategoryEditorPage(): JSX.Element {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [initial, setInitial] = useState<Partial<Category> | undefined>(
    undefined
  );
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal state for delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) {
      setInitial(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    categoryService
      .getCategory(id)
      .then((cat) => {
        if (!mounted) return;
        setInitial(cat);
      })
      .catch((err: any) => {
        console.error(err);
        if (mounted) setError(err?.message ?? "Failed to load category");
        t.error(
          err?.friendlyMessage ?? err?.message ?? "Failed to load category"
        );
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [id]);

  const invalidateCategories = async () => {
    await qc.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === queryKeys.categories,
    });
  };

  const handleSubmit = async (payload: any) => {
    setError(null);
    setSaving(true);
    try {
      if (isNew) {
        await categoryService.createCategory(payload);
        t.success("Category created");
      } else {
        if (!id) throw new Error("Missing id");
        await categoryService.updateCategory(id, payload);
        t.success("Category updated");
      }

      // ensure categories list refetches immediately
      await invalidateCategories();
      navigate(ROUTES.CATEGORIES);
    } catch (rawErr: any) {
      // service throws normalized errors
      const err = rawErr || {};
      const friendly =
        err.friendlyMessage ??
        err.serverMessage ??
        err.message ??
        "Save failed";
      setError(friendly);
      t.error(friendly, { duration: 7000 });

      // if server pointed to a field, we leave the form to focus it (CategoryForm will also focus)
      // don't rethrow
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await categoryService.deleteCategory(id);
      t.success("Category deleted");
      await invalidateCategories();
      navigate(ROUTES.CATEGORIES);
    } catch (rawErr: any) {
      const err = rawErr || {};
      const friendly =
        err.friendlyMessage ??
        err.serverMessage ??
        err.message ??
        "Delete failed";
      setError(friendly);
      t.error(friendly, { duration: 7000 });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) return <div>Loading category…</div>;
  if (!isNew && error)
    return <div className="text-sm text-destructive">Error: {error}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? "New Category" : "Edit Category"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? "Create a new category to organize your expenses."
              : "Update category details."}
          </p>
        </div>

        {!isNew && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.CATEGORIES)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <CategoryForm
        initial={initial ?? undefined}
        submitLabel={isNew ? "Create Category" : "Save Changes"}
        onSubmit={handleSubmit}
      />

      <InfoModal
        open={deleteModalOpen}
        title="Delete category?"
        message="Deleting this category is permanent. Expenses already created with this category will not be deleted. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
