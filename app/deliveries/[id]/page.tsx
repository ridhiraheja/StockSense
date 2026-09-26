"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Delivery, DeliveryItem, DocumentStatus } from "@/lib/types";
import {
    ShoppingCart,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    PackageMinus,
} from "lucide-react";

export default function DeliveryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const deliveryId = params?.id as string;

    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [items, setItems] = useState<DeliveryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [validating, setValidating] = useState(false);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const loadDelivery = async () => {
        if (!deliveryId) return;
        setLoading(true);
        try {
            const { data: del, error: delError } = await supabase
                .from("deliveries")
                .select("*, warehouse:warehouses(*)")
                .eq("id", deliveryId)
                .single();

            if (delError) throw delError;
            setDelivery(del);

            const { data: itms, error: itemError } = await supabase
                .from("delivery_items")
                .select("*, product:products(*), location:locations(*)")
                .eq("delivery_id", deliveryId);

            if (itemError) throw itemError;
            setItems(itms || []);
        } catch (err: unknown) {
            console.error("Error loading delivery:", err);
            const message = err instanceof Error ? err.message : "Failed to load delivery";
            setActionError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDelivery();
    }, [deliveryId]);

    const handleValidateDelivery = async () => {
        if (!delivery) return;
        if (delivery.status === "done") return;

        setValidating(true);
        setActionError("");
        setActionSuccess("");

        try {
            if (delivery.status !== "ready") {
                await supabase
                    .from("deliveries")
                    .update({ status: "ready" })
                    .eq("id", delivery.id);
            }

            // Call Supabase stored procedure: validate_delivery
            const { error: rpcError } = await supabase.rpc("validate_delivery", {
                p_delivery_id: delivery.id,
            });

            if (rpcError) throw rpcError;

            setActionSuccess(
                "Delivery validated and dispatched! Stock has been deducted and recorded in the movement history."
            );
            loadDelivery();
        } catch (err: unknown) {
            console.error("Error validating delivery:", err);
            const message = err instanceof Error ? err.message : "Failed to validate delivery.";
            setActionError(message);
        } finally {
            setValidating(false);
        }
    };

    const handleUpdateStatus = async (newStatus: DocumentStatus) => {
        if (!delivery) return;
        setActionError("");
        try {
            const { error } = await supabase
                .from("deliveries")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", delivery.id);

            if (error) throw error;
            setActionSuccess(`Delivery marked as ${newStatus}.`);
            loadDelivery();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update status.";
            setActionError(message);
        }
    };

    if (loading) {
        return (
            <AppLayout title="Delivery Order">
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading delivery details...</p>
                </div>
            </AppLayout>
        );
    }

    if (!delivery) {
        return (
            <AppLayout title="Delivery Not Found">
                <EmptyState
                    icon={ShoppingCart}
                    title="Delivery Not Found"
                    description="The requested delivery record does not exist."
                    actionLabel="Back to Deliveries"
                    actionHref="/deliveries"
                />
            </AppLayout>
        );
    }

    const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    return (
        <AppLayout
            title={`Delivery ${delivery.delivery_number}`}
            description={`Customer order created on ${new Date(delivery.created_at).toLocaleString()}`}
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/deliveries"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                        <ArrowLeft size={16} />
                        Back to Deliveries
                    </Link>

                    {delivery.status !== "done" && delivery.status !== "canceled" && (
                        <button
                            onClick={handleValidateDelivery}
                            disabled={validating}
                            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-50"
                        >
                            <PackageMinus size={18} />
                            {validating ? "Validating..." : "Validate & Deliver Stock"}
                        </button>
                    )}
                </div>
            }
        >
            {actionError && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-3">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{actionError}</span>
                </div>
            )}

            {actionSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-3">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                    <span>{actionSuccess}</span>
                </div>
            )}

            {/* Status Steps Ribbon */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                        <span className="text-xs font-bold uppercase text-slate-400">Current Status</span>
                        <div className="mt-1">
                            <StatusBadge status={delivery.status} type="document" />
                        </div>
                    </div>

                    {delivery.status !== "done" && delivery.status !== "canceled" && (
                        <div className="flex items-center gap-2">
                            {delivery.status === "draft" && (
                                <button
                                    onClick={() => handleUpdateStatus("waiting")}
                                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                                >
                                    Mark as Waiting
                                </button>
                            )}
                            {delivery.status === "waiting" && (
                                <button
                                    onClick={() => handleUpdateStatus("ready")}
                                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                >
                                    Mark as Ready
                                </button>
                            )}
                            <button
                                onClick={() => handleUpdateStatus("canceled")}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                            >
                                Cancel Delivery
                            </button>
                        </div>
                    )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-sm">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Customer</span>
                        <p className="font-bold text-slate-900 mt-0.5">
                            {delivery.customer_name || "Direct Customer"}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Warehouse</span>
                        <p className="font-bold text-slate-900 mt-0.5">
                            {delivery.warehouse?.name} ({delivery.warehouse?.code})
                        </p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Total Items</span>
                        <p className="font-bold text-slate-900 mt-0.5">
                            {items.length} line{items.length === 1 ? "" : "s"} ({totalQuantity} units)
                        </p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Notes / PO</span>
                        <p className="font-medium text-slate-600 mt-0.5">
                            {delivery.notes || "—"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Dispatched Line Items */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">Dispatched Products</h3>
                    <span className="text-xs font-semibold text-slate-500">
                        {items.length} item line{items.length === 1 ? "" : "s"}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Source Location</th>
                                <th className="px-6 py-4 text-right">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-6 py-4 font-semibold text-slate-900">
                                        {item.product?.name || "Product"}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                        {item.product?.sku || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        {item.location?.name} ({item.location?.code})
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                                        -{item.quantity} {item.product?.unit_of_measure || "Units"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {delivery.status === "done" && (
                    <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                        <span className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Inventory delivered to customer and logged in ledger.
                        </span>
                        <Link href="/moves" className="text-emerald-700 font-bold hover:underline">
                            View Stock Ledger Movement →
                        </Link>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
