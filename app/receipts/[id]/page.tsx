"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Alert, Button, TableSkeleton } from "@/components/ui";
import { Receipt, ReceiptItem, DocumentStatus } from "@/lib/types";
import {
    Truck,
    ArrowLeft,
    CheckCircle2,
    Clock,
    XCircle,
    Boxes,
    Building2,
    ShieldCheck,
    PackageCheck,
    FileCheck,
} from "lucide-react";

export default function ReceiptDetailPage() {
    const params = useParams();
    const router = useRouter();
    const receiptId = params?.id as string;

    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [items, setItems] = useState<ReceiptItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [validating, setValidating] = useState(false);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const loadReceipt = async () => {
        if (!receiptId) return;
        setLoading(true);
        try {
            const { data: rec, error: recError } = await supabase
                .from("receipts")
                .select("*, warehouse:warehouses(*)")
                .eq("id", receiptId)
                .single();

            if (recError) throw recError;
            setReceipt(rec);

            const { data: itms, error: itemError } = await supabase
                .from("receipt_items")
                .select("*, product:products(*), location:locations(*)")
                .eq("receipt_id", receiptId);

            if (itemError) throw itemError;
            setItems(itms || []);
        } catch (err: unknown) {
            console.error("Error loading receipt:", err);
            const message = err instanceof Error ? err.message : "Failed to load receipt";
            setActionError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReceipt();
    }, [receiptId]);

    const handleValidateReceipt = async () => {
        if (!receipt) return;
        if (receipt.status === "done") return;

        setValidating(true);
        setActionError("");
        setActionSuccess("");

        try {
            // First ensure status is ready if it was draft/waiting
            if (receipt.status !== "ready") {
                await supabase
                    .from("receipts")
                    .update({ status: "ready" })
                    .eq("id", receipt.id);
            }

            // Call the existing Supabase stored procedure: validate_receipt
            const { error: rpcError } = await supabase.rpc("validate_receipt", {
                p_receipt_id: receipt.id,
            });

            if (rpcError) throw rpcError;

            const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
            setActionSuccess(
                `Receipt validated successfully! Stock increased by ${totalQty} units across designated warehouse locations and recorded in stock movement ledger.`
            );
            loadReceipt();
        } catch (err: unknown) {
            console.error("Error validating receipt:", err);
            const message = err instanceof Error ? err.message : "Failed to validate receipt.";
            setActionError(message);
        } finally {
            setValidating(false);
        }
    };

    const handleUpdateStatus = async (newStatus: DocumentStatus) => {
        if (!receipt) return;
        setActionError("");
        try {
            const { error } = await supabase
                .from("receipts")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", receipt.id);

            if (error) throw error;
            setActionSuccess(`Receipt status updated to ${newStatus}.`);
            loadReceipt();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update status.";
            setActionError(message);
        }
    };

    if (loading) {
        return (
            <AppLayout title="Receipt Order">
                <TableSkeleton rows={4} columns={5} />
            </AppLayout>
        );
    }

    if (!receipt) {
        return (
            <AppLayout title="Receipt Not Found">
                <EmptyState
                    icon={Truck}
                    title="Receipt Not Found"
                    description="The requested receipt record does not exist or has been removed."
                    actionLabel="Back to Receipts"
                    actionHref="/receipts"
                />
            </AppLayout>
        );
    }

    const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    return (
        <AppLayout
            title={`Receipt ${receipt.receipt_number}`}
            description={`Supplier intake order • Created on ${new Date(receipt.created_at).toLocaleString()}`}
            actions={
                <div className="flex items-center gap-2">
                    <Link
                        href="/receipts"
                        className="ss-button ss-button-secondary"
                    >
                        <ArrowLeft size={16} />
                        Back to Receipts
                    </Link>

                    {receipt.status !== "done" && receipt.status !== "canceled" && (
                        <Button
                            onClick={handleValidateReceipt}
                            isLoading={validating}
                            variant="primary"
                            icon={<PackageCheck size={16} />}
                        >
                            Validate Receipt
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
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <Truck size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 font-mono">
                                        {receipt.receipt_number}
                                    </h2>
                                    <StatusBadge status={receipt.status} type="document" />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Supplier: <span className="font-semibold text-slate-800">{receipt.supplier_name || "Direct Intake"}</span> • Facility:{" "}
                                    <span className="font-semibold text-slate-800">{receipt.warehouse?.name}</span>
                                </p>
                            </div>
                        </div>

                        {/* Status transition controls */}
                        {receipt.status !== "done" && receipt.status !== "canceled" && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                                <span className="text-xs text-slate-400 font-medium mr-1">Change Status:</span>
                                {receipt.status !== "ready" && (
                                    <button
                                        onClick={() => handleUpdateStatus("ready")}
                                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                                    >
                                        Mark Ready
                                    </button>
                                )}
                                {receipt.status !== "waiting" && (
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
                                Received Line Items
                            </h3>
                            <p className="text-xs text-slate-500">
                                Goods verified for storage deposit.
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
                                    <th>Target Storage Zone</th>
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
                                            <span className="font-mono font-bold text-slate-900 text-sm">
                                                +{it.quantity}
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
                            {receipt.notes && (
                                <p>
                                    <span className="font-semibold text-slate-700">Notes:</span> {receipt.notes}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                                Total Received:
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-base bg-white px-3 py-1 rounded-md border border-slate-200">
                                +{totalQuantity} units
                            </span>
                        </div>
                    </div>
                </div>

                {/* Validation Info Box if already validated */}
                {receipt.status === "done" && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <span className="font-bold block">Receipt Complete & Validated</span>
                            This order has been posted. Inventory quantities have been credited to the specified storage locations.
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
