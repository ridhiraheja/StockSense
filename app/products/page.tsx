"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { TableSkeleton, Alert } from "@/components/ui";
import { Product, Category, Warehouse, Location, StockLevel } from "@/lib/types";
import {
    Plus,
    Search,
    Boxes,
    Filter,
    Edit,
    Trash2,
    Eye,
    PackageCheck,
    Warehouse as WarehouseIcon,
    Layers,
    X,
} from "lucide-react";

interface ProductWithDetails extends Product {
    category?: Category;
    stock_levels?: (StockLevel & { location?: Location & { warehouse?: Warehouse } })[];
    calculated_stock?: number;
    stock_status?: "In Stock" | "Low Stock" | "Out of Stock";
}

export default function ProductsPage() {
    const [products, setProducts] = useState<ProductWithDetails[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedStockStatus, setSelectedStockStatus] = useState<string>("all");

    // Edit modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editName, setEditName] = useState("");
    const [editSku, setEditSku] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editUom, setEditUom] = useState("Units");
    const [editDescription, setEditDescription] = useState("");
    const [editActive, setEditActive] = useState(true);

    // Detail modal
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [viewingProduct, setViewingProduct] = useState<ProductWithDetails | null>(null);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadProductsData = async () => {
        setLoading(true);
        try {
            // 1. Fetch categories
            const { data: cats } = await supabase
                .from("categories")
                .select("*")
                .order("name", { ascending: true });
            setCategories(cats || []);

            // 2. Fetch warehouses
            const { data: whs } = await supabase
                .from("warehouses")
                .select("*")
                .order("name", { ascending: true });
            setWarehouses(whs || []);

            // 3. Fetch products
            const { data: prods, error: prodError } = await supabase
                .from("products")
                .select("*, category:categories(*)")
                .order("created_at", { ascending: false });

            if (prodError) throw prodError;

            // 4. Fetch stock levels
            const { data: stocks, error: stockError } = await supabase
                .from("stock_levels")
                .select("*, location:locations(*, warehouse:warehouses(*))");

            if (stockError) throw stockError;

            // 5. Fetch reorder rules
            const { data: rules } = await supabase.from("reorder_rules").select("*");

            const enriched: ProductWithDetails[] = (prods || []).map((p) => {
                const pStocks = (stocks || []).filter((s) => s.product_id === p.id);
                const totalStock = pStocks.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
                const pRule = (rules || []).find((r) => r.product_id === p.id);
                const minQty = pRule ? Number(pRule.min_quantity) : 5;

                let stockStatus: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
                if (totalStock <= 0) {
                    stockStatus = "Out of Stock";
                } else if (totalStock <= minQty) {
                    stockStatus = "Low Stock";
                }

                return {
                    ...p,
                    stock_levels: pStocks as any,
                    calculated_stock: totalStock,
                    stock_status: stockStatus,
                };
            });

            setProducts(enriched);
        } catch (err: unknown) {
            console.error("Error loading products:", err);
            const message = err instanceof Error ? err.message : "Failed to load products";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProductsData();
    }, []);

    const openEditModal = (p: ProductWithDetails) => {
        setEditingProduct(p);
        setEditName(p.name);
        setEditSku(p.sku);
        setEditCategory(p.category_id || "");
        setEditUom(p.unit_of_measure || "Units");
        setEditDescription(p.description || "");
        setEditActive(p.is_active);
        setError("");
        setEditModalOpen(true);
    };

    const openDetailModal = (p: ProductWithDetails) => {
        setViewingProduct(p);
        setDetailModalOpen(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        if (!editName.trim() || !editSku.trim()) {
            setError("Name and SKU are required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const { error: updateError } = await supabase
                .from("products")
                .update({
                    name: editName.trim(),
                    sku: editSku.trim().toUpperCase(),
                    category_id: editCategory || null,
                    unit_of_measure: editUom.trim() || "Units",
                    description: editDescription.trim() || null,
                    is_active: editActive,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", editingProduct.id);

            if (updateError) throw updateError;

            setSuccessMessage("Product updated successfully.");
            setEditModalOpen(false);
            loadProductsData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error updating product:", err);
            const message = err instanceof Error ? err.message : "Failed to update product";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (p: ProductWithDetails) => {
        if (!confirm(`Are you sure you want to permanently delete product "${p.name}" (${p.sku})?`)) {
            return;
        }

        try {
            const { error: delError } = await supabase
                .from("products")
                .delete()
                .eq("id", p.id);

            if (delError) throw delError;

            setSuccessMessage(`Product "${p.name}" was deleted successfully.`);
            loadProductsData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error deleting product:", err);
            const message = err instanceof Error ? err.message : "Unable to delete product (it may be referenced in moves or orders).";
            alert(message);
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.category?.name && p.category.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
            selectedCategory === "all" || p.category_id === selectedCategory;

        const matchesStock =
            selectedStockStatus === "all" || p.stock_status === selectedStockStatus;

        return matchesSearch && matchesCategory && matchesStock;
    });

    return (
        <AppLayout
            title="Product Catalog"
            description="Manage inventory items, SKUs, category classifications, and real-time on-hand balances."
            actions={
                <Link
                    href="/products/new"
                    className="ss-button ss-button-primary"
                >
                    <Plus size={16} />
                    Add Product
                </Link>
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

            {/* Filter & Search Bar */}
            <div className="ss-card p-4 mb-6 flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-64">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search by SKU, product name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ss-input !pl-9"
                        />
                    </div>

                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="ss-select w-full sm:w-44"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedStockStatus}
                        onChange={(e) => setSelectedStockStatus(e.target.value)}
                        className="ss-select w-full sm:w-40"
                    >
                        <option value="all">All Stock Status</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                    </select>
                </div>

                <div className="text-xs text-slate-500 font-medium whitespace-nowrap self-end sm:self-center">
                    Showing <span className="font-bold text-slate-900">{filteredProducts.length}</span> of{" "}
                    {products.length} products
                </div>
            </div>

            {/* Products Table */}
            {loading ? (
                <TableSkeleton rows={6} columns={6} />
            ) : filteredProducts.length === 0 ? (
                <EmptyState
                    icon={Boxes}
                    title="No products found"
                    description={
                        searchQuery || selectedCategory !== "all" || selectedStockStatus !== "all"
                            ? "No products match your current search and filter criteria."
                            : "Add your first product to start managing inventory."
                    }
                    actionLabel="Add Product"
                    actionHref="/products/new"
                />
            ) : (
                <div className="ss-table-wrapper">
                    <table className="ss-table">
                        <thead>
                            <tr>
                                <th>Product & SKU</th>
                                <th>Category</th>
                                <th>Unit</th>
                                <th>Stock Level</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                <Boxes size={16} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-900 block leading-tight">
                                                    {p.name}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-400">
                                                    {p.sku}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-slate-600">
                                            {p.category?.name || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-slate-500 text-xs">
                                            {p.unit_of_measure || "Units"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-900 font-mono text-sm">
                                                {p.calculated_stock}
                                            </span>
                                            <span className="text-slate-400 text-xs">
                                                {p.unit_of_measure}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <StatusBadge
                                            status={p.stock_status || "In Stock"}
                                            type="stock"
                                        />
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openDetailModal(p)}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                                title="View Stock Breakdown"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(p)}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                                title="Edit Product"
                                            >
                                                <Edit size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(p)}
                                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                                title="Delete Product"
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

            {/* DETAIL MODAL: Multi-location Stock Breakdown */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={viewingProduct ? `${viewingProduct.name} (${viewingProduct.sku})` : "Product Details"}
                description="Warehouse distribution and location-level inventory quantities."
            >
                {viewingProduct && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                            <div>
                                <span className="text-slate-400 block font-medium">Category</span>
                                <span className="font-semibold text-slate-800">
                                    {viewingProduct.category?.name || "Unassigned"}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Unit of Measure</span>
                                <span className="font-semibold text-slate-800">
                                    {viewingProduct.unit_of_measure}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Total On Hand</span>
                                <span className="font-bold text-slate-900 font-mono text-sm">
                                    {viewingProduct.calculated_stock} {viewingProduct.unit_of_measure}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Catalog Status</span>
                                <span className="font-semibold text-slate-800">
                                    {viewingProduct.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>

                        {viewingProduct.description && (
                            <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-1">Description:</span>
                                {viewingProduct.description}
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Location Stock Breakdown
                            </h4>
                            {(!viewingProduct.stock_levels || viewingProduct.stock_levels.length === 0) ? (
                                <p className="text-xs text-slate-400 p-4 text-center border border-dashed border-slate-200 rounded-lg">
                                    No stock allocated to any warehouse location yet.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {viewingProduct.stock_levels.map((sl) => (
                                        <div
                                            key={sl.id}
                                            className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <WarehouseIcon size={15} className="text-slate-400" />
                                                <div>
                                                    <span className="font-semibold text-slate-900 block">
                                                        {sl.location?.warehouse?.name || "Warehouse"}
                                                    </span>
                                                    <span className="text-slate-500 text-[11px]">
                                                        Zone: {sl.location?.name} ({sl.location?.code})
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-mono font-bold text-slate-900 text-sm">
                                                {sl.quantity} {viewingProduct.unit_of_measure}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setDetailModalOpen(false)}
                                className="ss-button ss-button-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* EDIT PRODUCT MODAL */}
            <Modal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Edit Product"
                description="Update catalog specifications and metadata."
            >
                <form onSubmit={handleSaveEdit} className="space-y-4">
                    {error && (
                        <Alert type="error" className="mb-2">
                            {error}
                        </Alert>
                    )}

                    <div>
                        <label className="ss-label">
                            Product Name <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                            className="ss-input"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="ss-label">
                                SKU / Code <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                value={editSku}
                                onChange={(e) => setEditSku(e.target.value)}
                                required
                                className="ss-input uppercase font-mono"
                            />
                        </div>

                        <div>
                            <label className="ss-label">Category</label>
                            <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="ss-select"
                            >
                                <option value="">No Category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="ss-label">Unit of Measure</label>
                            <input
                                type="text"
                                value={editUom}
                                onChange={(e) => setEditUom(e.target.value)}
                                className="ss-input"
                            />
                        </div>

                        <div>
                            <label className="ss-label">Active Status</label>
                            <select
                                value={editActive ? "true" : "false"}
                                onChange={(e) => setEditActive(e.target.value === "true")}
                                className="ss-select"
                            >
                                <option value="true">Active in Catalog</option>
                                <option value="false">Archived / Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="ss-label">Description</label>
                        <textarea
                            rows={3}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="ss-textarea"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="ss-button ss-button-primary"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
