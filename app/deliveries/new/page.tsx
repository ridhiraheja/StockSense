"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Product, Warehouse, Location, StockLevel } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    ShoppingCart,
    CheckCircle,
    AlertCircle,
    Boxes,
} from "lucide-react";

interface LineItem {
    id: string;
    product_id: string;
    location_id: string;
    quantity: number;
}

export default function NewDeliveryPage() {
    const router = useRouter();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

    const [deliveryNumber, setDeliveryNumber] = useState(
        `DEL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    );
    const [customerName, setCustomerName] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<"draft" | "waiting" | "ready">("ready");

    const [items, setItems] = useState<LineItem[]>([
        {
            id: "1",
            product_id: "",
            location_id: "",
            quantity: 1,
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

            const { data: stocks } = await supabase
                .from("stock_levels")
                .select("*");
            setStockLevels(stocks || []);

            if (whs && whs.length > 0) {
                const defaultWh = whs[0].id;
                setWarehouseId(defaultWh);

                const matchingLocs = (locs || []).filter((l) => l.warehouse_id === defaultWh);
                const defaultLoc = matchingLocs.length > 0 ? matchingLocs[0].id : "";
                const defaultProd = prods && prods.length > 0 ? prods[0].id : "";

                setItems([
                    {
                        id: "1",
                        product_id: defaultProd,
                        location_id: defaultLoc,
                        quantity: 1,
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
            prev.map((item) => ({
                ...item,
                location_id: defaultLoc,
            }))
        );
    };

    const addItem = () => {
        const matchingLocs = locations.filter((l) => l.warehouse_id === warehouseId);
        setItems((prev) => [
            ...prev,
            {
                id: Math.random().toString(),
                product_id: products[0]?.id || "",
                location_id: matchingLocs[0]?.id || "",
                quantity: 1,
            },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const updateItem = (id: string, field: keyof LineItem, val: any) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, [field]: val } : i))
        );
    };

    const getAvailableStock = (prodId: string, locId: string) => {
        const found = stockLevels.find(
            (s) => s.product_id === prodId && s.location_id === locId
        );
        return found ? Number(found.quantity) : 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deliveryNumber.trim()) {
            setError("Delivery number is required.");
            return;
        }
        if (!warehouseId) {
            setError("Please select a source warehouse.");
            return;
        }

        // Validate line items
        for (const it of items) {
            if (!it.product_id) {
                setError("Please select a product for all line items.");
                return;
            }
            if (!it.location_id) {
                setError("Please select a source location zone for all items.");
                return;
            }
            if (it.quantity <= 0) {
                setError("Quantity must be greater than 0.");
                return;
            }

            const avail = getAvailableStock(it.product_id, it.location_id);
            if (avail < it.quantity) {
                setError(
                    `Insufficient stock for product in selected location (Available: ${avail}, Requested: ${it.quantity}).`
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
                throw new Error("You must be logged in to create a delivery order. Please sign in again.");
            }

            // 1. Create delivery header
            const { data: del, error: delError } = await supabase
                .from("deliveries")
                .insert({
                    delivery_number: deliveryNumber.trim().toUpperCase(),
                    customer_name: customerName.trim() || null,
                    warehouse_id: warehouseId,
                    status: status,
                    notes: notes.trim() || null,
                    created_by: user.id,
                })
                .select()
                .single();

            if (delError) throw delError;

            // 2. Insert items
            if (del) {
                const itemRows = items.map((i) => ({
                    delivery_id: del.id,
                    product_id: i.product_id,
                    location_id: i.location_id,
                    quantity: Number(i.quantity),
                }));

                const { error: itemsError } = await supabase
                    .from("delivery_items")
                    .insert(itemRows);

                if (itemsError) throw itemsError;
            }

            setSuccessMessage("Delivery order created successfully!");
            setTimeout(() => {
                router.push(`/deliveries/${del.id}`);
            }, 1000);
        } catch (err: any) {
            console.error("Error creating delivery:", err);
            const message =
                err?.message ||
                err?.details ||
                err?.error_description ||
                (err instanceof Error ? err.message : "Unable to create delivery.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const availableLocations = locations.filter((l) => l.warehouse_id === warehouseId);

    return (
        <AppLayout
            title="Create Delivery Order"
            description="Dispatch inventory items to customers or external parties."
            actions={
                <Link
                    href="/deliveries"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                    <ArrowLeft size={16} />
                    Back to Deliveries
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
                            <ShoppingCart size={18} className="text-purple-600" />
                            Delivery Order Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Delivery Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={deliveryNumber}
                                    onChange={(e) => setDeliveryNumber(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Customer Name / Destination
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme Corp, Global Tech"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Source Warehouse <span className="text-rose-500">*</span>
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
                                    <option value="ready">Ready (Pick & Pack Complete)</option>
                                    <option value="draft">Draft</option>
                                    <option value="waiting">Waiting</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Notes / Customer PO
                                </label>
                                <input
                                    type="text"
                                    placeholder="Optional shipping instructions..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Boxes size={18} className="text-purple-600" />
                                    Dispatched Products
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Pick items from specific warehouse storage zones.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                            >
                                <Plus size={15} />
                                Add Item Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => {
                                const avail = getAvailableStock(item.product_id, item.location_id);
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

                                        {/* Product Select */}
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

                                        {/* Location Select */}
                                        <div className="w-full sm:w-60">
                                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 sm:hidden">
                                                Pick From Zone
                                            </label>
                                            <select
                                                value={item.location_id}
                                                onChange={(e) => updateItem(item.id, "location_id", e.target.value)}
                                                required
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Select Location</option>
                                                {availableLocations.map((loc) => (
                                                    <option key={loc.id} value={loc.id}>
                                                        {loc.name} ({loc.code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Quantity & Available Stock */}
                                        <div className="w-full sm:w-36">
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                <span>Quantity</span>
                                                <span className={avail < item.quantity ? "text-rose-600 font-bold" : "text-slate-500 font-medium"}>
                                                    Avail: {avail}
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

                                        {/* Remove Button */}
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

                    {/* Submit Actions */}
                    <div className="flex justify-end gap-3">
                        <Link
                            href="/deliveries"
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? "Creating..." : "Create Delivery Order"}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
