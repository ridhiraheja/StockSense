"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
    Package,
    AlertTriangle,
    Truck,
    ShoppingCart,
    ArrowRightLeft,
    SlidersHorizontal,
    Plus,
    Boxes,
    ChevronRight,
    ArrowUpRight,
    TrendingUp,
    ShieldAlert,
    Clock,
    Warehouse,
    Filter,
} from "lucide-react";

export default function DashboardPage() {
    const [totalStock, setTotalStock] = useState<number>(0);
    const [totalProducts, setTotalProducts] = useState<number>(0);
    const [lowStockCount, setLowStockCount] = useState<number>(0);
    const [pendingReceipts, setPendingReceipts] = useState<number>(0);
    const [pendingDeliveries, setPendingDeliveries] = useState<number>(0);
    const [pendingTransfers, setPendingTransfers] = useState<number>(0);

    const [recentMoves, setRecentMoves] = useState<any[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
    const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
    const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);

    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Document Filter in Dashboard
    const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [whFilter, setWhFilter] = useState<string>("all");
    const [catFilter, setCatFilter] = useState<string>("all");

    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Total Products count
            const { count: prodCount } = await supabase
                .from("products")
                .select("*", { count: "exact", head: true });
            setTotalProducts(prodCount || 0);

            // 2. Fetch warehouses & categories
            const { data: whs } = await supabase.from("warehouses").select("*");
            setWarehouses(whs || []);

            const { data: cats } = await supabase.from("categories").select("*");
            setCategories(cats || []);

            // 3. Total units in stock via RPC get_total_stock
            const { data: totalUnits } = await supabase.rpc("get_total_stock");
            setTotalStock(typeof totalUnits === "number" ? totalUnits : 0);

            // 4. Low stock count via RPC get_low_stock_count or calculation
            const { data: lowCount } = await supabase.rpc("get_low_stock_count");

            // Fetch products with their stock levels & reorder rules
            const { data: allProds } = await supabase
                .from("products")
                .select("*, category:categories(*)");
            const { data: allStocks } = await supabase.from("stock_levels").select("*");
            const { data: allRules } = await supabase.from("reorder_rules").select("*");

            const productStockSummaries = (allProds || []).map((p) => {
                const pStocks = (allStocks || []).filter((s) => s.product_id === p.id);
                const currentStock = pStocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
                const rule = (allRules || []).find((r) => r.product_id === p.id);
                const minThreshold = rule ? Number(rule.min_quantity) : 5;

                return {
                    ...p,
                    current_stock: currentStock,
                    min_threshold: minThreshold,
                    is_low_stock: currentStock <= minThreshold,
                    is_out_of_stock: currentStock <= 0,
                };
            });

            const lowList = productStockSummaries.filter((p) => p.is_low_stock);
            setLowStockProducts(lowList.slice(0, 5));
            setLowStockCount(typeof lowCount === "number" && lowCount > 0 ? lowCount : lowList.length);

            // 5. Pending documents counts
            const { count: recCount } = await supabase
                .from("receipts")
                .select("*", { count: "exact", head: true })
                .in("status", ["draft", "waiting", "ready"]);
            setPendingReceipts(recCount || 0);

            const { count: delCount } = await supabase
                .from("deliveries")
                .select("*", { count: "exact", head: true })
                .in("status", ["draft", "waiting", "ready"]);
            setPendingDeliveries(delCount || 0);

            const { count: trfCount } = await supabase
                .from("transfers")
                .select("*", { count: "exact", head: true })
                .in("status", ["draft", "waiting", "ready"]);
            setPendingTransfers(trfCount || 0);

            // 6. Recent Stock Moves
            const { data: moves } = await supabase
                .from("stock_moves")
                .select("*, product:products(*), location:locations(*, warehouse:warehouses(*))")
                .order("created_at", { ascending: false })
                .limit(6);
            setRecentMoves(moves || []);

            // 7. Recent Receipts
            const { data: recs } = await supabase
                .from("receipts")
                .select("*, warehouse:warehouses(*)")
                .order("created_at", { ascending: false })
                .limit(4);
            setRecentReceipts(recs || []);

            // 8. Recent Deliveries
            const { data: dels } = await supabase
                .from("deliveries")
                .select("*, warehouse:warehouses(*)")
                .order("created_at", { ascending: false })
                .limit(4);
            setRecentDeliveries(dels || []);
        } catch (err) {
            console.error("Error loading dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    // Filtered Recent Moves according to dashboard filters
    const filteredRecentMoves = recentMoves.filter((m) => {
        const matchesType = docTypeFilter === "all" || m.move_type === docTypeFilter;
        const matchesWarehouse =
            whFilter === "all" || m.location?.warehouse_id === whFilter;
        const matchesCategory =
            catFilter === "all" || m.product?.category_id === catFilter;
        return matchesType && matchesWarehouse && matchesCategory;
    });

    return (
        <AppLayout
            title="Executive Inventory Dashboard"
            description="Real-time key performance indicators, inventory health, and operational dispatch flows."
            actions={
                <Link
                    href="/products/new"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    Add Product
                </Link>
            }
        >
            {/* KPI STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                <StatCard
                    title="Total Products"
                    value={totalProducts}
                    description={`${totalStock} total units in stock`}
                    icon={Package}
                    color="blue"
                    href="/products"
                />
                <StatCard
                    title="Low / Out of Stock"
                    value={lowStockCount}
                    description={lowStockCount > 0 ? "Requires reordering" : "Optimal levels"}
                    icon={AlertTriangle}
                    color={lowStockCount > 0 ? "red" : "green"}
                    href="/products"
                />
                <StatCard
                    title="Pending Receipts"
                    value={pendingReceipts}
                    description="Incoming vendor orders"
                    icon={Truck}
                    color="green"
                    href="/receipts"
                />
                <StatCard
                    title="Pending Deliveries"
                    value={pendingDeliveries}
                    description="Outbound customer orders"
                    icon={ShoppingCart}
                    color="purple"
                    href="/deliveries"
                />
                <StatCard
                    title="Transfers Scheduled"
                    value={pendingTransfers}
                    description="Internal relocations"
                    icon={ArrowRightLeft}
                    color="indigo"
                    href="/transfers"
                />
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            Quick Inventory Operations
                        </h3>
                        <p className="text-xs text-slate-500">
                            Perform common warehouse transactions with one click.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Link
                        href="/products/new"
                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/60 hover:border-blue-300 transition text-center group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                            <Plus size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Add Product</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Register new SKU</span>
                    </Link>

                    <Link
                        href="/receipts/new"
                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/60 hover:border-emerald-300 transition text-center group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                            <Truck size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Create Receipt</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Receive shipment</span>
                    </Link>

                    <Link
                        href="/deliveries/new"
                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/60 hover:border-purple-300 transition text-center group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                            <ShoppingCart size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Create Delivery</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Dispatch order</span>
                    </Link>

                    <Link
                        href="/transfers/new"
                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/60 hover:border-indigo-300 transition text-center group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                            <ArrowRightLeft size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Internal Transfer</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Move zones</span>
                    </Link>

                    <Link
                        href="/adjustments/new"
                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-amber-50/60 hover:border-amber-300 transition text-center group col-span-2 sm:col-span-1"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                            <SlidersHorizontal size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Stock Adjustment</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Shelf audit count</span>
                    </Link>
                </div>
            </div>

            {/* DASHBOARD LIVE METRICS & FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-8 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                    <Filter size={15} className="text-blue-600" />
                    Dashboard View Filters:
                </div>

                <div className="flex flex-wrap gap-2 flex-1 justify-end">
                    <select
                        value={docTypeFilter}
                        onChange={(e) => setDocTypeFilter(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Movements</option>
                        <option value="receipt">Receipts (+)</option>
                        <option value="delivery">Deliveries (-)</option>
                        <option value="transfer_in">Transfers</option>
                        <option value="adjustment">Adjustments (~)</option>
                    </select>

                    <select
                        value={whFilter}
                        onChange={(e) => setWhFilter(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Warehouses</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={catFilter}
                        onChange={(e) => setCatFilter(e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* TWO COLUMN CONTENT: RECENT MOVEMENTS & LOW STOCK ALERTS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                {/* Recent Stock Movements */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Recent Stock Movements
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Live activity ledger recorded in PostgreSQL.
                                </p>
                            </div>
                            <Link
                                href="/moves"
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                            >
                                View All Ledger →
                            </Link>
                        </div>

                        {filteredRecentMoves.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                No recent movements matching your filters.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredRecentMoves.map((m) => {
                                    const isPositive =
                                        m.move_type === "receipt" ||
                                        m.move_type === "transfer_in" ||
                                        (m.move_type === "adjustment" && m.quantity > 0);

                                    return (
                                        <div
                                            key={m.id}
                                            className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition text-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                    <Boxes size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 leading-tight">
                                                        {m.product?.name || "Product"}
                                                    </p>
                                                    <span className="text-[11px] text-slate-400 font-mono">
                                                        {m.product?.sku} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <StatusBadge status={m.move_type} type="move" />
                                                <span
                                                    className={`font-mono font-bold text-sm min-w-16 text-right ${
                                                        isPositive ? "text-emerald-600" : "text-purple-600"
                                                    }`}
                                                >
                                                    {isPositive ? `+${m.quantity}` : m.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                        <Link
                            href="/moves"
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                            Open Full Stock History →
                        </Link>
                    </div>
                </div>

                {/* Low Stock Watchlist */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <ShieldAlert size={18} className="text-rose-600" />
                                    Low Stock Alerts
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Items near or below reorder threshold.
                                </p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                {lowStockProducts.length} items
                            </span>
                        </div>

                        {lowStockProducts.length === 0 ? (
                            <div className="p-8 text-center text-xs text-emerald-600 font-medium">
                                ✓ All stock levels are currently above minimum reorder points!
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {lowStockProducts.map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition text-sm"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-900">{p.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">
                                                SKU: {p.sku}
                                            </p>
                                        </div>

                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <span
                                                    className={`font-bold block text-sm ${
                                                        p.current_stock <= 0
                                                            ? "text-rose-600"
                                                            : "text-amber-600"
                                                    }`}
                                                >
                                                    {p.current_stock} / {p.min_threshold} min
                                                </span>
                                                <StatusBadge
                                                    status={p.current_stock <= 0 ? "Out of Stock" : "Low Stock"}
                                                    type="stock"
                                                />
                                            </div>
                                            <Link
                                                href="/receipts/new"
                                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                                title="Create Receipt"
                                            >
                                                <Plus size={16} />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                        <Link
                            href="/products"
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                            View All Catalog Stock →
                        </Link>
                    </div>
                </div>
            </div>

            {/* LOWER ROW: RECENT RECEIPTS & DELIVERIES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Recent Receipts */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Truck size={18} className="text-emerald-600" />
                            Recent Inbound Receipts
                        </h3>
                        <Link href="/receipts" className="text-xs font-semibold text-blue-600 hover:underline">
                            View All
                        </Link>
                    </div>

                    {recentReceipts.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No recent receipts recorded.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentReceipts.map((r) => (
                                <Link
                                    key={r.id}
                                    href={`/receipts/${r.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 transition border border-slate-200 text-xs"
                                >
                                    <div>
                                        <span className="font-mono font-bold text-slate-900 block">
                                            {r.receipt_number}
                                        </span>
                                        <span className="text-slate-500">
                                            {r.supplier_name || "Vendor"} • {r.warehouse?.name}
                                        </span>
                                    </div>
                                    <StatusBadge status={r.status} type="document" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Deliveries */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <ShoppingCart size={18} className="text-purple-600" />
                            Recent Outbound Deliveries
                        </h3>
                        <Link href="/deliveries" className="text-xs font-semibold text-purple-600 hover:underline">
                            View All
                        </Link>
                    </div>

                    {recentDeliveries.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No recent deliveries recorded.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentDeliveries.map((d) => (
                                <Link
                                    key={d.id}
                                    href={`/deliveries/${d.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-purple-50/50 transition border border-slate-200 text-xs"
                                >
                                    <div>
                                        <span className="font-mono font-bold text-slate-900 block">
                                            {d.delivery_number}
                                        </span>
                                        <span className="text-slate-500">
                                            {d.customer_name || "Customer"} • {d.warehouse?.name}
                                        </span>
                                    </div>
                                    <StatusBadge status={d.status} type="document" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}