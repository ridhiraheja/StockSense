"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Category, Warehouse, Location } from "@/lib/types";
import { Alert, Button, Card } from "@/components/ui";
import { ArrowLeft, Boxes, Layers, PackagePlus } from "lucide-react";

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

            setSuccessMessage("Product registered successfully! Redirecting...");
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
            title="Register New Product"
            description="Add an item to master catalog and optionally allocate initial opening stock."
            actions={
                <Link
                    href="/products"
                    className="ss-button ss-button-secondary"
                >
                    <ArrowLeft size={16} />
                    Back to Products
                </Link>
            }
        >
            <div className="max-w-3xl mx-auto space-y-6">
                {error && (
                    <Alert type="error">
                        {error}
                    </Alert>
                )}

                {successMessage && (
                    <Alert type="success">
                        {successMessage}
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SECTION 1: Basic Information */}
                    <div className="ss-card p-6">
                        <div className="flex items-center gap-2.5 pb-3.5 mb-5 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Boxes size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Basic Product Information
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Core identifiers and catalog classification.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="ss-label">
                                    Product Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ergonomic Office Chair"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="ss-input"
                                />
                            </div>

                            <div>
                                <label className="ss-label">
                                    SKU / Item Code <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. PROD-CHR-001"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    required
                                    className="ss-input uppercase font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="ss-label">Category</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="ss-select"
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
                                <label className="ss-label">Unit of Measure (UOM)</label>
                                <input
                                    type="text"
                                    placeholder="Units, Pieces, Kg, Boxes, Meters"
                                    value={unitOfMeasure}
                                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                                    className="ss-input"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="ss-label">Description (Optional)</label>
                            <textarea
                                rows={2}
                                placeholder="Specifications, dimensions, or technical notes..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="ss-textarea"
                            />
                        </div>
                    </div>

                    {/* SECTION 2: Inventory & Stock Allocation */}
                    <div className="ss-card p-6">
                        <div className="flex items-center gap-2.5 pb-3.5 mb-5 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <PackagePlus size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Inventory & Storage Allocation
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Initial on-hand quantity and automated reorder threshold.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="ss-label">Initial Opening Stock</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={initialStock}
                                    onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="ss-input font-bold"
                                />
                                <span className="ss-helper">Units to deposit immediately.</span>
                            </div>

                            <div>
                                <label className="ss-label">Target Warehouse</label>
                                <select
                                    value={warehouseId}
                                    onChange={(e) => handleWarehouseChange(e.target.value)}
                                    className="ss-select"
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
                                <label className="ss-label">Storage Zone / Location</label>
                                <select
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="ss-select"
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

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="max-w-xs">
                                <label className="ss-label">
                                    Low Stock Alert Threshold
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={minStockRule}
                                    onChange={(e) => setMinStockRule(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="ss-input"
                                />
                                <span className="ss-helper">
                                    Triggers dashboard alert when total stock drops below this quantity.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link
                            href="/products"
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                        >
                            Save Product
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
