"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton, Alert } from "@/components/ui";
import { Adjustment } from "@/lib/types";
import {
    Plus,
    Search,
    SlidersHorizontal,
    Filter,
    Calendar,
    Eye,
} from "lucide-react";

interface AdjustmentWithDetails extends Adjustment {
    items_count?: number;
    total_difference?: number;
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
                const netDiff = items.reduce((acc: number, curr: any) => acc + (Number(curr.difference) || 0), 0);
                return {
                    ...a,
                    items_count: items.length,
                    total_difference: netDiff,
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
            title="Stock Adjustments & Audits"
            description="Reconcile physical inventory counts against system records to resolve discrepancies."
            actions={
                <Link
                    href="/adjustments/new"
                    className="ss-button ss-button-primary"
                >
                    <Plus size={16} />
                    New Adjustment
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
                            placeholder="Search by adjustment #, warehouse..."
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
                    Showing <span className="font-bold text-slate-900">{filteredAdjustments.length}</span> of {adjustments.length} adjustments
                </div>
            </div>

            {/* Adjustments Table */}
            {loading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : filteredAdjustments.length === 0 ? (
                <EmptyState
                    icon={SlidersHorizontal}
                    title="No adjustments found"
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "No adjustments match your current filter parameters."
                            : "Perform an adjustment to correct stock discrepancies discovered during physical cycle counts."
                    }
                    actionLabel="New Adjustment"
                    actionHref="/adjustments/new"
                />
            ) : (
                <div className="ss-table-wrapper">
                    <table className="ss-table">
                        <thead>
                            <tr>
                                <th>Adjustment #</th>
                                <th>Warehouse Facility</th>
                                <th>Reconciled Items</th>
                                <th>Net Correction</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdjustments.map((a) => (
                                <tr key={a.id}>
                                    <td>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-bold text-xs">
                                                <SlidersHorizontal size={14} />
                                            </div>
                                            <Link
                                                href={`/adjustments/${a.id}`}
                                                className="font-mono font-bold text-slate-900 hover:text-blue-600 transition"
                                            >
                                                {a.adjustment_number}
                                            </Link>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="font-medium text-slate-800">
                                            {a.warehouse?.name || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-xs text-slate-600">
                                            {a.items_count} SKU items
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`font-mono font-bold text-xs ${
                                                (a.total_difference || 0) > 0
                                                    ? "text-emerald-600"
                                                    : (a.total_difference || 0) < 0
                                                    ? "text-rose-600"
                                                    : "text-slate-600"
                                            }`}
                                        >
                                            {(a.total_difference || 0) > 0
                                                ? `+${a.total_difference}`
                                                : a.total_difference}{" "}
                                            units
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-slate-500 text-xs">
                                            {new Date(a.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <StatusBadge status={a.status} type="document" />
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/adjustments/${a.id}`}
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
