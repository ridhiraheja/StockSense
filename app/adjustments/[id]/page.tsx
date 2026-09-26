"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Alert, Button, TableSkeleton } from "@/components/ui";
import { Adjustment, AdjustmentItem, DocumentStatus } from "@/lib/types";
import {
    SlidersHorizontal,
    ArrowLeft,
    CheckCircle2,
    Boxes,
    PackageCheck,
    Calculator,
    Info,
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

            const netDiff = items.reduce((sum, it) => sum + (Number(it.difference) || 0), 0);
            const diffFormatted = netDiff > 0 ? `+${netDiff}` : `${netDiff}`;

            setActionSuccess(
                `Stock adjustment validated successfully! Inventory balances corrected by net ${diffFormatted} units and recorded in stock movement ledger.`
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
                <TableSkeleton rows={4} columns={5} />
            </AppLayout>
        );
    }

    if (!adjustment) {
        return (
            <AppLayout title="Adjustment Not Found">
                <EmptyState
                    icon={SlidersHorizontal}
                    title="Adjustment Not Found"
                    description="The requested adjustment record does not exist or has been removed."
                    actionLabel="Back to Adjustments"
                    actionHref="/adjustments"
                />
            </AppLayout>
        );
    }

    const netDifference = items.reduce((acc, curr) => acc + (Number(curr.difference) || 0), 0);

    return (
        <AppLayout
            title={`Adjustment ${adjustment.adjustment_number}`}
            description={`Stock reconciliation order • Created on ${new Date(adjustment.created_at).toLocaleString()}`}
            actions={
                <div className="flex items-center gap-2">
                    <Link
                        href="/adjustments"
                        className="ss-button ss-button-secondary"
                    >
                        <ArrowLeft size={16} />
                        Back to Adjustments
                    </Link>

                    {adjustment.status !== "done" && adjustment.status !== "canceled" && (
                        <Button
                            onClick={handleValidateAdjustment}
                            isLoading={validating}
                            variant="primary"
                            icon={<PackageCheck size={16} />}
                        >
                            Validate Adjustment
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

                {/* Status & Facility Banner */}
                <div className="ss-card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                                <SlidersHorizontal size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 font-mono">
                                        {adjustment.adjustment_number}
                                    </h2>
                                    <StatusBadge status={adjustment.status} type="document" />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Audited Facility: <span className="font-semibold text-slate-800">{adjustment.warehouse?.name}</span> ({adjustment.warehouse?.code})
                                </p>
                            </div>
                        </div>

                        {adjustment.status !== "done" && adjustment.status !== "canceled" && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                                <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
                                {adjustment.status !== "ready" && (
                                    <button
                                        onClick={() => handleUpdateStatus("ready")}
                                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                                    >
                                        Mark Ready
                                    </button>
                                )}
                                {adjustment.status !== "waiting" && (
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
                                Audited Inventory Items
                            </h3>
                            <p className="text-xs text-slate-500">
                                Discrepancies between expected system balance and physical shelf count.
                            </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                            {items.length} {items.length === 1 ? "Line" : "Lines"}
                        </span>
                    </div>

                    <div className="ss-table-wrapper border-0 rounded-none shadow-none">
                        <table className="ss-table">
                            <thead>
                                <tr>
                                    <th>Product Name & SKU</th>
                                    <th>Storage Zone</th>
                                    <th>Shelf Count</th>
                                    <th>Difference</th>
                                    <th>Audit Reason</th>
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
                                            <span className="text-xs text-slate-700 font-medium">
                                                {it.location?.name} ({it.location?.code})
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-mono font-bold text-slate-900 text-sm">
                                                {it.counted_quantity}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                                                    it.difference > 0
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : it.difference < 0
                                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {it.difference > 0 ? `+${it.difference}` : it.difference} units
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-xs font-semibold text-slate-700 capitalize bg-slate-100 px-2 py-0.5 rounded">
                                                {it.reason ? it.reason.replace("_", " ") : "Count correction"}
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
                            {adjustment.notes && (
                                <p>
                                    <span className="font-semibold text-slate-700">Notes:</span> {adjustment.notes}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                                Net Correction:
                            </span>
                            <span
                                className={`font-mono font-bold text-base bg-white px-3 py-1 rounded-md border ${
                                    netDifference > 0
                                        ? "text-emerald-700 border-emerald-200"
                                        : netDifference < 0
                                        ? "text-rose-700 border-rose-200"
                                        : "text-slate-900 border-slate-200"
                                }`}
                            >
                                {netDifference > 0 ? `+${netDifference}` : netDifference} units
                            </span>
                        </div>
                    </div>
                </div>

                {/* Complete Status Banner */}
                {adjustment.status === "done" && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <span className="font-bold block">Adjustment Complete & Posted</span>
                            The stock balances in designated locations have been adjusted to reflect the verified physical counts.
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
