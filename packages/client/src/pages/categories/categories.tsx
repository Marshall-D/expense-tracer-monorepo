// packages/client/src/pages/categories/categories.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Tags, Trash2 } from "lucide-react";
import ROUTES from "@/utils/routes";
import { useCategories } from "@/hooks/useCategories";
import * as categoryService from "@/services/categoryService";
import InfoModal from "@/components/ui/infoModal";
import { t } from "@/lib/toast";

export default function CategoriesPage() {
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useCategories(true);

  const [deleting, setDeleting] = useState<string | null>(null);

  // modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // when user clicks the trash icon, open modal instead of confirm()
  const requestDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteModalOpen(true);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleting(id);
    try {
      await categoryService.deleteCategory(id);
      t.success(`Category "${name}" deleted`);
      // refresh categories
      await refetch();
    } catch (rawErr: any) {
      const err = rawErr || {};
      const friendly =
        err.friendlyMessage ??
        err.serverMessage ??
        err.message ??
        "Delete failed";
      console.error("delete category failed", rawErr);
      t.error(friendly, { duration: 7000 });
    } finally {
      setDeleting(null);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  // Partition categories so global ones are shown first
  const globalCategories = categories.filter((c) => c.type === "Global");
  const customCategories = categories.filter((c) => c.type !== "Global");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage spending classifications and custom labels.
          </p>
        </div>

        <Button asChild size="sm" className="rounded-full gap-2">
          <Link to={ROUTES.CATEGORIES_NEW}>
            <Plus className="h-4 w-4" /> New Category
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div>Loading categories…</div>
      ) : isError ? (
        <div className="text-destructive">Failed to load categories.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Render global categories first (no Edit button) */}
          {globalCategories.map((category) => (
            <Card
              key={category.id}
              className="border-border/40 bg-card/40 hover:border-primary/40 transition-all group overflow-hidden"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50"
                    style={{ color: category.color ?? undefined }}
                  >
                    <Tags className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {category.type}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0">
                <h3 className="text-lg font-bold mt-2">{category.name}</h3>

                {/* Global categories: no edit, no delete */}
                <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-sm text-muted-foreground">Provided</div>
                </div>
              </CardContent>

              <div
                className="h-1 w-full"
                style={{ backgroundColor: category.color ?? undefined }}
              />
            </Card>
          ))}

          {/* Then render user's custom categories */}
          {customCategories.map((category) => (
            <Card
              key={category.id}
              className="border-border/40 bg-card/40 hover:border-primary/40 transition-all group overflow-hidden"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50"
                    style={{ color: category.color ?? undefined }}
                  >
                    <Tags className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {category.type}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0">
                <h3 className="text-lg font-bold mt-2">{category.name}</h3>

                <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Edit only for custom categories */}
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-lg flex-1 text-xs"
                  >
                    <Link to={ROUTES.CATEGORIES_BY_ID(category.id)}>Edit</Link>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive rounded-lg"
                    onClick={() => requestDelete(category.id, category.name)}
                    disabled={deleting === category.id}
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>

              <div
                className="h-1 w-full"
                style={{ backgroundColor: category.color ?? undefined }}
              />
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      <InfoModal
        open={deleteModalOpen}
        title={
          deleteTarget ? `Delete "${deleteTarget.name}"?` : "Delete category?"
        }
        message="Deleting this category is permanent. Expenses already created with this category will not be deleted. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={Boolean(deleting)}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={performDelete}
      />
    </div>
  );
}
