"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui";
import {
    Package,
    AlertTriangle,
    Truck,
    ShoppingCart,
    ArrowRightLeft,
    SlidersHorizontal,
    Plus,
    Boxes,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Layers,
    Warehouse,
    ShieldAlert,
    CheckCircle2,
    Calendar,
    ChevronRight,
    Activity,
    TrendingUp,
    Sparkles,
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
            title="Inventory Overview"
            description="Real-time stock analytics, inventory health alerts, and operational dispatch telemetry."
            actions={
                <div className="flex items-center gap-2.5">
                    <Link
                        href="/receipts/new"
                        className="ss-button ss-button-secondary hidden sm:inline-flex text-xs font-semibold"
                    >
                        <Truck size={14} className="text-emerald-600" />
                        Receive Stock
                    </Link>
                    <Link
                        href="/products/new"
                        className="ss-button ss-button-primary text-xs font-bold"
                    >
                        <Plus size={16} />
                        Add Product
                    </Link>
                </div>
            }
        >
            {/* LUXURY COMMAND HERO BANNER */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#090D16] via-[#111827] to-[#0f172a] p-6 md:p-7 text-white shadow-xl shadow-slate-950/10 border border-slate-800/80 mb-6">
                {/* Ambient Decorative Radial Glows */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            StockSense Engine Active
                            <span className="text-blue-400/60">•</span>
                            <span className="text-slate-300 font-normal">Realtime Sync</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                            Warehouse Command & Operations
                        </h2>
                        <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
                            Monitor enterprise inventory levels across {warehouses.length} facility zones, process receipts, and dispatch outbound shipments.
                        </p>
                    </div>

                    {/* Quick Telemetry Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl text-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Facilities</span>
                            <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">{warehouses.length}</span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl text-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Categories</span>
                            <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">{categories.length}</span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl text-center col-span-2 sm:col-span-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Inventory Health</span>
                            <span className={`text-xl font-extrabold font-mono mt-0.5 block ${lowStockCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                {lowStockCount > 0 ? `${lowStockCount} Alerts` : "100% OK"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI STATS ROW */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="ss-card p-5 space-y-3">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-2 w-28" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <StatCard
                        title="Total in Stock"
                        value={totalStock.toLocaleString()}
                        description={`${totalProducts} unique SKU products`}
                        icon={Package}
                        color="blue"
                        href="/products"
                    />
                    <StatCard
                        title="Low / Out of Stock"
                        value={lowStockCount}
                        description={lowStockCount > 0 ? "Requires purchase order" : "Optimal safety stock"}
                        icon={AlertTriangle}
                        color={lowStockCount > 0 ? "red" : "green"}
                        href="/products"
                    />
                    <StatCard
                        title="Pending Receipts"
                        value={pendingReceipts}
                        description="Incoming supplier orders"
                        icon={Truck}
                        color="green"
                        href="/receipts"
                    />
                    <StatCard
                        title="Pending Deliveries"
                        value={pendingDeliveries}
                        description="Customer dispatch orders"
                        icon={ShoppingCart}
                        color="purple"
                        href="/deliveries"
                    />
                    <StatCard
                        title="Transfers Scheduled"
                        value={pendingTransfers}
                        description="Internal bin relocations"
                        icon={ArrowRightLeft}
                        color="indigo"
                        href="/transfers"
                    />
                </div>
            )}

            {/* QUICK ACTIONS ROW WITH COLORFUL TILES */}
            <div className="ss-card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Activity size={16} className="text-blue-600" />
                            Operations Launchpad
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Instant dispatch and document creation workflows.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    <Link
                        href="/receipts/new"
                        className="flex items-center gap-3.5 p-4 rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white hover:from-emerald-500/15 hover:to-emerald-100/40 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-200 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-200">
                            <Truck size={19} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-emerald-700">New Receipt</span>
                            <span className="text-[11px] text-slate-500 block truncate font-medium">Inbound supplier</span>
                        </div>
                    </Link>

                    <Link
                        href="/deliveries/new"
                        className="flex items-center gap-3.5 p-4 rounded-xl border border-purple-200/70 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white hover:from-purple-500/15 hover:to-purple-100/40 hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/10 transition-all duration-200 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/25 group-hover:scale-110 transition-transform duration-200">
                            <ShoppingCart size={19} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-purple-700">New Delivery</span>
                            <span className="text-[11px] text-slate-500 block truncate font-medium">Customer dispatch</span>
                        </div>
                    </Link>

                    <Link
                        href="/transfers/new"
                        className="flex items-center gap-3.5 p-4 rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white hover:from-indigo-500/15 hover:to-indigo-100/40 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-200 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-200">
                            <ArrowRightLeft size={19} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-indigo-700">New Transfer</span>
                            <span className="text-[11px] text-slate-500 block truncate font-medium">Relocate bins</span>
                        </div>
                    </Link>

                    <Link
                        href="/adjustments/new"
                        className="flex items-center gap-3.5 p-4 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white hover:from-amber-500/15 hover:to-amber-100/40 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/10 transition-all duration-200 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25 group-hover:scale-110 transition-transform duration-200">
                            <SlidersHorizontal size={19} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-amber-700">Stock Adjustment</span>
                            <span className="text-[11px] text-slate-500 block truncate font-medium">Physical audit</span>
                        </div>
                    </Link>

                    <Link
                        href="/products/new"
                        className="flex items-center gap-3.5 p-4 rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white hover:from-blue-500/15 hover:to-blue-100/40 hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200 group col-span-2 sm:col-span-1"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform duration-200">
                            <Plus size={19} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-blue-700">Register Product</span>
                            <span className="text-[11px] text-slate-500 block truncate font-medium">Create new SKU</span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* DASHBOARD LIVE METRICS & FILTER BAR */}
            <div className="ss-card p-3.5 mb-6 flex flex-wrap gap-2.5 items-center justify-between bg-slate-50/70 border-slate-200/80">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-700 pl-1">
                    <Filter size={14} className="text-blue-600" />
                    Ledger Filters:
                </div>

                <div className="flex flex-wrap gap-2 flex-1 justify-end">
                    <select
                        value={docTypeFilter}
                        onChange={(e) => setDocTypeFilter(e.target.value)}
                        className="ss-select !h-8.5 !py-0 !text-xs !w-auto bg-white font-medium shadow-2xs border-slate-300"
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
                        className="ss-select !h-8.5 !py-0 !text-xs !w-auto bg-white font-medium shadow-2xs border-slate-300"
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
                        className="ss-select !h-8.5 !py-0 !text-xs !w-auto bg-white font-medium shadow-2xs border-slate-300"
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                {/* Recent Stock Movements */}
                <div className="lg:col-span-7 ss-card overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                    Recent Stock Movements
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Live activity recorded in database ledger.
                                </p>
                            </div>
                            <Link
                                href="/moves"
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                            >
                                Full Ledger →
                            </Link>
                        </div>

                        {loading ? (
                            <div className="p-4 space-y-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : filteredRecentMoves.length === 0 ? (
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
                                            className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition text-xs"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                    <Boxes size={15} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-tight">
                                                        {m.product?.name || "Product"}
                                                    </p>
                                                    <span className="text-[11px] text-slate-400 font-mono">
                                                        {m.product?.sku} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={m.move_type} type="move" />
                                                <span
                                                    className={`font-mono font-bold text-xs min-w-14 text-right ${
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

                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-right">
                        <Link
                            href="/moves"
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                            Open Full Stock History →
                        </Link>
                    </div>
                </div>

                {/* Low Stock Watchlist */}
                <div className="lg:col-span-5 ss-card overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <ShieldAlert size={16} className="text-rose-600" />
                                    Low Stock Alerts
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Items near or below reorder threshold.
                                </p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                lowStockProducts.length > 0
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                                {lowStockProducts.length} items
                            </span>
                        </div>

                        {loading ? (
                            <div className="p-4 space-y-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : lowStockProducts.length === 0 ? (
                            <div className="p-8 text-center text-xs text-emerald-600 font-semibold flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <CheckCircle2 size={20} />
                                </div>
                                <span>All stock levels are currently optimal!</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {lowStockProducts.map((p) => {
                                    const percent = Math.min(100, Math.round((p.current_stock / (p.min_threshold || 1)) * 100));
                                    return (
                                        <div
                                            key={p.id}
                                            className="p-3.5 hover:bg-slate-50/80 transition text-xs"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div>
                                                    <p className="font-bold text-slate-900">{p.name}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono">
                                                        SKU: {p.sku}
                                                    </p>
                                                </div>

                                                <div className="text-right flex items-center gap-2">
                                                    <StatusBadge
                                                        status={p.current_stock <= 0 ? "Out of Stock" : "Low Stock"}
                                                        type="stock"
                                                    />
                                                    <Link
                                                        href="/receipts/new"
                                                        className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-md font-bold text-[11px] transition shadow-2xs"
                                                        title="Create Receipt"
                                                    >
                                                        + PO
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Progress Bar of Safety Stock */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            p.current_stock <= 0
                                                                ? "bg-rose-500 w-0"
                                                                : percent < 50
                                                                ? "bg-rose-500"
                                                                : "bg-amber-500"
                                                        }`}
                                                        style={{ width: `${Math.max(4, percent)}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono text-[10px] text-slate-500 font-bold shrink-0">
                                                    {p.current_stock} / {p.min_threshold} min
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-right">
                        <Link
                            href="/products"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            View All Catalog Stock →
                        </Link>
                    </div>
                </div>
            </div>

            {/* LOWER ROW: RECENT RECEIPTS & DELIVERIES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Receipts */}
                <div className="ss-card p-5">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Truck size={16} className="text-emerald-600" />
                            Recent Inbound Receipts
                        </h3>
                        <Link href="/receipts" className="text-xs font-bold text-blue-600 hover:underline">
                            View All
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : recentReceipts.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No recent receipts recorded.</p>
                    ) : (
                        <div className="space-y-2">
                            {recentReceipts.map((r) => (
                                <Link
                                    key={r.id}
                                    href={`/receipts/${r.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-emerald-50/50 transition border border-slate-200/80 text-xs group"
                                >
                                    <div>
                                        <span className="font-mono font-bold text-slate-900 block group-hover:text-emerald-700">
                                            {r.receipt_number}
                                        </span>
                                        <span className="text-slate-500 text-[11px]">
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
                <div className="ss-card p-5">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ShoppingCart size={16} className="text-purple-600" />
                            Recent Outbound Deliveries
                        </h3>
                        <Link href="/deliveries" className="text-xs font-bold text-purple-600 hover:underline">
                            View All
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : recentDeliveries.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No recent deliveries recorded.</p>
                    ) : (
                        <div className="space-y-2">
                            {recentDeliveries.map((d) => (
                                <Link
                                    key={d.id}
                                    href={`/deliveries/${d.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-purple-50/50 transition border border-slate-200/80 text-xs group"
                                >
                                    <div>
                                        <span className="font-mono font-bold text-slate-900 block group-hover:text-purple-700">
                                            {d.delivery_number}
                                        </span>
                                        <span className="text-slate-500 text-[11px]">
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