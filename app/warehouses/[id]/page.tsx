"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Alert, TableSkeleton } from "@/components/ui";
import { Warehouse, Location, StockLevel } from "@/lib/types";
import {
    Warehouse as WarehouseIcon,
    MapPin,
    ArrowLeft,
    Plus,
    Trash2,
    Boxes,
    Layers,
} from "lucide-react";

export default function WarehouseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const warehouseId = params?.id as string;

    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
    const [loading, setLoading] = useState(true);

    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locName, setLocName] = useState("");
    const [locCode, setLocCode] = useState("");
    const [locActive, setLocActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadWarehouseData = async () => {
        if (!warehouseId) return;
        setLoading(true);
        try {
            const { data: wh, error: whError } = await supabase
                .from("warehouses")
                .select("*")
                .eq("id", warehouseId)
                .single();

            if (whError) throw whError;
            setWarehouse(wh);

            const { data: locs, error: locError } = await supabase
                .from("locations")
                .select("*")
                .eq("warehouse_id", warehouseId)
                .order("name", { ascending: true });

            if (locError) throw locError;
            setLocations(locs || []);

            // Load stock levels in these locations
            if (locs && locs.length > 0) {
                const locIds = locs.map((l) => l.id);
                const { data: stocks, error: stockError } = await supabase
                    .from("stock_levels")
                    .select("*, product:products(*), location:locations(*)")
                    .in("location_id", locIds);

                if (!stockError && stocks) {
                    setStockLevels(stocks as StockLevel[]);
                }
            }
        } catch (err: unknown) {
            console.error("Error loading warehouse details:", err);
            const message = err instanceof Error ? err.message : "Failed to load warehouse";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWarehouseData();
    }, [warehouseId]);

    const handleCreateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!locName.trim() || !locCode.trim()) {
            setError("Location Name and Code are required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const { error: insertError } = await supabase.from("locations").insert({
                warehouse_id: warehouseId,
                name: locName.trim(),
                code: locCode.trim().toUpperCase(),
                is_active: locActive,
            });

            if (insertError) throw insertError;

            setSuccessMessage("Storage zone added successfully.");
            setLocationModalOpen(false);
            setLocName("");
            setLocCode("");
            loadWarehouseData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error creating location:", err);
            const message = err instanceof Error ? err.message : "Unable to create location.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLocation = async (loc: Location) => {
        const hasStock = stockLevels.some(
            (s) => s.location_id === loc.id && Number(s.quantity) > 0
        );
        if (hasStock) {
            alert(
                `Cannot delete location "${loc.name}" because it currently holds inventory. Transfer or adjust the stock to 0 before deleting.`
            );
            return;
        }

        if (!confirm(`Are you sure you want to delete storage zone "${loc.name}"?`)) return;

        try {
            const { error: delError } = await supabase.from("locations").delete().eq("id", loc.id);
            if (delError) throw delError;

            setSuccessMessage(`Location "${loc.name}" deleted.`);
            loadWarehouseData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error deleting location:", err);
            const message = err instanceof Error ? err.message : "Unable to delete location.";
            alert(message);
        }
    };

    if (loading) {
        return (
            <AppLayout title="Warehouse Details">
                <TableSkeleton rows={4} columns={4} />
            </AppLayout>
        );
    }

    if (!warehouse) {
        return (
            <AppLayout title="Warehouse Not Found">
                <EmptyState
                    icon={WarehouseIcon}
                    title="Warehouse Not Found"
                    description="The requested warehouse facility does not exist or has been removed."
                    actionLabel="Back to Warehouses"
                    actionHref="/warehouses"
                />
            </AppLayout>
        );
    }

    const totalUnitsInWarehouse = stockLevels.reduce(
        (sum, curr) => sum + (Number(curr.quantity) || 0),
        0
    );

    return (
        <AppLayout
            title={`${warehouse.name} (${warehouse.code})`}
            description={warehouse.address || "Warehouse facility details, zones, and live stock holdings."}
            actions={
                <div className="flex items-center gap-2">
                    <Link
                        href="/warehouses"
                        className="ss-button ss-button-secondary"
                    >
                        <ArrowLeft size={16} />
                        Back to Warehouses
                    </Link>
                    <button
                        onClick={() => {
                            setLocName("");
                            setLocCode("");
                            setError("");
                            setLocationModalOpen(true);
                        }}
                        className="ss-button ss-button-primary"
                    >
                        <Plus size={16} />
                        Add Storage Zone
                    </button>
                </div>
            }
        >
            {error && (
                <Alert type="error" className="mb-6">
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert type="success" className="mb-6">
                    {successMessage}
                </Alert>
            )}

            {/* Top Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="ss-card p-4">
                    <span className="kpi-label">Facility Code</span>
                    <h4 className="kpi-value font-mono">{warehouse.code}</h4>
                    <span className="text-xs text-slate-500 mt-1 block">
                        {warehouse.is_active ? "Operational" : "Inactive"}
                    </span>
                </div>

                <div className="ss-card p-4">
                    <span className="kpi-label">Storage Zones / Aisles</span>
                    <h4 className="kpi-value">{locations.length}</h4>
                    <span className="text-xs text-slate-500 mt-1 block">Configured bay zones</span>
                </div>

                <div className="ss-card p-4">
                    <span className="kpi-label">Total Units in Stock</span>
                    <h4 className="kpi-value text-blue-600 font-mono">{totalUnitsInWarehouse}</h4>
                    <span className="text-xs text-slate-500 mt-1 block">Across all facility bins</span>
                </div>
            </div>

            {/* Storage Zones & Associated Stock */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Storage Zones & Bin Inventory
                        </h3>
                        <p className="text-xs text-slate-500">
                            Sub-locations configured in this warehouse facility.
                        </p>
                    </div>
                </div>

                {locations.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No storage zones defined"
                        description="Add storage zones (aisles, racks, bays) to begin allocating items into this warehouse."
                        actionLabel="Add Storage Zone"
                        onAction={() => setLocationModalOpen(true)}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {locations.map((loc) => {
                            const locStocks = stockLevels.filter((s) => s.location_id === loc.id);
                            const locTotal = locStocks.reduce(
                                (sum, s) => sum + (Number(s.quantity) || 0),
                                0
                            );

                            return (
                                <div key={loc.id} className="ss-card p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">
                                                    {loc.name}
                                                </h4>
                                                <span className="font-mono text-[11px] text-slate-400 font-semibold">
                                                    CODE: {loc.code}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        loc.is_active
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-slate-100 text-slate-500"
                                                    }`}
                                                >
                                                    {loc.is_active ? "Active" : "Inactive"}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteLocation(loc)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                    title="Delete Zone"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-xs mb-2">
                                                <span className="font-semibold text-slate-600">
                                                    Holding ({locStocks.length} SKUs):
                                                </span>
                                                <span className="font-mono font-bold text-slate-900">
                                                    {locTotal} units
                                                </span>
                                            </div>

                                            {locStocks.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic py-2">
                                                    Zone currently empty.
                                                </p>
                                            ) : (
                                                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                                    {locStocks.map((s) => (
                                                        <div
                                                            key={s.id}
                                                            className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs"
                                                        >
                                                            <div className="min-w-0 flex-1 pr-2">
                                                                <span className="font-medium text-slate-800 block truncate">
                                                                    {s.product?.name || "Product"}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                    {s.product?.sku}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono font-bold text-slate-900 shrink-0">
                                                                {s.quantity} {s.product?.unit_of_measure || "Units"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ADD LOCATION MODAL */}
            <Modal
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                title={`Add Storage Zone to ${warehouse.name}`}
                description="Specify the zone name, code identifier, and initial operational status."
            >
                <form onSubmit={handleCreateLocation} className="space-y-4">
                    {error && (
                        <Alert type="error" className="mb-2">
                            {error}
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="ss-label">
                                Zone Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Aisle 3 - Bay 2"
                                value={locName}
                                onChange={(e) => setLocName(e.target.value)}
                                required
                                className="ss-input"
                            />
                        </div>

                        <div>
                            <label className="ss-label">
                                Zone Code <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. A3-B2"
                                value={locCode}
                                onChange={(e) => setLocCode(e.target.value)}
                                required
                                className="ss-input uppercase font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="ss-label">Zone Status</label>
                        <select
                            value={locActive ? "true" : "false"}
                            onChange={(e) => setLocActive(e.target.value === "true")}
                            className="ss-select"
                        >
                            <option value="true">Active Zone</option>
                            <option value="false">Inactive / Blocked</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setLocationModalOpen(false)}
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="ss-button ss-button-primary"
                        >
                            {saving ? "Creating..." : "Add Zone"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
