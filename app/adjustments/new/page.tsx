"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Alert, Button } from "@/components/ui";
import { Product, Warehouse, Location, StockLevel, AdjustmentReason } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    SlidersHorizontal,
    Boxes,
    Building2,
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

    const updateCountedQuantity = (id: string, count: number) => {
        setItems((prev) =>
            prev.map((i) => {
                if (i.id === id) {
                    return {
                        ...i,
                        counted_quantity: count,
                        difference: count - i.system_quantity,
                    };
                }
                return i;
            })
        );
    };

    const updateReason = (id: string, r: AdjustmentReason) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, reason: r } : i))
        );
    };

    const addItem = () => {
        const matchingLocs = locations.filter((l) => l.warehouse_id === warehouseId);
        const defLoc = matchingLocs[0]?.id || "";
        const defProd = products[0]?.id || "";

        const existing = stockLevels.find(
            (s) => s.product_id === defProd && s.location_id === defLoc
        );
        const sysQty = existing ? Number(existing.quantity) : 0;

        setItems((prev) => [
            ...prev,
            {
                id: Math.random().toString(),
                product_id: defProd,
                location_id: defLoc,
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
            setError("Please select a warehouse facility.");
            return;
        }

        for (const it of items) {
            if (!it.product_id) {
                setError("Please select a product for all lines.");
                return;
            }
            if (!it.location_id) {
                setError("Please select a storage zone for all lines.");
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

            // 1. Create adjustment header
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

            // 2. Insert items
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

            setSuccessMessage("Adjustment recorded successfully! Opening detail view...");
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
    const netDifference = items.reduce((acc, curr) => acc + curr.difference, 0);

    return (
        <AppLayout
            title="Create Stock Adjustment"
            description="Record physical cycle counts against system balances to correct variances."
            actions={
                <Link
                    href="/adjustments"
                    className="ss-button ss-button-secondary"
                >
                    <ArrowLeft size={16} />
                    Back to Adjustments
                </Link>
            }
        >
            <div className="max-w-4xl mx-auto space-y-6">
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
                    {/* SECTION 1: Facility & Header */}
                    <div className="ss-card p-6">
                        <div className="flex items-center gap-2.5 pb-3.5 mb-5 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                                <SlidersHorizontal size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Audit Facility & Audit Order
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Inventory reconciliation header.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="ss-label">
                                    Adjustment # <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={adjustmentNumber}
                                    onChange={(e) => setAdjustmentNumber(e.target.value)}
                                    required
                                    className="ss-input font-mono uppercase font-bold"
                                />
                            </div>

                            <div>
                                <label className="ss-label">
                                    Warehouse Facility <span className="required">*</span>
                                </label>
                                <select
                                    value={warehouseId}
                                    onChange={(e) => handleWarehouseChange(e.target.value)}
                                    required
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
                                <label className="ss-label">Initial Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="ss-select"
                                >
                                    <option value="ready">Ready (Awaiting Reconciliation Validation)</option>
                                    <option value="waiting">Waiting (Review in progress)</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="ss-label">Audit Notes / Reason</label>
                            <input
                                type="text"
                                placeholder="e.g. Q3 annual physical count, damaged shipment write-off"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="ss-input"
                            />
                        </div>
                    </div>

                    {/* SECTION 2: Line Items with System vs Counted vs Difference */}
                    <div className="ss-card p-6">
                        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Calculator size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Count Comparison Table
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Compare recorded system quantity vs physical shelf count.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={addItem}
                                className="ss-button ss-button-secondary ss-button-sm"
                            >
                                <Plus size={14} />
                                Add Item Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                                >
                                    <div className="sm:col-span-4">
                                        <label className="ss-label text-[11px] mb-1">
                                            Product SKU / Item
                                        </label>
                                        <select
                                            value={item.product_id}
                                            onChange={(e) => updateItemProductOrLocation(item.id, e.target.value, item.location_id)}
                                            required
                                            className="ss-select"
                                        >
                                            <option value="">Select Product</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.sku})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="ss-label text-[11px] mb-1">
                                            Storage Zone
                                        </label>
                                        <select
                                            value={item.location_id}
                                            onChange={(e) => updateItemProductOrLocation(item.id, item.product_id, e.target.value)}
                                            required
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

                                    <div className="sm:col-span-1">
                                        <label className="ss-label text-[11px] mb-1 text-slate-400">
                                            System
                                        </label>
                                        <span className="font-mono font-bold text-slate-700 text-xs block py-2">
                                            {item.system_quantity}
                                        </span>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="ss-label text-[11px] mb-1">
                                            Counted
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.counted_quantity}
                                            onChange={(e) => updateCountedQuantity(item.id, Math.max(0, parseInt(e.target.value) || 0))}
                                            required
                                            className="ss-input font-bold font-mono"
                                        />
                                    </div>

                                    <div className="sm:col-span-1">
                                        <label className="ss-label text-[11px] mb-1">
                                            Diff
                                        </label>
                                        <span
                                            className={`font-mono font-bold text-xs block py-2 ${
                                                item.difference > 0
                                                    ? "text-emerald-600"
                                                    : item.difference < 0
                                                    ? "text-rose-600"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                                        </span>
                                    </div>

                                    <div className="sm:col-span-1 flex justify-end pt-5 sm:pt-0">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length <= 1}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                                            title="Remove Row"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="sm:col-span-12 pt-1 border-t border-slate-100 flex items-center gap-2">
                                        <span className="text-[11px] font-semibold text-slate-500">Reason:</span>
                                        <select
                                            value={item.reason}
                                            onChange={(e) => updateReason(item.id, e.target.value as any)}
                                            className="ss-select !h-7 !py-0 !text-[11px] !w-auto"
                                        >
                                            <option value="count_correction">Count Correction</option>
                                            <option value="damaged">Damaged Stock</option>
                                            <option value="lost">Lost / Missing</option>
                                            <option value="found">Found / Discovered</option>
                                            <option value="other">Other / Write-off</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Summary Footer */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">
                                Audited Items: <span className="text-slate-900 font-bold">{items.length} lines</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                    Net Stock Variance:
                                </span>
                                <span
                                    className={`font-mono font-bold text-sm px-2.5 py-1 rounded-md border ${
                                        netDifference > 0
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : netDifference < 0
                                            ? "bg-rose-50 text-rose-700 border-rose-200"
                                            : "bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                >
                                    {netDifference > 0 ? `+${netDifference}` : netDifference} units
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link
                            href="/adjustments"
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                        >
                            Record Adjustment
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
