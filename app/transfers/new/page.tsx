"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Product, Location, StockLevel } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    ArrowRightLeft,
    CheckCircle,
    AlertCircle,
    Boxes,
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
            setError("Source and destination locations cannot be the same.");
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
                    `Insufficient stock in source location (Available: ${avail}, Requested: ${it.quantity}).`
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

            // 1. Create transfer record
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

            // 2. Insert line items
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

            setSuccessMessage("Internal transfer created successfully!");
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

    return (
        <AppLayout
            title="New Internal Transfer"
            description="Relocate inventory stock between warehouses, racks, or staging floors."
            actions={
                <Link
                    href="/transfers"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                    <ArrowLeft size={16} />
                    Back to Transfers
                </Link>
            }
        >
            <div className="max-w-4xl mx-auto">
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
                            <ArrowRightLeft size={18} className="text-indigo-600" />
                            Transfer Routing
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Transfer Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={transferNumber}
                                    onChange={(e) => setTransferNumber(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Source Location <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={sourceLocationId}
                                    onChange={(e) => setSourceLocationId(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Source</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.warehouse?.name} - {l.name} ({l.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Destination Location <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={destinationLocationId}
                                    onChange={(e) => setDestinationLocationId(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Destination</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.warehouse?.name} - {l.name} ({l.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Initial Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ready">Ready (Ready for Transfer Validation)</option>
                                    <option value="draft">Draft</option>
                                    <option value="waiting">Waiting</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Notes / Reason for Movement
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Stock replenishment for production floor..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Transfer Items */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Boxes size={18} className="text-indigo-600" />
                                    Products to Transfer
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Stock will decrease from the source and increase in the destination. Total count remains constant.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                            >
                                <Plus size={15} />
                                Add Item Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => {
                                const avail = getAvailableStockInSource(item.product_id);
                                const isInsufficient = avail < item.quantity;

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border ${
                                            isInsufficient
                                                ? "bg-rose-50/50 border-rose-300"
                                                : "bg-slate-50 border-slate-200"
                                        }`}
                                    >
                                        <span className="text-xs font-bold text-slate-400 w-6 text-center">
                                            #{index + 1}
                                        </span>

                                        <div className="flex-1 w-full">
                                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 sm:hidden">
                                                Product
                                            </label>
                                            <select
                                                value={item.product_id}
                                                onChange={(e) => updateItem(item.id, "product_id", e.target.value)}
                                                required
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Select Product</option>
                                                {products.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.sku})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-full sm:w-44">
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                <span>Transfer Qty</span>
                                                <span className={avail < item.quantity ? "text-rose-600 font-bold" : "text-slate-500 font-medium"}>
                                                    Source Avail: {avail}
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                                                }
                                                required
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold text-center focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            disabled={items.length <= 1}
                                            onClick={() => removeItem(item.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 self-end sm:self-center"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/transfers"
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? "Creating..." : "Create Internal Transfer"}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
