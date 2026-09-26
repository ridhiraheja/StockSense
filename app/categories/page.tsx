"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Alert, TableSkeleton } from "@/components/ui";
import { Category } from "@/lib/types";
import { Plus, Search, Tag, Edit, Trash2 } from "lucide-react";

interface CategoryWithCount extends Category {
    products_count?: number;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadCategories = async () => {
        setLoading(true);
        try {
            const { data: catData, error: catError } = await supabase
                .from("categories")
                .select("*")
                .order("name", { ascending: true });

            if (catError) throw catError;

            // Fetch product counts for each category
            const { data: prodData, error: prodError } = await supabase
                .from("products")
                .select("category_id");

            if (prodError) throw prodError;

            const counts: Record<string, number> = {};
            prodData?.forEach((p) => {
                if (p.category_id) {
                    counts[p.category_id] = (counts[p.category_id] || 0) + 1;
                }
            });

            const enriched = (catData || []).map((cat) => ({
                ...cat,
                products_count: counts[cat.id] || 0,
            }));

            setCategories(enriched);
        } catch (err: unknown) {
            console.error("Error loading categories:", err);
            const message = err instanceof Error ? err.message : "Failed to load categories";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const openCreateModal = () => {
        setEditingCategory(null);
        setName("");
        setDescription("");
        setError("");
        setModalOpen(true);
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setName(cat.name);
        setDescription(cat.description || "");
        setError("");
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Category name is required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            if (editingCategory) {
                const { error: updateError } = await supabase
                    .from("categories")
                    .update({
                        name: name.trim(),
                        description: description.trim() || null,
                    })
                    .eq("id", editingCategory.id);

                if (updateError) throw updateError;
                setSuccessMessage("Category updated successfully.");
            } else {
                const { error: insertError } = await supabase
                    .from("categories")
                    .insert({
                        name: name.trim(),
                        description: description.trim() || null,
                    });

                if (insertError) throw insertError;
                setSuccessMessage("Category created successfully.");
            }

            setModalOpen(false);
            loadCategories();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error saving category:", err);
            const message = err instanceof Error ? err.message : "Unable to save category.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cat: CategoryWithCount) => {
        if (cat.products_count && cat.products_count > 0) {
            alert(
                `Cannot delete category "${cat.name}" because it is currently assigned to ${cat.products_count} product(s). Reassign or delete those products first.`
            );
            return;
        }

        if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

        try {
            const { error: delError } = await supabase
                .from("categories")
                .delete()
                .eq("id", cat.id);

            if (delError) throw delError;

            setSuccessMessage(`Category "${cat.name}" deleted.`);
            loadCategories();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error deleting category:", err);
            const message = err instanceof Error ? err.message : "Unable to delete category.";
            alert(message);
        }
    };

    const filteredCategories = categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <AppLayout
            title="Product Categories"
            description="Organize catalog items by classification, materials, departments, or families."
            actions={
                <button
                    onClick={openCreateModal}
                    className="ss-button ss-button-primary"
                >
                    <Plus size={16} />
                    Add Category
                </button>
            }
        >
            {error && (
                <Alert type="error" className="mb-6">
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert type="success" className="mb-6">
                    {successMessage}
                </Alert>
            )}

            {/* Filter Bar */}
            <div className="ss-card p-4 mb-6 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="relative w-full sm:w-72">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ss-input !pl-9"
                    />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    {filteredCategories.length} {filteredCategories.length === 1 ? "Category" : "Categories"} registered
                </span>
            </div>

            {/* Categories Table */}
            {loading ? (
                <TableSkeleton rows={5} columns={4} />
            ) : filteredCategories.length === 0 ? (
                <EmptyState
                    icon={Tag}
                    title="No categories found"
                    description={
                        searchQuery
                            ? "No categories match your search."
                            : "Create your first category to group related items."
                    }
                    actionLabel="Add Category"
                    onAction={openCreateModal}
                />
            ) : (
                <div className="ss-table-wrapper">
                    <table className="ss-table">
                        <thead>
                            <tr>
                                <th>Category Name</th>
                                <th>Description</th>
                                <th>Assigned Products</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Tag size={14} />
                                            </div>
                                            <span className="font-semibold text-slate-900">
                                                {c.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-slate-600 text-xs">
                                            {c.description || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                            {c.products_count || 0} items
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(c)}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                                title="Edit Category"
                                            >
                                                <Edit size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c)}
                                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                                title="Delete Category"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CATEGORY MODAL */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingCategory ? "Edit Category" : "Add New Category"}
                description="Taxonomy name and classification details."
            >
                <form onSubmit={handleSave} className="space-y-4">
                    {error && (
                        <Alert type="error" className="mb-2">
                            {error}
                        </Alert>
                    )}

                    <div>
                        <label className="ss-label">
                            Category Name <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Raw Materials, Electronics, Office Supplies"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="ss-input"
                        />
                    </div>

                    <div>
                        <label className="ss-label">Description</label>
                        <textarea
                            rows={3}
                            placeholder="Brief description of items falling under this category..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="ss-textarea"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="ss-button ss-button-primary"
                        >
                            {saving ? "Saving..." : "Save Category"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
