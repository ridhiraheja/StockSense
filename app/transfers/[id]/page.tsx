"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Transfer, TransferItem, DocumentStatus } from "@/lib/types";
import {
    ArrowRightLeft,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
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

            if (trfError) {
                // Fallback query if relation key names differ
                const { data: simpleTrf, error: simpleError } = await supabase
                    .from("transfers")
                    .select("*")
                    .eq("id", transferId)
                    .single();

                if (simpleError) throw simpleError;

                const { data: locs } = await supabase
                    .from("locations")
                    .select("*, warehouse:warehouses(*)");

                const src = locs?.find((l) => l.id === simpleTrf.source_location_id);
                const dest = locs?.find((l) => l.id === simpleTrf.destination_location_id);

                setTransfer({
                    ...simpleTrf,
                    source_location: src,
                    destination_location: dest,
                });
            } else {
                setTransfer(trf);
            }

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

            setActionSuccess(
                "Internal transfer validated successfully! Source inventory has moved to the destination location and double ledger entries recorded."
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
            <AppLayout title="Transfer Order">
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading transfer details...</p>
                </div>
            </AppLayout>
        );
    }

    if (!transfer) {
        return (
            <AppLayout title="Transfer Not Found">
                <EmptyState
                    icon={ArrowRightLeft}
                    title="Transfer Not Found"
                    description="The requested transfer record does not exist."
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
            description={`Internal relocation created on ${new Date(transfer.created_at).toLocaleString()}`}
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/transfers"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                        <ArrowLeft size={16} />
                        Back to Transfers
                    </Link>

                    {transfer.status !== "done" && transfer.status !== "canceled" && (
                        <button
                            onClick={handleValidateTransfer}
                            disabled={validating}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-50"
                        >
                            <ArrowRightLeft size={18} />
                            {validating ? "Validating..." : "Validate & Move Stock"}
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

            {/* Transfer Route Ribbon */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                        <span className="text-xs font-bold uppercase text-slate-400">Current Status</span>
                        <div className="mt-1">
                            <StatusBadge status={transfer.status} type="document" />
                        </div>
                    </div>

                    {transfer.status !== "done" && transfer.status !== "canceled" && (
                        <div className="flex items-center gap-2">
                            {transfer.status === "draft" && (
                                <button
                                    onClick={() => handleUpdateStatus("waiting")}
                                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                                >
                                    Mark as Waiting
                                </button>
                            )}
                            {transfer.status === "waiting" && (
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
                                Cancel Transfer
                            </button>
                        </div>
                    )}
                </div>

                {/* Route Visualizer */}
                <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/70 p-4 rounded-xl mt-4 border border-slate-100">
                    {/* Source */}
                    <div className="flex-1 text-center md:text-left">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            Source Origin (Decreases)
                        </span>
                        <h4 className="text-lg font-bold text-slate-900 mt-1">
                            {transfer.source_location?.name || "Source Zone"}
                        </h4>
                        <p className="text-xs text-slate-500">
                            {transfer.source_location?.warehouse?.name || "Warehouse"} ({transfer.source_location?.code})
                        </p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <ArrowRight size={20} />
                    </div>

                    {/* Destination */}
                    <div className="flex-1 text-center md:text-right">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Destination (Increases)
                        </span>
                        <h4 className="text-lg font-bold text-slate-900 mt-1">
                            {transfer.destination_location?.name || "Destination Zone"}
                        </h4>
                        <p className="text-xs text-slate-500">
                            {transfer.destination_location?.warehouse?.name || "Warehouse"} ({transfer.destination_location?.code})
                        </p>
                    </div>
                </div>

                {/* Notes */}
                {transfer.notes && (
                    <p className="text-xs text-slate-500 mt-4 italic">
                        Notes: {transfer.notes}
                    </p>
                )}
            </div>

            {/* Line Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">Transferred Products</h3>
                    <span className="text-xs font-semibold text-slate-500">
                        {items.length} line{items.length === 1 ? "" : "s"} ({totalQuantity} units)
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4 text-center">Unit of Measure</th>
                                <th className="px-6 py-4 text-right">Transfer Quantity</th>
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
                                    <td className="px-6 py-4 text-center text-slate-600">
                                        {item.product?.unit_of_measure || "Units"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                        {item.quantity} {item.product?.unit_of_measure || "Units"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {transfer.status === "done" && (
                    <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                        <span className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Transfer finalized. Two ledger entries (Transfer Out & Transfer In) logged.
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
