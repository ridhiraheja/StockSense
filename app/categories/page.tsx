"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Category } from "@/lib/types";
import { Plus, Search, Tag, Edit, Trash2, CheckCircle, AlertCircle } from "lucide-react";

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

        if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
            return;
        }

        try {
            const { error: delError } = await supabase
                .from("categories")
                .delete()
                .eq("id", cat.id);

            if (delError) throw delError;

            setSuccessMessage(`Category "${cat.name}" deleted successfully.`);
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
            title="Categories"
            description="Organize your inventory catalog with product categories."
            actions={
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    Add Category
                </button>
            }
        >
            {/* Feedback notifications */}
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
                    <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Search and stats bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-80">
                    <Search
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                </div>
                <div className="text-sm font-medium text-slate-500 w-full sm:w-auto text-right">
                    Showing <span className="text-slate-900 font-bold">{filteredCategories.length}</span> categories
                </div>
            </div>

            {/* Categories Table / Grid */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading categories...</p>
                </div>
            ) : filteredCategories.length === 0 ? (
                <EmptyState
                    icon={Tag}
                    title={searchQuery ? "No categories match your search" : "No categories yet"}
                    description={
                        searchQuery
                            ? "Try refining your search query or clear the filter."
                            : "Create your first product category to group and organize your stock items."
                    }
                    actionLabel={searchQuery ? undefined : "Add Category"}
                    onAction={searchQuery ? undefined : openCreateModal}
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Category Name</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-center">Products</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-normal">
                                {filteredCategories.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                    <Tag size={18} />
                                                </div>
                                                <span className="font-semibold text-slate-900">
                                                    {cat.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 max-w-md truncate">
                                            {cat.description || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                                                {cat.products_count} product{cat.products_count === 1 ? "" : "s"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(cat)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Edit Category"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Delete Category"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingCategory ? "Edit Category" : "Add New Category"}
                description="Categorize your items to easily filter reports and track stock."
            >
                <form onSubmit={handleSave} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                            Category Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Raw Materials, Electronics, Office Supplies"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Optional notes or description about this category..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
                        >
                            {saving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
