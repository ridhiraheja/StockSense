"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Adjustment, AdjustmentItem, DocumentStatus } from "@/lib/types";
import {
    SlidersHorizontal,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Check,
} from "lucide-react";

export default function AdjustmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const adjustmentId = params?.id as string;

    const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
    const [items, setItems] = useState<AdjustmentItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [validating, setValidating] = useState(false);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const loadAdjustment = async () => {
        if (!adjustmentId) return;
        setLoading(true);
        try {
            const { data: adj, error: adjError } = await supabase
                .from("adjustments")
                .select("*, warehouse:warehouses(*)")
                .eq("id", adjustmentId)
                .single();

            if (adjError) throw adjError;
            setAdjustment(adj);

            const { data: itms, error: itemError } = await supabase
                .from("adjustment_items")
                .select("*, product:products(*), location:locations(*)")
                .eq("adjustment_id", adjustmentId);

            if (itemError) throw itemError;
            setItems(itms || []);
        } catch (err: unknown) {
            console.error("Error loading adjustment:", err);
            const message = err instanceof Error ? err.message : "Failed to load adjustment";
            setActionError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdjustment();
    }, [adjustmentId]);

    const handleValidateAdjustment = async () => {
        if (!adjustment) return;
        if (adjustment.status === "done") return;

        setValidating(true);
        setActionError("");
        setActionSuccess("");

        try {
            if (adjustment.status !== "ready") {
                await supabase
                    .from("adjustments")
                    .update({ status: "ready" })
                    .eq("id", adjustment.id);
            }

            // Call Supabase stored procedure: validate_adjustment
            const { error: rpcError } = await supabase.rpc("validate_adjustment", {
                p_adjustment_id: adjustment.id,
            });

            if (rpcError) throw rpcError;

            setActionSuccess(
                "Stock adjustment validated successfully! Differences applied to inventory and recorded in movement ledger."
            );
            loadAdjustment();
        } catch (err: unknown) {
            console.error("Error validating adjustment:", err);
            const message = err instanceof Error ? err.message : "Failed to validate adjustment.";
            setActionError(message);
        } finally {
            setValidating(false);
        }
    };

    const handleUpdateStatus = async (newStatus: DocumentStatus) => {
        if (!adjustment) return;
        setActionError("");
        try {
            const { error } = await supabase
                .from("adjustments")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", adjustment.id);

            if (error) throw error;
            setActionSuccess(`Adjustment marked as ${newStatus}.`);
            loadAdjustment();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update status.";
            setActionError(message);
        }
    };

    if (loading) {
        return (
            <AppLayout title="Adjustment Details">
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading adjustment details...</p>
                </div>
            </AppLayout>
        );
    }

    if (!adjustment) {
        return (
            <AppLayout title="Adjustment Not Found">
                <EmptyState
                    icon={SlidersHorizontal}
                    title="Adjustment Not Found"
                    description="The requested adjustment record does not exist."
                    actionLabel="Back to Adjustments"
                    actionHref="/adjustments"
                />
            </AppLayout>
        );
    }

    return (
        <AppLayout
            title={`Adjustment ${adjustment.adjustment_number}`}
            description={`Stock reconciliation created on ${new Date(adjustment.created_at).toLocaleString()}`}
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/adjustments"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                        <ArrowLeft size={16} />
                        Back to Adjustments
                    </Link>

                    {adjustment.status !== "done" && adjustment.status !== "canceled" && (
                        <button
                            onClick={handleValidateAdjustment}
                            disabled={validating}
                            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-50"
                        >
                            <Check size={18} />
                            {validating ? "Validating..." : "Validate & Apply Adjustment"}
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

            {/* Status Ribbon */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                        <span className="text-xs font-bold uppercase text-slate-400">Current Status</span>
                        <div className="mt-1">
                            <StatusBadge status={adjustment.status} type="document" />
                        </div>
                    </div>

                    {adjustment.status !== "done" && adjustment.status !== "canceled" && (
                        <div className="flex items-center gap-2">
                            {adjustment.status === "draft" && (
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
                                Cancel Adjustment
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-sm">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Warehouse</span>
                        <p className="font-bold text-slate-900 mt-0.5">
                            {adjustment.warehouse?.name} ({adjustment.warehouse?.code})
                        </p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Reconciled Lines</span>
                        <p className="font-bold text-slate-900 mt-0.5">
                            {items.length} line item{items.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Notes</span>
                        <p className="font-medium text-slate-600 mt-0.5">
                            {adjustment.notes || "—"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Reconciliation Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">Physical Stock Count Comparison</h3>
                    <span className="text-xs font-semibold text-slate-500">
                        {items.length} line item{items.length === 1 ? "" : "s"}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Zone</th>
                                <th className="px-6 py-4 text-center">Physical Count</th>
                                <th className="px-6 py-4 text-center">Difference</th>
                                <th className="px-6 py-4">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-6 py-4 font-semibold text-slate-900">
                                        {item.product?.name || "Product"}
                                        <span className="font-mono text-xs text-slate-400 block">
                                            {item.product?.sku}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        {item.location?.name} ({item.location?.code})
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-900 text-base">
                                        {item.counted_quantity}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                                                item.difference > 0
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : item.difference < 0
                                                    ? "bg-rose-100 text-rose-800"
                                                    : "bg-slate-100 text-slate-700"
                                            }`}
                                        >
                                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 capitalize text-slate-700 font-medium">
                                        {item.reason.replace(/_/g, " ")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {adjustment.status === "done" && (
                    <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                        <span className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Adjustment applied to physical database stock and recorded in ledger.
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
