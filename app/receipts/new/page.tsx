"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Alert, Button } from "@/components/ui";
import { Product, Warehouse, Location } from "@/lib/types";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Truck,
    Boxes,
    Building2,
    CheckCircle2,
    ArrowDown,
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

            setSuccessMessage("Receipt created successfully! Opening detail view...");
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
    const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    return (
        <AppLayout
            title="Create Receipt Order"
            description="Intake supplier goods, allocate quantities to storage bins, and prepare for stock validation."
            actions={
                <Link
                    href="/receipts"
                    className="ss-button ss-button-secondary"
                >
                    <ArrowLeft size={16} />
                    Back to Receipts
                </Link>
            }
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Visual Workflow Steps */}
                <div className="ss-card p-4 bg-slate-50/80 border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                            Supplier & Warehouse
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                            Products & Bin Quantities
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
                            Review & Validate Receipt
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

                {!initialLoading && warehouses.length === 0 && (
                    <Alert type="warning" title="No Warehouse Registered">
                        You must create at least one warehouse facility and storage location before you can receive items.{" "}
                        <Link href="/warehouses" className="underline font-bold">
                            Create Warehouse
                        </Link>
                    </Alert>
                )}

                {!initialLoading && products.length === 0 && (
                    <Alert type="warning" title="No Products in Catalog">
                        Your product catalog is empty. Register products first to add them to this receipt.{" "}
                        <Link href="/products/new" className="underline font-bold">
                            Register Product
                        </Link>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SECTION 1: Supplier & Order Information */}
                    <div className="ss-card p-6">
                        <div className="flex items-center gap-2.5 pb-3.5 mb-5 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Truck size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Supplier & Facility Details
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Inbound shipment header information.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="ss-label">
                                    Receipt Number <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={receiptNumber}
                                    onChange={(e) => setReceiptNumber(e.target.value)}
                                    required
                                    className="ss-input font-mono uppercase font-bold"
                                />
                            </div>

                            <div>
                                <label className="ss-label">
                                    Supplier / Vendor Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Apex Industrial Supplies"
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                    required
                                    className="ss-input"
                                />
                            </div>

                            <div>
                                <label className="ss-label">
                                    Target Warehouse <span className="required">*</span>
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
                                    <option value="ready">Ready (Awaiting Validation)</option>
                                    <option value="waiting">Waiting (In Transit)</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>

                            <div>
                                <label className="ss-label">Notes / Purchase Order Ref</label>
                                <input
                                    type="text"
                                    placeholder="e.g. PO-8924, Dock 2 Delivery"
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
                                        Received Line Items
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Specify products, receiving zones, and quantities.
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
                            {items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
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
                                            Storage Zone / Location
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
                                        <label className="ss-label text-[11px] mb-1">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                            required
                                            className="ss-input font-bold font-mono"
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
                            ))}
                        </div>

                        {/* Total Summary Footer */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">
                                Total Items: <span className="text-slate-900 font-bold">{items.length} rows</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                    Total Intake Quantity:
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
                            href="/receipts"
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                        >
                            Create Receipt Order
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
