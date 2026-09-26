"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Warehouse, Location, StockLevel } from "@/lib/types";
import {
    Warehouse as WarehouseIcon,
    MapPin,
    ArrowLeft,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
    Boxes,
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

            setSuccessMessage("Location added successfully.");
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
        if (!confirm(`Are you sure you want to delete location "${loc.name}"?`)) return;

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
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading warehouse details...</p>
                </div>
            </AppLayout>
        );
    }

    if (!warehouse) {
        return (
            <AppLayout title="Warehouse Not Found">
                <EmptyState
                    icon={WarehouseIcon}
                    title="Warehouse Not Found"
                    description="The requested warehouse could not be found."
                    actionLabel="Back to Warehouses"
                    actionHref="/warehouses"
                />
            </AppLayout>
        );
    }

    return (
        <AppLayout
            title={warehouse.name}
            description={`Warehouse Code: ${warehouse.code}`}
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/warehouses"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                        <ArrowLeft size={16} />
                        Back to Warehouses
                    </Link>
                    <button
                        onClick={() => setLocationModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition shadow-xs"
                    >
                        <Plus size={18} />
                        Add Location Zone
                    </button>
                </div>
            }
        >
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
                    <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Warehouse Overview Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <WarehouseIcon size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">{warehouse.name}</h2>
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={15} className="text-slate-400" />
                                {warehouse.address || "No physical address provided"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-800">
                            CODE: {warehouse.code}
                        </span>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                warehouse.is_active
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                        >
                            {warehouse.is_active ? "Operational" : "Inactive"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs font-medium text-slate-500">Total Zones</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{locations.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs font-medium text-slate-500">Stock Records</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stockLevels.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs font-medium text-slate-500">Total Units</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                            {stockLevels.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0)}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs font-medium text-slate-500">Status</p>
                        <p className="text-sm font-bold text-slate-900 mt-2">
                            {warehouse.is_active ? "Active for Routing" : "Routing Disabled"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Locations / Zones List */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Locations & Zones</h3>
                    <button
                        onClick={() => setLocationModalOpen(true)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        <Plus size={16} />
                        Add Location
                    </button>
                </div>

                {locations.length === 0 ? (
                    <EmptyState
                        icon={MapPin}
                        title="No locations defined in this warehouse"
                        description="Add storage locations such as racks, aisles, or bins to track exact stock placements."
                        actionLabel="Add First Location"
                        onAction={() => setLocationModalOpen(true)}
                    />
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Location Name</th>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {locations.map((loc) => (
                                    <tr key={loc.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                                            <MapPin size={16} className="text-blue-500" />
                                            {loc.name}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-600">
                                            {loc.code}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    loc.is_active
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {loc.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteLocation(loc)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                title="Delete Location"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Current Inventory in this Warehouse */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Stock on Hand in this Facility</h3>
                {stockLevels.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
                        No product stock currently stored in this warehouse. Receive inventory to see stock levels.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4">SKU</th>
                                    <th className="px-6 py-4">Location Zone</th>
                                    <th className="px-6 py-4 text-right">Quantity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stockLevels.map((sl) => (
                                    <tr key={sl.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                            {sl.product?.name || "Product"}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                            {sl.product?.sku || "—"}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {sl.location?.name} ({sl.location?.code})
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                                            {sl.quantity} {sl.product?.unit_of_measure || "Units"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Location Modal */}
            <Modal
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                title="Add Storage Location"
                description={`Create a new storage location inside ${warehouse.name}.`}
            >
                <form onSubmit={handleCreateLocation} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Location Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Aisle 3 - Shelf B"
                                value={locName}
                                onChange={(e) => setLocName(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Location Code <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. A3-B"
                                value={locCode}
                                onChange={(e) => setLocCode(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="locActive"
                            checked={locActive}
                            onChange={(e) => setLocActive(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <label htmlFor="locActive" className="text-sm font-medium text-slate-700">
                            Location is Active and Ready for Storage
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setLocationModalOpen(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
                        >
                            {saving ? "Creating..." : "Create Location"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
