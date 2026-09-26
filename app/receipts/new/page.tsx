"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Product, Warehouse, Location } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Truck,
    CheckCircle,
    AlertCircle,
    Boxes,
    Warehouse as WarehouseIcon,
} from "lucide-react";

interface LineItem {
    id: string;
    product_id: string;
    location_id: string;
    quantity: number;
}

export default function NewReceiptPage() {
    const router = useRouter();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [receiptNumber, setReceiptNumber] = useState(
        `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    );
    const [supplierName, setSupplierName] = useState("");
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
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const loadInitialData = async () => {
            setInitialLoading(true);
            try {
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
                            quantity: 10,
                        },
                    ]);
                }
            } catch (err) {
                console.error("Error loading initial data:", err);
            } finally {
                setInitialLoading(false);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!receiptNumber.trim()) {
            setError("Receipt number is required.");
            return;
        }
        if (!supplierName.trim()) {
            setError("Supplier name is required.");
            return;
        }
        if (!warehouseId) {
            setError("Please select a target warehouse.");
            return;
        }

        // Validate items
        for (const it of items) {
            if (!it.product_id) {
                setError("Please select a product for all line items.");
                return;
            }
            if (!it.location_id) {
                setError("Please select a storage location zone for all items.");
                return;
            }
            if (it.quantity <= 0) {
                setError("Item quantities must be greater than 0.");
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
                throw new Error("You must be logged in to create a receipt. Please sign in again.");
            }

            // 1. Create Receipt header
            const { data: receipt, error: receiptError } = await supabase
                .from("receipts")
                .insert({
                    receipt_number: receiptNumber.trim().toUpperCase(),
                    supplier_name: supplierName.trim(),
                    warehouse_id: warehouseId,
                    status: status,
                    notes: notes.trim() || null,
                    created_by: user.id,
                })
                .select()
                .single();

            if (receiptError) throw receiptError;

            // 2. Insert items
            if (receipt) {
                const itemRows = items.map((i) => ({
                    receipt_id: receipt.id,
                    product_id: i.product_id,
                    location_id: i.location_id,
                    quantity: Number(i.quantity),
                }));

                const { error: itemsError } = await supabase
                    .from("receipt_items")
                    .insert(itemRows);

                if (itemsError) throw itemsError;
            }

            setSuccessMessage("Receipt created successfully!");
            setTimeout(() => {
                router.push(`/receipts/${receipt.id}`);
            }, 1000);
        } catch (err: any) {
            console.error("Error creating receipt:", err);
            const message =
                err?.message ||
                err?.details ||
                err?.error_description ||
                (err instanceof Error ? err.message : "Unable to create receipt.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const availableLocations = locations.filter((l) => l.warehouse_id === warehouseId);

    return (
        <AppLayout
            title="Create Receipt"
            description="Intake supplier shipments into designated warehouse locations."
            actions={
                <Link
                    href="/receipts"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                    <ArrowLeft size={16} />
                    Back to Receipts
                </Link>
            }
        >
            <div className="max-w-4xl mx-auto">
                {/* Warning if no warehouse or products */}
                {!initialLoading && warehouses.length === 0 && (
                    <div className="mb-6 p-5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-4 shadow-xs">
                        <WarehouseIcon className="text-amber-600 shrink-0 mt-0.5" size={22} />
                        <div>
                            <h4 className="font-bold text-sm">No Active Warehouse Found</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                You must create at least one warehouse and storage location before you can receive goods into inventory.
                            </p>
                            <Link
                                href="/warehouses"
                                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-amber-600 text-white font-semibold text-xs rounded-lg hover:bg-amber-700 transition"
                            >
                                <Plus size={14} />
                                Create Warehouse & Location
                            </Link>
                        </div>
                    </div>
                )}

                {!initialLoading && products.length === 0 && (
                    <div className="mb-6 p-5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-start gap-4 shadow-xs">
                        <Boxes className="text-blue-600 shrink-0 mt-0.5" size={22} />
                        <div>
                            <h4 className="font-bold text-sm">No Products Registered</h4>
                            <p className="text-xs text-blue-700 mt-1">
                                Your product catalog is currently empty. Register a product first to select it in the receipt.
                            </p>
                            <Link
                                href="/products/new"
                                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition"
                            >
                                <Plus size={14} />
                                Register New Product
                            </Link>
                        </div>
                    </div>
                )}

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
                            <Truck size={18} className="text-blue-600" />
                            Receipt Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Receipt Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={receiptNumber}
                                    onChange={(e) => setReceiptNumber(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Supplier Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter supplier name"
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Target Warehouse <span className="text-rose-500">*</span>
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
                                    <option value="ready">Ready (Ready for Immediate Validation)</option>
                                    <option value="draft">Draft</option>
                                    <option value="waiting">Waiting (In Transit)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                    Notes / Delivery Reference
                                </label>
                                <input
                                    type="text"
                                    placeholder="Optional PO number, BOL, or carrier reference..."
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
                                    <Boxes size={18} className="text-emerald-600" />
                                    Received Products
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Select the products and the exact location zones to place them.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                disabled={products.length === 0 || availableLocations.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-40"
                            >
                                <Plus size={15} />
                                Add Product Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
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
                                    <div className="w-full sm:w-64">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 sm:hidden">
                                            Storage Zone
                                        </label>
                                        <select
                                            value={item.location_id}
                                            onChange={(e) => updateItem(item.id, "location_id", e.target.value)}
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Location Zone</option>
                                            {availableLocations.map((loc) => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name} ({loc.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Quantity */}
                                    <div className="w-full sm:w-32">
                                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 sm:hidden">
                                            Quantity
                                        </label>
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
                            ))}
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end gap-3">
                        <Link
                            href="/receipts"
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || warehouses.length === 0 || products.length === 0}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? "Creating..." : "Create Receipt Order"}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
