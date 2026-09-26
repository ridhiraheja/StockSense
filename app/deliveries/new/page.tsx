"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Alert, Button } from "@/components/ui";
import { Product, Warehouse, Location, StockLevel } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    ShoppingCart,
    Boxes,
    Building2,
    AlertTriangle,
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
                    `Insufficient stock for item in selected zone (Available on hand: ${avail}, Requested dispatch: ${it.quantity}).`
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

            setSuccessMessage("Delivery order created successfully! Opening detail view...");
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
    const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    return (
        <AppLayout
            title="Create Delivery Order"
            description="Prepare outbound customer dispatches and verify location-level stock availability."
            actions={
                <Link
                    href="/deliveries"
                    className="ss-button ss-button-secondary"
                >
                    <ArrowLeft size={16} />
                    Back to Deliveries
                </Link>
            }
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Visual Workflow Steps */}
                <div className="ss-card p-4 bg-slate-50/80 border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <div className="flex items-center gap-2 text-purple-600 font-bold">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                            Customer & Source Facility
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-2 text-purple-600 font-bold">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">2</span>
                            Items & Stock Availability
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
                            Validate Dispatch
                        </div>
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
                    {/* SECTION 1: Customer & Warehouse */}
                    <div className="ss-card p-6">
                        <div className="flex items-center gap-2.5 pb-3.5 mb-5 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                <ShoppingCart size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Customer & Source Facility
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Outbound shipment order metadata.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="ss-label">
                                    Delivery Order # <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={deliveryNumber}
                                    onChange={(e) => setDeliveryNumber(e.target.value)}
                                    required
                                    className="ss-input font-mono uppercase font-bold"
                                />
                            </div>

                            <div>
                                <label className="ss-label">Customer / Recipient Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme Corp, Jane Doe"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="ss-input"
                                />
                            </div>

                            <div>
                                <label className="ss-label">
                                    Source Warehouse <span className="required">*</span>
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="ss-label">Initial Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="ss-select"
                                >
                                    <option value="ready">Ready (Awaiting Dispatch Validation)</option>
                                    <option value="waiting">Waiting (Backorder / Picking)</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>

                            <div>
                                <label className="ss-label">Notes / Sales Order Ref</label>
                                <input
                                    type="text"
                                    placeholder="e.g. SO-10492, Rush shipping"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="ss-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Line Items with Real-time Stock Availability */}
                    <div className="ss-card p-6">
                        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Boxes size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Dispatch Line Items
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Select products and picking zones with verified stock.
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
                                const availableStock = getAvailableStock(item.product_id, item.location_id);
                                const isInsufficient = item.product_id && item.location_id && availableStock < item.quantity;

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3.5 rounded-lg border grid grid-cols-1 sm:grid-cols-12 gap-3 items-center transition ${
                                            isInsufficient
                                                ? "bg-rose-50/50 border-rose-200"
                                                : "bg-slate-50 border-slate-200"
                                        }`}
                                    >
                                        <div className="sm:col-span-5">
                                            <label className="ss-label text-[11px] mb-1">
                                                Product SKU / Item
                                            </label>
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

                                        <div className="sm:col-span-4">
                                            <label className="ss-label text-[11px] mb-1">
                                                Source Storage Zone
                                            </label>
                                            <select
                                                value={item.location_id}
                                                onChange={(e) => updateItem(item.id, "location_id", e.target.value)}
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

                                        <div className="sm:col-span-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="ss-label text-[11px] mb-0">
                                                    Qty
                                                </label>
                                                {item.product_id && item.location_id && (
                                                    <span
                                                        className={`text-[10px] font-bold ${
                                                            isInsufficient ? "text-rose-600 font-bold" : "text-emerald-600"
                                                        }`}
                                                    >
                                                        Avail: {availableStock}
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                                required
                                                className={`ss-input font-bold font-mono ${
                                                    isInsufficient ? "border-rose-400 text-rose-700 focus:ring-rose-500" : ""
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
                                    Total Outbound Units:
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
                            href="/deliveries"
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                        >
                            Create Delivery Order
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
