"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Delivery } from "@/lib/types";
import {
    Plus,
    Search,
    ShoppingCart,
    Filter,
    ChevronRight,
    CheckCircle,
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
            description="Fulfill customer orders, pick and pack items, and dispatch stock."
            actions={
                <Link
                    href="/deliveries/new"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    Create Delivery
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
                            placeholder="Search by delivery #, customer, warehouse..."
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
                    Showing <span className="text-slate-900 font-bold">{filteredDeliveries.length}</span> deliveries
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading delivery orders...</p>
                </div>
            ) : filteredDeliveries.length === 0 ? (
                <EmptyState
                    icon={ShoppingCart}
                    title={searchQuery || statusFilter !== "all" ? "No deliveries match your search" : "No delivery orders found"}
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "Try resetting your search query or status filter."
                            : "Create an outgoing customer delivery order to dispatch items from inventory."
                    }
                    actionLabel={searchQuery || statusFilter !== "all" ? undefined : "Create First Delivery"}
                    actionHref="/deliveries/new"
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Delivery #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Source Warehouse</th>
                                    <th className="px-6 py-4 text-center">Items / Quantity</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDeliveries.map((d) => (
                                    <tr key={d.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                                            <Link
                                                href={`/deliveries/${d.id}`}
                                                className="text-purple-600 hover:underline flex items-center gap-1.5"
                                            >
                                                <ShoppingCart size={16} />
                                                {d.delivery_number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {d.customer_name || "Direct Customer"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700">
                                            {d.warehouse?.name || "Main Warehouse"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-slate-900">
                                                {d.items_count} item{d.items_count === 1 ? "" : "s"}
                                            </span>
                                            <span className="text-xs text-slate-400 block">
                                                ({d.total_quantity} total units)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(d.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={d.status} type="document" />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/deliveries/${d.id}`}
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
