"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton, Alert } from "@/components/ui";
import { Transfer } from "@/lib/types";
import {
    Plus,
    Search,
    ArrowRightLeft,
    Filter,
    Calendar,
    Eye,
    ArrowRight,
} from "lucide-react";

interface TransferWithDetails extends Transfer {
    items_count?: number;
    total_quantity?: number;
}

export default function TransfersPage() {
    const [transfers, setTransfers] = useState<TransferWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const loadTransfers = async () => {
        setLoading(true);
        try {
            const { data: trfs, error: trfError } = await supabase
                .from("transfers")
                .select(
                    "*, source_location:locations!transfers_source_location_id_fkey(*, warehouse:warehouses(*)), destination_location:locations!transfers_destination_location_id_fkey(*, warehouse:warehouses(*)), transfer_items(*, product:products(*))"
                )
                .order("created_at", { ascending: false });

            if (trfError) throw trfError;

            const enriched = (trfs || []).map((t) => {
                const items = t.transfer_items || [];
                const totalQty = items.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0);
                return {
                    ...t,
                    items_count: items.length,
                    total_quantity: totalQty,
                };
            });

            setTransfers(enriched);
        } catch (err) {
            console.error("Error loading transfers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransfers();
    }, []);

    const filteredTransfers = transfers.filter((t) => {
        const matchesSearch =
            t.transfer_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.source_location?.name && t.source_location.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.destination_location?.name && t.destination_location.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.source_location?.warehouse?.name && t.source_location.warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "all" || t.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout
            title="Internal Stock Transfers"
            description="Relocate inventory between aisles, racks, and warehouse facilities without altering total enterprise holdings."
            actions={
                <Link
                    href="/transfers/new"
                    className="ss-button ss-button-primary"
                >
                    <Plus size={16} />
                    New Transfer
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
                            placeholder="Search by transfer #, source, destination..."
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
                    Showing <span className="font-bold text-slate-900">{filteredTransfers.length}</span> of {transfers.length} transfers
                </div>
            </div>

            {/* Transfers Table */}
            {loading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : filteredTransfers.length === 0 ? (
                <EmptyState
                    icon={ArrowRightLeft}
                    title="No transfers found"
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "No internal relocations match your filter criteria."
                            : "Create an internal transfer to move goods between storage zones."
                    }
                    actionLabel="New Transfer"
                    actionHref="/transfers/new"
                />
            ) : (
                <div className="ss-table-wrapper">
                    <table className="ss-table">
                        <thead>
                            <tr>
                                <th>Transfer #</th>
                                <th>Source → Destination Flow</th>
                                <th>Items / Total Quantity</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransfers.map((t) => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                                <ArrowRightLeft size={14} />
                                            </div>
                                            <Link
                                                href={`/transfers/${t.id}`}
                                                className="font-mono font-bold text-slate-900 hover:text-blue-600 transition"
                                            >
                                                {t.transfer_number}
                                            </Link>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium">
                                                {t.source_location?.warehouse?.name || "WH"} / {t.source_location?.name || "Source"}
                                            </div>
                                            <ArrowRight size={13} className="text-slate-400 shrink-0" />
                                            <div className="bg-blue-50 px-2 py-1 rounded text-blue-800 font-medium border border-blue-100">
                                                {t.destination_location?.warehouse?.name || "WH"} / {t.destination_location?.name || "Dest"}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-600 font-medium">
                                                {t.items_count} line items
                                            </span>
                                            <span className="font-mono font-bold text-slate-900 text-xs">
                                                ({t.total_quantity} units)
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-slate-500 text-xs">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <StatusBadge status={t.status} type="document" />
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/transfers/${t.id}`}
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
