"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Alert, Button, TableSkeleton } from "@/components/ui";
import { Delivery, DeliveryItem, DocumentStatus } from "@/lib/types";
import {
    ShoppingCart,
    ArrowLeft,
    CheckCircle2,
    Clock,
    XCircle,
    Boxes,
    PackageCheck,
    AlertTriangle,
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
            // Ensure status is ready if draft/waiting
            if (delivery.status !== "ready") {
                await supabase
                    .from("deliveries")
                    .update({ status: "ready" })
                    .eq("id", delivery.id);
            }

            // Call stored procedure: validate_delivery
            const { error: rpcError } = await supabase.rpc("validate_delivery", {
                p_delivery_id: delivery.id,
            });

            if (rpcError) throw rpcError;

            const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
            setActionSuccess(
                `Delivery validated successfully! ${totalQty} units deducted from warehouse inventory and recorded in stock movement ledger.`
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
                <TableSkeleton rows={4} columns={5} />
            </AppLayout>
        );
    }

    if (!delivery) {
        return (
            <AppLayout title="Delivery Not Found">
                <EmptyState
                    icon={ShoppingCart}
                    title="Delivery Not Found"
                    description="The requested delivery order record does not exist or has been removed."
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
            description={`Customer outbound order • Created on ${new Date(delivery.created_at).toLocaleString()}`}
            actions={
                <div className="flex items-center gap-2">
                    <Link
                        href="/deliveries"
                        className="ss-button ss-button-secondary"
                    >
                        <ArrowLeft size={16} />
                        Back to Deliveries
                    </Link>

                    {delivery.status !== "done" && delivery.status !== "canceled" && (
                        <Button
                            onClick={handleValidateDelivery}
                            isLoading={validating}
                            variant="primary"
                            icon={<PackageCheck size={16} />}
                        >
                            Validate Delivery
                        </Button>
                    )}
                </div>
            }
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {actionError && (
                    <Alert type="error">
                        {actionError}
                    </Alert>
                )}

                {actionSuccess && (
                    <Alert type="success">
                        {actionSuccess}
                    </Alert>
                )}

                {/* Status & Validation Progression Banner */}
                <div className="ss-card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                <ShoppingCart size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 font-mono">
                                        {delivery.delivery_number}
                                    </h2>
                                    <StatusBadge status={delivery.status} type="document" />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Customer: <span className="font-semibold text-slate-800">{delivery.customer_name || "Direct Customer"}</span> • Source Warehouse:{" "}
                                    <span className="font-semibold text-slate-800">{delivery.warehouse?.name}</span>
                                </p>
                            </div>
                        </div>

                        {/* Status transition controls */}
                        {delivery.status !== "done" && delivery.status !== "canceled" && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                                <span className="text-xs text-slate-400 font-medium mr-1">Change Status:</span>
                                {delivery.status !== "ready" && (
                                    <button
                                        onClick={() => handleUpdateStatus("ready")}
                                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                                    >
                                        Mark Ready
                                    </button>
                                )}
                                {delivery.status !== "waiting" && (
                                    <button
                                        onClick={() => handleUpdateStatus("waiting")}
                                        className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition"
                                    >
                                        Mark Waiting
                                    </button>
                                )}
                                <button
                                    onClick={() => handleUpdateStatus("canceled")}
                                    className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="ss-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                Dispatched Line Items
                            </h3>
                            <p className="text-xs text-slate-500">
                                Allocated picking zones for outbound shipment.
                            </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                            {items.length} {items.length === 1 ? "Item" : "Items"}
                        </span>
                    </div>

                    <div className="ss-table-wrapper border-0 rounded-none shadow-none">
                        <table className="ss-table">
                            <thead>
                                <tr>
                                    <th>Product Name & SKU</th>
                                    <th>Source Picking Zone</th>
                                    <th>Quantity</th>
                                    <th>UOM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it) => (
                                    <tr key={it.id}>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                    <Boxes size={14} />
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-900 block leading-tight">
                                                        {it.product?.name || "Product"}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-slate-400">
                                                        {it.product?.sku}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-medium text-slate-700 text-xs">
                                                {it.location?.name || "Zone"} ({it.location?.code || "—"})
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-mono font-bold text-purple-700 text-sm">
                                                -{it.quantity}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-slate-500 text-xs">
                                                {it.product?.unit_of_measure || "Units"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Summary Footer */}
                    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                            {delivery.notes && (
                                <p>
                                    <span className="font-semibold text-slate-700">Notes:</span> {delivery.notes}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                                Total Dispatched:
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-base bg-white px-3 py-1 rounded-md border border-slate-200">
                                -{totalQuantity} units
                            </span>
                        </div>
                    </div>
                </div>

                {/* Validation Info Box if already validated */}
                {delivery.status === "done" && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <span className="font-bold block">Delivery Order Complete & Dispatched</span>
                            This delivery order has been validated and fulfilled. Items have been deducted from active warehouse stock levels.
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
