"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton, Alert } from "@/components/ui";
import { StockMove, Warehouse, Product, Location } from "@/lib/types";
import {
    History,
    Search,
    Filter,
    Download,
    RefreshCw,
    Boxes,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    SlidersHorizontal,
    FileSpreadsheet,
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
        const headers = ["Date", "Product", "SKU", "Movement Type", "Quantity", "UOM", "Source/Location", "Destination", "Reference", "Notes"];
        const rows = filteredMoves.map((m) => [
            new Date(m.created_at).toLocaleString(),
            m.product?.name || "Product",
            m.product?.sku || "",
            m.move_type,
            m.quantity,
            m.product?.unit_of_measure || "Units",
            m.location?.name || m.source_location?.name || "",
            m.destination_location?.name || "",
            m.reference || "",
            m.notes || "",
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `stocksense_ledger_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout
            title="Stock Movement Ledger"
            description="Immutable audit trail of all receipts, customer shipments, internal relocations, and inventory adjustments."
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadMovesData}
                        className="ss-button ss-button-secondary"
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                    <button
                        onClick={exportToCsv}
                        disabled={filteredMoves.length === 0}
                        className="ss-button ss-button-primary"
                    >
                        <FileSpreadsheet size={15} />
                        Export CSV
                    </button>
                </div>
            }
        >
            {/* Filters Bar */}
            <div className="ss-card p-4 mb-6 flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-72">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search by SKU, product, reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ss-input !pl-9"
                        />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="ss-select w-full sm:w-44"
                    >
                        <option value="all">All Movement Types</option>
                        <option value="receipt">Receipts (+)</option>
                        <option value="delivery">Deliveries (-)</option>
                        <option value="transfer_in">Transfers In (→)</option>
                        <option value="transfer_out">Transfers Out (←)</option>
                        <option value="adjustment">Adjustments (~)</option>
                    </select>

                    <select
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className="ss-select w-full sm:w-44"
                    >
                        <option value="all">All Warehouses</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    Showing <span className="font-bold text-slate-900">{filteredMoves.length}</span> recorded transactions
                </div>
            </div>

            {/* Ledger Table */}
            {loading ? (
                <TableSkeleton rows={8} columns={7} />
            ) : filteredMoves.length === 0 ? (
                <EmptyState
                    icon={History}
                    title="No stock movements found"
                    description={
                        searchQuery || typeFilter !== "all" || warehouseFilter !== "all"
                            ? "No transactions match your current search and filter parameters."
                            : "Validated receipts, deliveries, transfers, and adjustments will appear in this ledger."
                    }
                />
            ) : (
                <div className="ss-table-wrapper">
                    <table className="ss-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Product & SKU</th>
                                <th>Movement Type</th>
                                <th>Quantity</th>
                                <th>Source Location</th>
                                <th>Destination Location</th>
                                <th>Reference / Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMoves.map((m) => {
                                const isPositive =
                                    m.move_type === "receipt" ||
                                    m.move_type === "transfer_in" ||
                                    (m.move_type === "adjustment" && m.quantity > 0);

                                return (
                                    <tr key={m.id}>
                                        <td>
                                            <span className="text-xs text-slate-600 block whitespace-nowrap">
                                                {new Date(m.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                    <Boxes size={14} />
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-900 block leading-tight">
                                                        {m.product?.name || "Product"}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-slate-400">
                                                        {m.product?.sku}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <StatusBadge status={m.move_type} type="move" />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1 font-mono font-bold text-xs">
                                                <span
                                                    className={
                                                        isPositive
                                                            ? "text-emerald-600 font-bold"
                                                            : "text-purple-600 font-bold"
                                                    }
                                                >
                                                    {isPositive ? `+${m.quantity}` : m.quantity}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-normal">
                                                    {m.product?.unit_of_measure || "Units"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xs text-slate-700">
                                                {m.source_location
                                                    ? `${m.source_location.warehouse?.name || "WH"} / ${m.source_location.name}`
                                                    : m.location
                                                    ? `${m.location.warehouse?.name || "WH"} / ${m.location.name}`
                                                    : "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-xs text-slate-700">
                                                {m.destination_location
                                                    ? `${m.destination_location.warehouse?.name || "WH"} / ${m.destination_location.name}`
                                                    : "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <span className="font-mono font-semibold text-slate-800 text-xs block">
                                                    {m.reference || "—"}
                                                </span>
                                                {m.notes && (
                                                    <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                                                        {m.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </AppLayout>
    );
}
