"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Adjustment } from "@/lib/types";
import {
    Plus,
    Search,
    SlidersHorizontal,
    Filter,
    ChevronRight,
    CheckCircle,
} from "lucide-react";

interface AdjustmentWithDetails extends Adjustment {
    items_count?: number;
}

export default function AdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<AdjustmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const loadAdjustments = async () => {
        setLoading(true);
        try {
            const { data: adjs, error: adjError } = await supabase
                .from("adjustments")
                .select("*, warehouse:warehouses(*), adjustment_items(*, product:products(*))")
                .order("created_at", { ascending: false });

            if (adjError) throw adjError;

            const enriched = (adjs || []).map((a) => {
                const items = a.adjustment_items || [];
                return {
                    ...a,
                    items_count: items.length,
                };
            });

            setAdjustments(enriched);
        } catch (err) {
            console.error("Error loading adjustments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdjustments();
    }, []);

    const filteredAdjustments = adjustments.filter((a) => {
        const matchesSearch =
            a.adjustment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.warehouse?.name && a.warehouse.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.notes && a.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "all" || a.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout
            title="Inventory Adjustments"
            description="Reconcile system quantities with physical warehouse counts and record discrepancies."
            actions={
                <Link
                    href="/adjustments/new"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    New Adjustment
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
                            placeholder="Search by adjustment #, warehouse, notes..."
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
                    Showing <span className="text-slate-900 font-bold">{filteredAdjustments.length}</span> adjustments
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading adjustments...</p>
                </div>
            ) : filteredAdjustments.length === 0 ? (
                <EmptyState
                    icon={SlidersHorizontal}
                    title={searchQuery || statusFilter !== "all" ? "No adjustments match your search" : "No stock adjustments recorded"}
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "Try adjusting your search query or filter."
                            : "Perform a stock adjustment to align system inventory with physical shelf audits."
                    }
                    actionLabel={searchQuery || statusFilter !== "all" ? undefined : "Create Adjustment"}
                    actionHref="/adjustments/new"
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Adjustment #</th>
                                    <th className="px-6 py-4">Warehouse</th>
                                    <th className="px-6 py-4 text-center">Audited Lines</th>
                                    <th className="px-6 py-4">Notes</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAdjustments.map((a) => (
                                    <tr key={a.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                                            <Link
                                                href={`/adjustments/${a.id}`}
                                                className="text-amber-600 hover:underline flex items-center gap-1.5"
                                            >
                                                <SlidersHorizontal size={16} />
                                                {a.adjustment_number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {a.warehouse?.name || "Main Warehouse"}
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-slate-900">
                                            {a.items_count} item{a.items_count === 1 ? "" : "s"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                            {a.notes || "Physical stock count"}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(a.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={a.status} type="document" />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/adjustments/${a.id}`}
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
