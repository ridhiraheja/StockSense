"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton, Alert } from "@/components/ui";
import { Receipt } from "@/lib/types";
import {
    Plus,
    Search,
    Truck,
    Filter,
    Calendar,
    ChevronRight,
    Eye,
} from "lucide-react";

interface ReceiptWithDetails extends Receipt {
    items_count?: number;
    total_quantity?: number;
}

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<ReceiptWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const loadReceipts = async () => {
        setLoading(true);
        try {
            const { data: recs, error: recError } = await supabase
                .from("receipts")
                .select("*, warehouse:warehouses(*), receipt_items(*, product:products(*))")
                .order("created_at", { ascending: false });

            if (recError) throw recError;

            const enriched = (recs || []).map((r) => {
                const items = r.receipt_items || [];
                const totalQty = items.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0);
                return {
                    ...r,
                    items_count: items.length,
                    total_quantity: totalQty,
                };
            });

            setReceipts(enriched);
        } catch (err) {
            console.error("Error loading receipts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReceipts();
    }, []);

    const filteredReceipts = receipts.filter((r) => {
        const matchesSearch =
            r.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.supplier_name && r.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (r.warehouse?.name && r.warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "all" || r.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout
            title="Receipt Orders"
            description="Intake incoming vendor shipments, assign warehouse bin locations, and validate inventory increases."
            actions={
                <Link
                    href="/receipts/new"
                    className="ss-button ss-button-primary"
                >
                    <Plus size={16} />
                    New Receipt
                </Link>
            }
        >
            {/* Filter Bar */}
            <div className="ss-card p-4 mb-6 flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-72">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search by receipt #, supplier, warehouse..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ss-input !pl-9"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="ss-select w-full sm:w-40"
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="waiting">Waiting</option>
                        <option value="ready">Ready</option>
                        <option value="done">Done</option>
                        <option value="canceled">Canceled</option>
                    </select>
                </div>

                <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    Showing <span className="font-bold text-slate-900">{filteredReceipts.length}</span> of {receipts.length} receipts
                </div>
            </div>

            {/* Receipts Table */}
            {loading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : filteredReceipts.length === 0 ? (
                <EmptyState
                    icon={Truck}
                    title="No receipts found"
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "No receipts match your search and filter parameters."
                            : "Create your first inbound receipt order to receive products from suppliers."
                    }
                    actionLabel="Create Receipt"
                    actionHref="/receipts/new"
                />
            ) : (
                <div className="ss-table-wrapper">
                    <table className="ss-table">
                        <thead>
                            <tr>
                                <th>Receipt Number</th>
                                <th>Supplier / Vendor</th>
                                <th>Warehouse</th>
                                <th>Items / Total Qty</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReceipts.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                                <Truck size={14} />
                                            </div>
                                            <Link
                                                href={`/receipts/${r.id}`}
                                                className="font-mono font-bold text-slate-900 hover:text-blue-600 transition"
                                            >
                                                {r.receipt_number}
                                            </Link>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="font-medium text-slate-800">
                                            {r.supplier_name || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-slate-600 text-xs">
                                            {r.warehouse?.name || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-600 font-medium">
                                                {r.items_count} line items
                                            </span>
                                            <span className="font-mono font-bold text-slate-900 text-xs">
                                                ({r.total_quantity} units)
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-slate-500 text-xs">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <StatusBadge status={r.status} type="document" />
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/receipts/${r.id}`}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition"
                                        >
                                            <Eye size={13} />
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AppLayout>
    );
}
