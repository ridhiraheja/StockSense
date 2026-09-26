"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Alert, Button, TableSkeleton } from "@/components/ui";
import { Transfer, TransferItem, DocumentStatus } from "@/lib/types";
import {
    ArrowRightLeft,
    ArrowLeft,
    CheckCircle2,
    Clock,
    XCircle,
    Boxes,
    PackageCheck,
    ArrowRight,
    Info,
} from "lucide-react";

export default function TransferDetailPage() {
    const params = useParams();
    const router = useRouter();
    const transferId = params?.id as string;

    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [items, setItems] = useState<TransferItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [validating, setValidating] = useState(false);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const loadTransfer = async () => {
        if (!transferId) return;
        setLoading(true);
        try {
            const { data: trf, error: trfError } = await supabase
                .from("transfers")
                .select(
                    "*, source_location:locations!transfers_source_location_id_fkey(*, warehouse:warehouses(*)), destination_location:locations!transfers_destination_location_id_fkey(*, warehouse:warehouses(*))"
                )
                .eq("id", transferId)
                .single();

            if (trfError) throw trfError;
            setTransfer(trf);

            const { data: itms, error: itemError } = await supabase
                .from("transfer_items")
                .select("*, product:products(*)")
                .eq("transfer_id", transferId);

            if (itemError) throw itemError;
            setItems(itms || []);
        } catch (err: unknown) {
            console.error("Error loading transfer:", err);
            const message = err instanceof Error ? err.message : "Failed to load transfer";
            setActionError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransfer();
    }, [transferId]);

    const handleValidateTransfer = async () => {
        if (!transfer) return;
        if (transfer.status === "done") return;

        setValidating(true);
        setActionError("");
        setActionSuccess("");

        try {
            if (transfer.status !== "ready") {
                await supabase
                    .from("transfers")
                    .update({ status: "ready" })
                    .eq("id", transfer.id);
            }

            // Call Supabase stored procedure: validate_transfer
            const { error: rpcError } = await supabase.rpc("validate_transfer", {
                p_transfer_id: transfer.id,
            });

            if (rpcError) throw rpcError;

            const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
            const srcName = `${transfer.source_location?.warehouse?.name || "Source"} (${transfer.source_location?.name || "Zone"})`;
            const destName = `${transfer.destination_location?.warehouse?.name || "Destination"} (${transfer.destination_location?.name || "Zone"})`;

            setActionSuccess(
                `Transfer completed successfully! ${totalQty} units moved from ${srcName} to ${destName}. Stock ledger updated.`
            );
            loadTransfer();
        } catch (err: unknown) {
            console.error("Error validating transfer:", err);
            const message = err instanceof Error ? err.message : "Failed to validate transfer.";
            setActionError(message);
        } finally {
            setValidating(false);
        }
    };

    const handleUpdateStatus = async (newStatus: DocumentStatus) => {
        if (!transfer) return;
        setActionError("");
        try {
            const { error } = await supabase
                .from("transfers")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", transfer.id);

            if (error) throw error;
            setActionSuccess(`Transfer marked as ${newStatus}.`);
            loadTransfer();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update status.";
            setActionError(message);
        }
    };

    if (loading) {
        return (
            <AppLayout title="Internal Transfer">
                <TableSkeleton rows={4} columns={4} />
            </AppLayout>
        );
    }

    if (!transfer) {
        return (
            <AppLayout title="Transfer Not Found">
                <EmptyState
                    icon={ArrowRightLeft}
                    title="Transfer Not Found"
                    description="The requested transfer record does not exist or has been removed."
                    actionLabel="Back to Transfers"
                    actionHref="/transfers"
                />
            </AppLayout>
        );
    }

    const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    return (
        <AppLayout
            title={`Transfer ${transfer.transfer_number}`}
            description={`Internal warehouse relocation • Created on ${new Date(transfer.created_at).toLocaleString()}`}
            actions={
                <div className="flex items-center gap-2">
                    <Link
                        href="/transfers"
                        className="ss-button ss-button-secondary"
                    >
                        <ArrowLeft size={16} />
                        Back to Transfers
                    </Link>

                    {transfer.status !== "done" && transfer.status !== "canceled" && (
                        <Button
                            onClick={handleValidateTransfer}
                            isLoading={validating}
                            variant="primary"
                            icon={<PackageCheck size={16} />}
                        >
                            Validate Transfer
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

                {/* Status & Routing Banner */}
                <div className="ss-card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <ArrowRightLeft size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 font-mono">
                                        {transfer.transfer_number}
                                    </h2>
                                    <StatusBadge status={transfer.status} type="document" />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Internal stock movement between designated storage zones.
                                </p>
                            </div>
                        </div>

                        {transfer.status !== "done" && transfer.status !== "canceled" && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                                <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
                                {transfer.status !== "ready" && (
                                    <button
                                        onClick={() => handleUpdateStatus("ready")}
                                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                                    >
                                        Mark Ready
                                    </button>
                                )}
                                {transfer.status !== "waiting" && (
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

                    {/* Source -> Destination visual block */}
                    <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="sm:col-span-5 bg-white p-3 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                SOURCE ZONE (DEDUCTED)
                            </span>
                            <span className="font-bold text-slate-900 text-sm block">
                                {transfer.source_location?.warehouse?.name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                                Zone: {transfer.source_location?.name} ({transfer.source_location?.code})
                            </span>
                        </div>

                        <div className="sm:col-span-1 flex justify-center">
                            <ArrowRight size={18} className="text-blue-600 shrink-0" />
                        </div>

                        <div className="sm:col-span-5 bg-white p-3 rounded-lg border border-blue-200">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">
                                DESTINATION ZONE (CREDITED)
                            </span>
                            <span className="font-bold text-slate-900 text-sm block">
                                {transfer.destination_location?.warehouse?.name}
                            </span>
                            <span className="text-xs text-blue-600 font-mono">
                                Zone: {transfer.destination_location?.name} ({transfer.destination_location?.code})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="ss-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                Transferred Products
                            </h3>
                            <p className="text-xs text-slate-500">
                                Line items verified for physical relocation.
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
                                    <th>Quantity Moving</th>
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
                                            <span className="font-mono font-bold text-blue-600 text-sm">
                                                {it.quantity}
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
                            {transfer.notes && (
                                <p>
                                    <span className="font-semibold text-slate-700">Notes:</span> {transfer.notes}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                                Total Units Relocated:
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-base bg-white px-3 py-1 rounded-md border border-slate-200">
                                {totalQuantity} units
                            </span>
                        </div>
                    </div>
                </div>

                {/* Complete Status Banner */}
                {transfer.status === "done" && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <span className="font-bold block">Transfer Complete & Validated</span>
                            Inventory quantities have been transferred from the source location to the destination location.
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
