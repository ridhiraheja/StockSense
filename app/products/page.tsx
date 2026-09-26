"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { Product, Category, Warehouse, Location, StockLevel } from "@/lib/types";
import {
    Plus,
    Search,
    Boxes,
    Filter,
    Edit,
    Trash2,
    CheckCircle,
    AlertCircle,
    Eye,
    PackageCheck,
    Layers,
    Warehouse as WarehouseIcon,
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

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        if (!editName.trim() || !editSku.trim()) {
            setError("Product Name and SKU are required.");
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
                    unit_of_measure: editUom.trim(),
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
            const message = err instanceof Error ? err.message : "Unable to update product.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (p: ProductWithDetails) => {
        if (!confirm(`Are you sure you want to delete product "${p.name}" (${p.sku})? This will delete associated stock records.`)) {
            return;
        }

        try {
            const { error: delError } = await supabase
                .from("products")
                .delete()
                .eq("id", p.id);

            if (delError) throw delError;

            setSuccessMessage(`Product "${p.name}" deleted.`);
            loadProductsData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error deleting product:", err);
            const message = err instanceof Error ? err.message : "Unable to delete product.";
            alert(message);
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.category?.name && p.category.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
        const matchesStatus =
            selectedStockStatus === "all" ||
            p.stock_status?.toLowerCase() === selectedStockStatus.toLowerCase();

        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <AppLayout
            title="Products Inventory"
            description="Manage your product catalog, SKUs, units of measure, and multi-location stock levels."
            actions={
                <Link
                    href="/products/new"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    Add Product
                </Link>
            }
        >
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
                    <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search by product name, SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    {/* Stock Status Filter */}
                    <select
                        value={selectedStockStatus}
                        onChange={(e) => setSelectedStockStatus(e.target.value)}
                        className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Stock Statuses</option>
                        <option value="in stock">In Stock</option>
                        <option value="low stock">Low Stock</option>
                        <option value="out of stock">Out of Stock</option>
                    </select>
                </div>

                <div className="text-sm font-medium text-slate-500 w-full md:w-auto text-right">
                    Showing <span className="text-slate-900 font-bold">{filteredProducts.length}</span> items
                </div>
            </div>

            {/* Products Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading product inventory...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <EmptyState
                    icon={Boxes}
                    title={searchQuery || selectedCategory !== "all" ? "No products match your filters" : "No products added yet"}
                    description={
                        searchQuery || selectedCategory !== "all"
                            ? "Try adjusting or clearing your search and filter criteria."
                            : "Add your first product with initial stock and location to start tracking operations."
                    }
                    actionLabel={searchQuery || selectedCategory !== "all" ? undefined : "Add First Product"}
                    actionHref="/products/new"
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Product & SKU</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Unit of Measure</th>
                                    <th className="px-6 py-4 text-center">Current Stock</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4">
                                            <div>
                                                <span className="font-semibold text-slate-900 block">
                                                    {p.name}
                                                </span>
                                                <span className="font-mono text-xs text-slate-500">
                                                    SKU: {p.sku}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.category ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                                    {p.category.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Uncategorized</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {p.unit_of_measure || "Units"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-base text-slate-900">
                                                {p.calculated_stock}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-1">
                                                {p.unit_of_measure || "Units"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={p.stock_status || "In Stock"} type="stock" />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setViewingProduct(p);
                                                        setDetailModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="View Location Breakdown"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(p)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Edit Product"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(p)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Delete Product"
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

            {/* View Locations Breakdown Modal */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={viewingProduct ? `${viewingProduct.name} (${viewingProduct.sku})` : "Product Details"}
                description="Warehouse and location zone breakdown for this product."
            >
                {viewingProduct && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Total Stock</p>
                                <p className="text-xl font-bold text-slate-900">
                                    {viewingProduct.calculated_stock} {viewingProduct.unit_of_measure}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Category</p>
                                <p className="text-sm font-semibold text-slate-800">
                                    {viewingProduct.category?.name || "Uncategorized"}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Locations Stored
                            </h4>
                            {viewingProduct.stock_levels && viewingProduct.stock_levels.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {viewingProduct.stock_levels.map((sl) => (
                                        <div
                                            key={sl.id}
                                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 text-sm"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {sl.location?.warehouse?.name || "Warehouse"}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Zone: {sl.location?.name} ({sl.location?.code})
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-blue-600 text-base">
                                                    {sl.quantity}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-1">
                                                    {viewingProduct.unit_of_measure}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No specific stock locations allocated.</p>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setDetailModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Product Modal */}
            <Modal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Edit Product"
                description="Update product attributes and unit metadata."
            >
                <form onSubmit={handleSaveEdit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Product Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                SKU / Item Code <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editSku}
                                onChange={(e) => setEditSku(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Category
                            </label>
                            <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">No Category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Unit of Measure
                            </label>
                            <input
                                type="text"
                                placeholder="Units, Pieces, Kg, Boxes"
                                value={editUom}
                                onChange={(e) => setEditUom(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="editActive"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <label htmlFor="editActive" className="text-sm font-medium text-slate-700">
                            Product is Active
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Update Product"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
