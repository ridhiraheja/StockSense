"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Receipt, Warehouse, DocumentStatus } from "@/lib/types";
import {
    Plus,
    Search,
    Truck,
    Filter,
    Calendar,
    ChevronRight,
    Eye,
    CheckCircle,
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
            description="Receive incoming shipments, record vendor deliveries, and auto-update stock."
            actions={
                <Link
                    href="/receipts/new"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    Create Receipt
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
                            placeholder="Search by receipt #, supplier, warehouse..."
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
                    Showing <span className="text-slate-900 font-bold">{filteredReceipts.length}</span> receipts
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading receipts...</p>
                </div>
            ) : filteredReceipts.length === 0 ? (
                <EmptyState
                    icon={Truck}
                    title={searchQuery || statusFilter !== "all" ? "No receipts match your search" : "No receipt orders found"}
                    description={
                        searchQuery || statusFilter !== "all"
                            ? "Try resetting your search query or status filter."
                            : "Create an incoming inventory receipt to intake items from vendors or suppliers."
                    }
                    actionLabel={searchQuery || statusFilter !== "all" ? undefined : "Create First Receipt"}
                    actionHref="/receipts/new"
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Receipt #</th>
                                    <th className="px-6 py-4">Supplier</th>
                                    <th className="px-6 py-4">Warehouse</th>
                                    <th className="px-6 py-4 text-center">Items / Quantity</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReceipts.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                                            <Link
                                                href={`/receipts/${r.id}`}
                                                className="text-blue-600 hover:underline flex items-center gap-1.5"
                                            >
                                                <Truck size={16} />
                                                {r.receipt_number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {r.supplier_name || "Direct Vendor"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700">
                                            {r.warehouse?.name || "Main Warehouse"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-slate-900">
                                                {r.items_count} item{r.items_count === 1 ? "" : "s"}
                                            </span>
                                            <span className="text-xs text-slate-400 block">
                                                ({r.total_quantity} total units)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={r.status} type="document" />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/receipts/${r.id}`}
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
