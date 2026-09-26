"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Transfer } from "@/lib/types";
import {
    Plus,
    Search,
    ArrowRightLeft,
    Filter,
    ChevronRight,
    CheckCircle,
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
            const { data: trs, error: trError } = await supabase
                .from("transfers")
                .select(
                    "*, source_location:locations!transfers_source_location_id_fkey(*, warehouse:warehouses(*)), destination_location:locations!transfers_destination_location_id_fkey(*, warehouse:warehouses(*)), transfer_items(*, product:products(*))"
                )
                .order("created_at", { ascending: false });

            if (trError) {
                // Fallback query if relation names vary
                const { data: simpleTrs, error: simpleError } = await supabase
                    .from("transfers")
                    .select("*, transfer_items(*, product:products(*))")
                    .order("created_at", { ascending: false });

                if (simpleError) throw simpleError;

                // Also fetch locations
                const { data: allLocs } = await supabase
                    .from("locations")
                    .select("*, warehouse:warehouses(*)");

                const enriched = (simpleTrs || []).map((t) => {
                    const src = allLocs?.find((l) => l.id === t.source_location_id);
                    const dest = allLocs?.find((l) => l.id === t.destination_location_id);
                    const items = t.transfer_items || [];
                    const totalQty = items.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0);
                    return {
                        ...t,
                        source_location: src,
                        destination_location: dest,
                        items_count: items.length,
                        total_quantity: totalQty,
                    };
                });
                setTransfers(enriched);
            } else {
                const enriched = (trs || []).map((t) => {
                    const items = t.transfer_items || [];
                    const totalQty = items.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0);
                    return {
                        ...t,
                        items_count: items.length,
                        total_quantity: totalQty,
                    };
                });
                setTransfers(enriched);
            }
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
            (t.destination_location?.name && t.destination_location.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "all" || t.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout
            title="Internal Transfers"
            description="Move stock between warehouse zones, bins, or external facilities."
            actions={
                <Link
                    href="/transfers/new"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    New Transfer
                </Link>
            }
        >
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-72">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search by transfer #, source, destination..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="waiting">Waiting</option>
                        <option value="ready">Ready</option>
                        <option value="done">Done</option>
                        <option value="canceled">Canceled</option>
                    </select>
                </div>

                <div className="text-sm font-medium text-slate-500 w-full md:w-auto text-right">
                    Showing <span className="text-slate-900 font-bold">{filteredTransfers.length}</span> transfers
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading transfers...</p>
                </div>
            ) : filteredTransfers.length === 0 ? (
                <EmptyState
                    icon={ArrowRightLeft}
                    title={searchQuery || statusFilter !== "all" ? "No transfers match your search" : "No internal transfers found"}
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "Try resetting your search query or status filter."
                            : "Create an internal transfer to move stock between storage locations or racks."
                    }
                    actionLabel={searchQuery || statusFilter !== "all" ? undefined : "Create First Transfer"}
                    actionHref="/transfers/new"
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Transfer #</th>
                                    <th className="px-6 py-4">Source Location</th>
                                    <th className="px-6 py-4">Destination Location</th>
                                    <th className="px-6 py-4 text-center">Items / Quantity</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransfers.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                                            <Link
                                                href={`/transfers/${t.id}`}
                                                className="text-indigo-600 hover:underline flex items-center gap-1.5"
                                            >
                                                <ArrowRightLeft size={16} />
                                                {t.transfer_number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-900 block">
                                                {t.source_location?.name || "Source Zone"}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {t.source_location?.warehouse?.name || "Warehouse"} ({t.source_location?.code})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-900 block">
                                                {t.destination_location?.name || "Destination Zone"}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {t.destination_location?.warehouse?.name || "Warehouse"} ({t.destination_location?.code})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-slate-900">
                                                {t.items_count} item{t.items_count === 1 ? "" : "s"}
                                            </span>
                                            <span className="text-xs text-slate-400 block">
                                                ({t.total_quantity} total units)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={t.status} type="document" />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/transfers/${t.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                            >
                                                View
                                                <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
