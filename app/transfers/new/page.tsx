"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Alert, Button } from "@/components/ui";
import { Product, Location, StockLevel } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    ArrowRightLeft,
    Boxes,
    Building2,
    ArrowDown,
    Info,
} from "lucide-react";

interface TransferLineItem {
    id: string;
    product_id: string;
    quantity: number;
}

export default function NewTransferPage() {
    const router = useRouter();

    const [locations, setLocations] = useState<Location[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

    const [transferNumber, setTransferNumber] = useState(
        `TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    );
    const [sourceLocationId, setSourceLocationId] = useState("");
    const [destinationLocationId, setDestinationLocationId] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<"draft" | "waiting" | "ready">("ready");

    const [items, setItems] = useState<TransferLineItem[]>([
        {
            id: "1",
            product_id: "",
            quantity: 1,
        },
    ]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const loadInitialData = async () => {
            const { data: locs } = await supabase
                .from("locations")
                .select("*, warehouse:warehouses(*)")
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

            if (locs && locs.length >= 2) {
                setSourceLocationId(locs[0].id);
                setDestinationLocationId(locs[1].id);
            } else if (locs && locs.length === 1) {
                setSourceLocationId(locs[0].id);
            }

            if (prods && prods.length > 0) {
                setItems([
                    {
                        id: "1",
                        product_id: prods[0].id,
                        quantity: 1,
                    },
                ]);
            }
        };

        loadInitialData();
    }, []);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: Math.random().toString(),
                product_id: products[0]?.id || "",
                quantity: 1,
            },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const updateItem = (id: string, field: keyof TransferLineItem, val: any) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, [field]: val } : i))
        );
    };

    const getAvailableStockInSource = (prodId: string) => {
        if (!sourceLocationId) return 0;
        const found = stockLevels.find(
            (s) => s.product_id === prodId && s.location_id === sourceLocationId
        );
        return found ? Number(found.quantity) : 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferNumber.trim()) {
            setError("Transfer number is required.");
            return;
        }
        if (!sourceLocationId || !destinationLocationId) {
            setError("Please select both source and destination locations.");
            return;
        }
        if (sourceLocationId === destinationLocationId) {
            setError("Source and destination locations cannot be the same zone.");
            return;
        }

        for (const it of items) {
            if (!it.product_id) {
                setError("Please select a product for all line items.");
                return;
            }
            if (it.quantity <= 0) {
                setError("Quantity must be greater than 0.");
                return;
            }
            const avail = getAvailableStockInSource(it.product_id);
            if (avail < it.quantity) {
                setError(
                    `Insufficient stock in source location for item (Available: ${avail}, Requested: ${it.quantity}).`
                );
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
                throw new Error("You must be logged in to create a transfer. Please sign in again.");
            }

            // 1. Create transfer header
            const { data: trf, error: trfError } = await supabase
                .from("transfers")
                .insert({
                    transfer_number: transferNumber.trim().toUpperCase(),
                    source_location_id: sourceLocationId,
                    destination_location_id: destinationLocationId,
                    status: status,
                    notes: notes.trim() || null,
                    created_by: user.id,
                })
                .select()
                .single();

            if (trfError) throw trfError;

            // 2. Insert items
            if (trf) {
                const itemRows = items.map((i) => ({
                    transfer_id: trf.id,
                    product_id: i.product_id,
                    quantity: Number(i.quantity),
                }));

                const { error: itemsError } = await supabase
                    .from("transfer_items")
                    .insert(itemRows);

                if (itemsError) throw itemsError;
            }

            setSuccessMessage("Internal transfer created successfully! Opening detail view...");
            setTimeout(() => {
                router.push(`/transfers/${trf.id}`);
            }, 1000);
        } catch (err: any) {
            console.error("Error creating transfer:", err);
            const message =
                err?.message ||
                err?.details ||
                err?.error_description ||
                (err instanceof Error ? err.message : "Unable to create transfer.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const sourceLoc = locations.find((l) => l.id === sourceLocationId);
    const destLoc = locations.find((l) => l.id === destinationLocationId);
    const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    return (
        <AppLayout
            title="Create Internal Transfer"
            description="Relocate inventory stock between warehouse locations, zones, or processing floors."
            actions={
                <Link
                    href="/transfers"
                    className="ss-button ss-button-secondary"
                >
                    <ArrowLeft size={16} />
                    Back to Transfers
                </Link>
            }
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Visual Flow Banner */}
                <div className="ss-card p-5 bg-gradient-to-r from-slate-50 to-blue-50/40 border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-3">
                        <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                SOURCE STORAGE ZONE
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm">
                                {sourceLoc ? `${sourceLoc.warehouse?.name} — ${sourceLoc.name} (${sourceLoc.code})` : "Select Source"}
                            </h4>
                        </div>

                        <div className="md:col-span-1 flex justify-center py-2 md:py-0">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <ArrowRightLeft size={15} />
                            </div>
                        </div>

                        <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                                DESTINATION STORAGE ZONE
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm">
                                {destLoc ? `${destLoc.warehouse?.name} — ${destLoc.name} (${destLoc.code})` : "Select Destination"}
                            </h4>
                        </div>
                    </div>

                    <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-500 bg-white/70 p-2 rounded-lg">
                        <Info size={14} className="text-blue-600 shrink-0" />
                        <span>
                            <strong>Note:</strong> Internal transfers move goods between locations without modifying overall company inventory balances.
                        </span>
                    </div>
                </div>

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
                    {/* SECTION 1: Transfer Metadata & Location Pair */}
                    <div className="ss-card p-6">
                        <div className="flex items-center gap-2.5 pb-3.5 mb-5 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <ArrowRightLeft size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Transfer Locations & Routing
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Define source picking zone and target destination.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="ss-label">
                                    Transfer # <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={transferNumber}
                                    onChange={(e) => setTransferNumber(e.target.value)}
                                    required
                                    className="ss-input font-mono uppercase font-bold"
                                />
                            </div>

                            <div>
                                <label className="ss-label">
                                    Source Location <span className="required">*</span>
                                </label>
                                <select
                                    value={sourceLocationId}
                                    onChange={(e) => setSourceLocationId(e.target.value)}
                                    required
                                    className="ss-select font-medium"
                                >
                                    <option value="">Select Source Location</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.warehouse?.name} / {l.name} ({l.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="ss-label">
                                    Destination Location <span className="required">*</span>
                                </label>
                                <select
                                    value={destinationLocationId}
                                    onChange={(e) => setDestinationLocationId(e.target.value)}
                                    required
                                    className="ss-select font-medium"
                                >
                                    <option value="">Select Destination Location</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.warehouse?.name} / {l.name} ({l.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="ss-label">Initial Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="ss-select"
                                >
                                    <option value="ready">Ready (Awaiting Execution Validation)</option>
                                    <option value="waiting">Waiting (In Transit / Picking)</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>

                            <div>
                                <label className="ss-label">Transfer Purpose / Notes</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Replenishment for production line, consolidation"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="ss-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Line Items */}
                    <div className="ss-card p-6">
                        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Boxes size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Relocation Line Items
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Select products and moving quantities.
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
                            {items.map((item) => {
                                const avail = getAvailableStockInSource(item.product_id);
                                const isInsufficient = item.product_id && sourceLocationId && avail < item.quantity;

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3.5 rounded-lg border grid grid-cols-1 sm:grid-cols-12 gap-3 items-center transition ${
                                            isInsufficient
                                                ? "bg-rose-50/50 border-rose-200"
                                                : "bg-slate-50 border-slate-200"
                                        }`}
                                    >
                                        <div className="sm:col-span-8">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="ss-label text-[11px] mb-0">
                                                    Product to Transfer
                                                </label>
                                                {item.product_id && sourceLocationId && (
                                                    <span
                                                        className={`text-[10px] font-bold ${
                                                            isInsufficient ? "text-rose-600" : "text-emerald-600"
                                                        }`}
                                                    >
                                                        Source On-Hand: {avail}
                                                    </span>
                                                )}
                                            </div>
                                            <select
                                                value={item.product_id}
                                                onChange={(e) => updateItem(item.id, "product_id", e.target.value)}
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
                                                Transfer Qty
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                                required
                                                className={`ss-input font-bold font-mono ${
                                                    isInsufficient ? "border-rose-400 text-rose-700" : ""
                                                }`}
                                            />
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
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Summary Footer */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">
                                Total Items: <span className="text-slate-900 font-bold">{items.length} rows</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                    Total Moving Units:
                                </span>
                                <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                    {totalQuantity} units
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link
                            href="/transfers"
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                        >
                            Create Transfer Order
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
