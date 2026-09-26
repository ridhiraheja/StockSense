"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Category, Warehouse, Location } from "@/lib/types";
import { ArrowLeft, CheckCircle, AlertCircle, Boxes, Plus } from "lucide-react";

export default function NewProductPage() {
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);

    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [unitOfMeasure, setUnitOfMeasure] = useState("Units");
    const [description, setDescription] = useState("");
    const [initialStock, setInitialStock] = useState<number>(0);
    const [warehouseId, setWarehouseId] = useState("");
    const [locationId, setLocationId] = useState("");
    const [minStockRule, setMinStockRule] = useState<number>(5);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const loadInitialData = async () => {
            const { data: cats } = await supabase
                .from("categories")
                .select("*")
                .order("name", { ascending: true });
            setCategories(cats || []);

            const { data: whs } = await supabase
                .from("warehouses")
                .select("*")
                .eq("is_active", true)
                .order("name", { ascending: true });
            setWarehouses(whs || []);

            const { data: locs } = await supabase
                .from("locations")
                .select("*")
                .eq("is_active", true)
                .order("name", { ascending: true });
            setLocations(locs || []);

            if (whs && whs.length > 0) {
                setWarehouseId(whs[0].id);
                const matchingLocs = (locs || []).filter((l) => l.warehouse_id === whs[0].id);
                if (matchingLocs.length > 0) {
                    setLocationId(matchingLocs[0].id);
                }
            }
        };

        loadInitialData();
    }, []);

    const handleWarehouseChange = (wId: string) => {
        setWarehouseId(wId);
        const matchingLocs = locations.filter((l) => l.warehouse_id === wId);
        if (matchingLocs.length > 0) {
            setLocationId(matchingLocs[0].id);
        } else {
            setLocationId("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !sku.trim()) {
            setError("Product Name and SKU are required.");
            return;
        }

        if (initialStock > 0 && !locationId) {
            setError("Please select a location to place the initial stock.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // 1. Get current user
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error("You must be logged in to create a product. Please sign in again.");
            }

            // 2. Insert product
            const { data: newProd, error: prodError } = await supabase
                .from("products")
                .insert({
                    name: name.trim(),
                    sku: sku.trim().toUpperCase(),
                    category_id: categoryId || null,
                    unit_of_measure: unitOfMeasure.trim() || "Units",
                    description: description.trim() || null,
                    is_active: true,
                })
                .select()
                .single();

            if (prodError) throw prodError;

            // 3. Insert Reorder Rule if specified
            if (newProd && minStockRule > 0) {
                await supabase.from("reorder_rules").insert({
                    product_id: newProd.id,
                    location_id: locationId || null,
                    min_quantity: minStockRule,
                    reorder_quantity: minStockRule * 2,
                    is_active: true,
                });
            }

            // 4. If initial stock > 0, set stock_levels and record stock_moves
            if (newProd && initialStock > 0 && locationId) {
                // Upsert stock level
                const { error: stockError } = await supabase
                    .from("stock_levels")
                    .insert({
                        product_id: newProd.id,
                        location_id: locationId,
                        quantity: initialStock,
                    });

                if (stockError) {
                    console.warn("Stock level creation note:", stockError.message);
                }

                // Record stock move
                await supabase.from("stock_moves").insert({
                    product_id: newProd.id,
                    location_id: locationId,
                    quantity: initialStock,
                    move_type: "receipt",
                    reference: `INITIAL-STOCK-${newProd.sku}`,
                    notes: "Initial inventory onboarding",
                    created_by: user.id,
                });
            }

            setSuccessMessage("Product created successfully!");
            setTimeout(() => {
                router.push("/products");
            }, 1200);
        } catch (err: any) {
            console.error("Error creating product:", err);
            const message =
                err?.message ||
                err?.details ||
                err?.error_description ||
                (err instanceof Error ? err.message : "Unable to create product.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const availableLocations = locations.filter((l) => l.warehouse_id === warehouseId);

    return (
        <AppLayout
            title="Add New Product"
            description="Register a new item into your master catalog and optionally allocate initial opening stock."
            actions={
                <Link
                    href="/products"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                    <ArrowLeft size={16} />
                    Back to Products
                </Link>
            }
        >
            <div className="max-w-3xl mx-auto">
                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-3">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-3">
                        <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
                    {/* General Information Section */}
                    <div>
                        <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <Boxes size={18} className="text-blue-600" />
                            General Information
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Product Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ergonomic Office Chair, 10mm Steel Rod"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    SKU / Unique Item Code <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. PROD-CHR-001, STL-ROD-10"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition uppercase font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Category
                                </label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                >
                                    <option value="">Select a Category</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Unit of Measure (UOM)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Units, Pieces, Kg, Meters, Boxes, Packs"
                                    value={unitOfMeasure}
                                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Product Description
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Specifications, dimensions, or details..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                            />
                        </div>
                    </div>

                    {/* Stock & Location Allocation Section */}
                    <div>
                        <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <Boxes size={18} className="text-emerald-600" />
                            Initial Stock & Warehouse Location
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Initial Opening Stock
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={initialStock}
                                    onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Target Warehouse
                                </label>
                                <select
                                    value={warehouseId}
                                    onChange={(e) => handleWarehouseChange(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Storage Zone / Location
                                </label>
                                <select
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                >
                                    <option value="">Select Location</option>
                                    {availableLocations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name} ({l.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Low Stock Alert Threshold (Min Reorder Level)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={minStockRule}
                                onChange={(e) => setMinStockRule(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full sm:w-60 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Triggers a Low Stock warning on the dashboard when total stock drops below this number.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Link
                            href="/products"
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? "Creating..." : "Save Product"}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
