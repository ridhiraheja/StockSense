"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { StockMove, Warehouse, Product, Location, StockMoveType } from "@/lib/types";
import {
    History,
    Search,
    Filter,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    SlidersHorizontal,
    Calendar,
    Download,
    RefreshCw,
} from "lucide-react";

interface StockMoveWithDetails extends StockMove {
    product?: Product;
    location?: Location & { warehouse?: Warehouse };
    source_location?: Location & { warehouse?: Warehouse };
    destination_location?: Location & { warehouse?: Warehouse };
}

export default function MoveHistoryPage() {
    const [moves, setMoves] = useState<StockMoveWithDetails[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

    const loadMovesData = async () => {
        setLoading(true);
        try {
            // 1. Fetch warehouses
            const { data: whs } = await supabase.from("warehouses").select("*");
            setWarehouses(whs || []);

            // 2. Fetch stock moves
            const { data: movesData, error: movesError } = await supabase
                .from("stock_moves")
                .select("*, product:products(*)")
                .order("created_at", { ascending: false });

            if (movesError) throw movesError;

            // 3. Fetch locations
            const { data: locs } = await supabase
                .from("locations")
                .select("*, warehouse:warehouses(*)");

            const enriched: StockMoveWithDetails[] = (movesData || []).map((m) => {
                const loc = locs?.find((l) => l.id === m.location_id);
                const src = locs?.find((l) => l.id === m.source_location_id);
                const dest = locs?.find((l) => l.id === m.destination_location_id);

                return {
                    ...m,
                    location: loc,
                    source_location: src,
                    destination_location: dest,
                };
            });

            setMoves(enriched);
        } catch (err) {
            console.error("Error loading stock moves:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMovesData();
    }, []);

    const filteredMoves = moves.filter((m) => {
        const matchesSearch =
            (m.product?.name && m.product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (m.product?.sku && m.product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (m.reference && m.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType = typeFilter === "all" || m.move_type === typeFilter;

        const matchesWarehouse =
            warehouseFilter === "all" ||
            m.location?.warehouse_id === warehouseFilter ||
            m.source_location?.warehouse_id === warehouseFilter ||
            m.destination_location?.warehouse_id === warehouseFilter;

        return matchesSearch && matchesType && matchesWarehouse;
    });

    const exportToCsv = () => {
        if (filteredMoves.length === 0) return;
        const headers = ["Date", "Product", "SKU", "Move Type", "Quantity", "UOM", "Location/Zone", "Reference", "Notes"];
        const rows = filteredMoves.map((m) => [
            new Date(m.created_at).toLocaleString(),
            m.product?.name || "Product",
            m.product?.sku || "",
            m.move_type,
            m.quantity,
            m.product?.unit_of_measure || "Units",
            m.location?.name || `${m.source_location?.name || ""} -> ${m.destination_location?.name || ""}`,
            m.reference || "",
            m.notes || "",
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `stock_ledger_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout
            title="Stock Ledger & Movement History"
            description="Complete audit log of all inventory intake, customer dispatch, internal transfers, and count reconciliations."
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadMovesData}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={exportToCsv}
                        disabled={filteredMoves.length === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition disabled:opacity-50"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            }
        >
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-72">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search by product, SKU, reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Movement Types</option>
                        <option value="receipt">+ Receipt (Intake)</option>
                        <option value="delivery">- Delivery (Dispatch)</option>
                        <option value="transfer_in">→ Transfer In</option>
                        <option value="transfer_out">← Transfer Out</option>
                        <option value="adjustment">~ Adjustment (Audit)</option>
                    </select>

                    <select
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Facilities</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="text-sm font-medium text-slate-500 w-full md:w-auto text-right">
                    Total Transactions: <span className="text-slate-900 font-bold">{filteredMoves.length}</span>
                </div>
            </div>

            {/* Movement Ledger Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading stock movement ledger...</p>
                </div>
            ) : filteredMoves.length === 0 ? (
                <EmptyState
                    icon={History}
                    title={searchQuery || typeFilter !== "all" ? "No movements match your filters" : "No stock movements recorded yet"}
                    description={
                        searchQuery || typeFilter !== "all"
                            ? "Try broadening your filter or search query."
                            : "Validated receipts, deliveries, transfers, and adjustments will automatically append immutable ledger entries here."
                    }
                />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Product & SKU</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Quantity</th>
                                    <th className="px-6 py-4">Facility & Location Zone</th>
                                    <th className="px-6 py-4">Reference / Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-normal">
                                {filteredMoves.map((m) => {
                                    const isPositive =
                                        m.move_type === "receipt" ||
                                        m.move_type === "transfer_in" ||
                                        (m.move_type === "adjustment" && m.quantity > 0);

                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/60 transition">
                                            <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                                {new Date(m.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-900 block">
                                                    {m.product?.name || "Product"}
                                                </span>
                                                <span className="font-mono text-xs text-slate-400">
                                                    SKU: {m.product?.sku || "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={m.move_type} type="move" />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span
                                                    className={`font-bold font-mono text-sm ${
                                                        isPositive ? "text-emerald-600" : "text-purple-600"
                                                    }`}
                                                >
                                                    {isPositive ? `+${m.quantity}` : m.quantity}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-1">
                                                    {m.product?.unit_of_measure || "Units"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {m.location ? (
                                                    <div>
                                                        <span className="font-medium text-slate-800 block">
                                                            {m.location.warehouse?.name || "Warehouse"}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            Zone: {m.location.name} ({m.location.code})
                                                        </span>
                                                    </div>
                                                ) : m.source_location && m.destination_location ? (
                                                    <div className="text-xs text-slate-600">
                                                        <span>{m.source_location.name}</span>
                                                        <span className="mx-1 text-slate-400">→</span>
                                                        <span>{m.destination_location.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Main Facility</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-semibold text-slate-700 block">
                                                    {m.reference || "DIRECT-LEDGER"}
                                                </span>
                                                {m.notes && (
                                                    <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                                                        {m.notes}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
