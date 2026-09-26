"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Product, Warehouse, Location, StockLevel, AdjustmentReason } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    SlidersHorizontal,
    CheckCircle,
    AlertCircle,
    Boxes,
    Calculator,
} from "lucide-react";

interface AdjustmentLineItem {
    id: string;
    product_id: string;
    location_id: string;
    system_quantity: number;
    counted_quantity: number;
    difference: number;
    reason: AdjustmentReason;
}

export default function NewAdjustmentPage() {
    const router = useRouter();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

    const [adjustmentNumber, setAdjustmentNumber] = useState(
        `ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    );
    const [warehouseId, setWarehouseId] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<"draft" | "waiting" | "ready">("ready");

    const [items, setItems] = useState<AdjustmentLineItem[]>([
        {
            id: "1",
            product_id: "",
            location_id: "",
            system_quantity: 0,
            counted_quantity: 0,
            difference: 0,
            reason: "count_correction",
        },
    ]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const loadInitialData = async () => {
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

            const { data: prods } = await supabase
                .from("products")
                .select("*")
                .eq("is_active", true)
                .order("name", { ascending: true });
            setProducts(prods || []);

            const { data: stocks } = await supabase.from("stock_levels").select("*");
            setStockLevels(stocks || []);

            if (whs && whs.length > 0) {
                const defaultWh = whs[0].id;
                setWarehouseId(defaultWh);

                const matchingLocs = (locs || []).filter((l) => l.warehouse_id === defaultWh);
                const defaultLoc = matchingLocs.length > 0 ? matchingLocs[0].id : "";
                const defaultProd = prods && prods.length > 0 ? prods[0].id : "";

                const existingStock = (stocks || []).find(
                    (s) => s.product_id === defaultProd && s.location_id === defaultLoc
                );
                const sysQty = existingStock ? Number(existingStock.quantity) : 0;

                setItems([
                    {
                        id: "1",
                        product_id: defaultProd,
                        location_id: defaultLoc,
                        system_quantity: sysQty,
                        counted_quantity: sysQty,
                        difference: 0,
                        reason: "count_correction",
                    },
                ]);
            }
        };

        loadInitialData();
    }, []);

    const handleWarehouseChange = (wId: string) => {
        setWarehouseId(wId);
        const matchingLocs = locations.filter((l) => l.warehouse_id === wId);
        const defaultLoc = matchingLocs.length > 0 ? matchingLocs[0].id : "";

        setItems((prev) =>
            prev.map((item) => {
                const existing = stockLevels.find(
                    (s) => s.product_id === item.product_id && s.location_id === defaultLoc
                );
                const sysQty = existing ? Number(existing.quantity) : 0;
                return {
                    ...item,
                    location_id: defaultLoc,
                    system_quantity: sysQty,
                    difference: item.counted_quantity - sysQty,
                };
            })
        );
    };

    const updateItemProductOrLocation = (id: string, prodId: string, locId: string) => {
        const existing = stockLevels.find(
            (s) => s.product_id === prodId && s.location_id === locId
        );
        const sysQty = existing ? Number(existing.quantity) : 0;

        setItems((prev) =>
            prev.map((i) => {
                if (i.id === id) {
                    const diff = i.counted_quantity - sysQty;
                    return {
                        ...i,
                        product_id: prodId,
                        location_id: locId,
                        system_quantity: sysQty,
                        difference: diff,
                    };
                }
                return i;
            })
        );
    };

    const updateItemCounted = (id: string, counted: number) => {
        setItems((prev) =>
            prev.map((i) => {
                if (i.id === id) {
                    const diff = counted - i.system_quantity;
                    return {
                        ...i,
                        counted_quantity: counted,
                        difference: diff,
                    };
                }
                return i;
            })
        );
    };

    const updateItemReason = (id: string, reason: AdjustmentReason) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, reason } : i))
        );
    };

    const addItem = () => {
        const matchingLocs = locations.filter((l) => l.warehouse_id === warehouseId);
        const defaultLoc = matchingLocs[0]?.id || "";
        const defaultProd = products[0]?.id || "";
        const existing = stockLevels.find(
            (s) => s.product_id === defaultProd && s.location_id === defaultLoc
        );
        const sysQty = existing ? Number(existing.quantity) : 0;

        setItems((prev) => [
            ...prev,
            {
                id: Math.random().toString(),
                product_id: defaultProd,
                location_id: defaultLoc,
                system_quantity: sysQty,
                counted_quantity: sysQty,
                difference: 0,
                reason: "count_correction",
            },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustmentNumber.trim()) {
            setError("Adjustment number is required.");
            return;
        }
        if (!warehouseId) {
            setError("Please select a target warehouse.");
            return;
        }

        for (const it of items) {
            if (!it.product_id || !it.location_id) {
                setError("Product and location must be selected for each item.");
                return;
            }
            if (it.counted_quantity < 0) {
                setError("Counted quantity cannot be negative.");
                return;
            }
        }

        setLoading(true);
        setError("");

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error("You must be logged in to create an adjustment. Please sign in again.");
            }

            // 1. Create adjustment record
            const { data: adj, error: adjError } = await supabase
                .from("adjustments")
                .insert({
                    adjustment_number: adjustmentNumber.trim().toUpperCase(),
                    warehouse_id: warehouseId,
                    status: status,
                    notes: notes.trim() || null,
                    created_by: user.id,
                })
                .select()
                .single();

            if (adjError) throw adjError;

            // 2. Insert line items
            if (adj) {
                const itemRows = items.map((i) => ({
                    adjustment_id: adj.id,
                    product_id: i.product_id,
                    location_id: i.location_id,
                    counted_quantity: Number(i.counted_quantity),
                    difference: Number(i.difference),
                    reason: i.reason,
                }));

                const { error: itemsError } = await supabase
                    .from("adjustment_items")
                    .insert(itemRows);

                if (itemsError) throw itemsError;
            }

            setSuccessMessage("Stock adjustment record created successfully!");
            setTimeout(() => {
                router.push(`/adjustments/${adj.id}`);
            }, 1000);
        } catch (err: any) {
            console.error("Error creating adjustment:", err);
            const message =
                err?.message ||
                err?.details ||
                err?.error_description ||
                (err instanceof Error ? err.message : "Unable to create adjustment.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const availableLocations = locations.filter((l) => l.warehouse_id === warehouseId);

    return (
        <AppLayout
            title="Create Stock Adjustment"
            description="Reconcile physical on-shelf counts with the system database."
            actions={
                <Link
                    href="/adjustments"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                    <ArrowLeft size={16} />
                    Back to Adjustments
                </Link>
            }
        >
            <div className="max-w-5xl mx-auto">
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Info */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                        <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <SlidersHorizontal size={18} className="text-amber-600" />
                            Adjustment Header
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Adjustment Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={adjustmentNumber}
                                    onChange={(e) => setAdjustmentNumber(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Audit Warehouse <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={warehouseId}
                                    onChange={(e) => handleWarehouseChange(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    Initial Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ready">Ready (Ready for Immediate Validation)</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Audit Notes / Reference
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Monthly cycle count, damaged shelf audit..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Adjustment Items */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Calculator size={18} className="text-amber-600" />
                                    Physical Count Reconciliation
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Difference is auto-computed (Counted Qty − System Qty) and will be applied on validation.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                            >
                                <Plus size={15} />
                                Add Item Row
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 items-center"
                                >
                                    {/* Product */}
                                    <div className="sm:col-span-3">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                            Product
                                        </label>
                                        <select
                                            value={item.product_id}
                                            onChange={(e) =>
                                                updateItemProductOrLocation(
                                                    item.id,
                                                    e.target.value,
                                                    item.location_id
                                                )
                                            }
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Product</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.sku})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Location */}
                                    <div className="sm:col-span-3">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                            Zone
                                        </label>
                                        <select
                                            value={item.location_id}
                                            onChange={(e) =>
                                                updateItemProductOrLocation(
                                                    item.id,
                                                    item.product_id,
                                                    e.target.value
                                                )
                                            }
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Location</option>
                                            {availableLocations.map((loc) => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name} ({loc.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* System Quantity */}
                                    <div className="sm:col-span-1 text-center">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                            System
                                        </label>
                                        <span className="font-bold text-sm text-slate-700 block py-1.5 bg-slate-200/60 rounded-lg">
                                            {item.system_quantity}
                                        </span>
                                    </div>

                                    {/* Counted Quantity */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                            Counted
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.counted_quantity}
                                            onChange={(e) =>
                                                updateItemCounted(
                                                    item.id,
                                                    Math.max(0, parseInt(e.target.value) || 0)
                                                )
                                            }
                                            required
                                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold text-center focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Difference Display */}
                                    <div className="sm:col-span-1 text-center">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                            Diff
                                        </label>
                                        <span
                                            className={`font-bold text-sm block py-1.5 rounded-lg ${
                                                item.difference > 0
                                                    ? "text-emerald-700 bg-emerald-100"
                                                    : item.difference < 0
                                                    ? "text-rose-700 bg-rose-100"
                                                    : "text-slate-500 bg-slate-200/50"
                                            }`}
                                        >
                                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                                        </span>
                                    </div>

                                    {/* Reason */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                            Reason
                                        </label>
                                        <select
                                            value={item.reason}
                                            onChange={(e) =>
                                                updateItemReason(item.id, e.target.value as AdjustmentReason)
                                            }
                                            className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="count_correction">Count Correction</option>
                                            <option value="damaged">Damaged</option>
                                            <option value="lost">Lost</option>
                                            <option value="found">Found</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    {/* Delete Row */}
                                    <div className="sm:col-span-1 text-right flex justify-end">
                                        <button
                                            type="button"
                                            disabled={items.length <= 1}
                                            onClick={() => removeItem(item.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/adjustments"
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? "Creating..." : "Save Adjustment"}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
