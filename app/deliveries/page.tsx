"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton, Alert } from "@/components/ui";
import { Delivery } from "@/lib/types";
import {
    Plus,
    Search,
    ShoppingCart,
    Filter,
    Calendar,
    Eye,
} from "lucide-react";

interface DeliveryWithDetails extends Delivery {
    items_count?: number;
    total_quantity?: number;
}

export default function DeliveriesPage() {
    const [deliveries, setDeliveries] = useState<DeliveryWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const loadDeliveries = async () => {
        setLoading(true);
        try {
            const { data: dels, error: delError } = await supabase
                .from("deliveries")
                .select("*, warehouse:warehouses(*), delivery_items(*, product:products(*))")
                .order("created_at", { ascending: false });

            if (delError) throw delError;

            const enriched = (dels || []).map((d) => {
                const items = d.delivery_items || [];
                const totalQty = items.reduce((acc: number, curr: any) => acc + (Number(curr.quantity) || 0), 0);
                return {
                    ...d,
                    items_count: items.length,
                    total_quantity: totalQty,
                };
            });

            setDeliveries(enriched);
        } catch (err) {
            console.error("Error loading deliveries:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDeliveries();
    }, []);

    const filteredDeliveries = deliveries.filter((d) => {
        const matchesSearch =
            d.delivery_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.customer_name && d.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (d.warehouse?.name && d.warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "all" || d.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout
            title="Delivery Orders"
            description="Manage outbound customer shipments, check stock availability, and validate dispatches."
            actions={
                <Link
                    href="/deliveries/new"
                    className="ss-button ss-button-primary"
                >
                    <Plus size={16} />
                    New Delivery
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
                            placeholder="Search by order #, customer, warehouse..."
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
                    Showing <span className="font-bold text-slate-900">{filteredDeliveries.length}</span> of {deliveries.length} deliveries
                </div>
            </div>

            {/* Deliveries Table */}
            {loading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : filteredDeliveries.length === 0 ? (
                <EmptyState
                    icon={ShoppingCart}
                    title="No delivery orders found"
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "No delivery orders match your search criteria."
                            : "Create your first outbound delivery order to fulfill customer requests."
                    }
                    actionLabel="Create Delivery"
                    actionHref="/deliveries/new"
                />
            ) : (
                <div className="ss-table-wrapper">
                    <table className="ss-table">
                        <thead>
                            <tr>
                                <th>Delivery Order #</th>
                                <th>Customer Name</th>
                                <th>Warehouse Source</th>
                                <th>Items / Total Qty</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeliveries.map((d) => (
                                <tr key={d.id}>
                                    <td>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                                <ShoppingCart size={14} />
                                            </div>
                                            <Link
                                                href={`/deliveries/${d.id}`}
                                                className="font-mono font-bold text-slate-900 hover:text-blue-600 transition"
                                            >
                                                {d.delivery_number}
                                            </Link>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="font-medium text-slate-800">
                                            {d.customer_name || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-slate-600 text-xs">
                                            {d.warehouse?.name || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-600 font-medium">
                                                {d.items_count} line items
                                            </span>
                                            <span className="font-mono font-bold text-slate-900 text-xs">
                                                ({d.total_quantity} units)
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-slate-500 text-xs">
                                            {new Date(d.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <StatusBadge status={d.status} type="document" />
                                    </td>
                                    <td className="text-right">
                                        <Link
                                            href={`/deliveries/${d.id}`}
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
