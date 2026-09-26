"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Warehouse, Location } from "@/lib/types";
import {
    Plus,
    Warehouse as WarehouseIcon,
    MapPin,
    Search,
    Edit,
    Trash2,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Boxes,
} from "lucide-react";

interface WarehouseWithLocations extends Warehouse {
    locations?: Location[];
}

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<WarehouseWithLocations[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Warehouse Modal State
    const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [whName, setWhName] = useState("");
    const [whCode, setWhCode] = useState("");
    const [whAddress, setWhAddress] = useState("");
    const [whActive, setWhActive] = useState(true);

    // Location Modal State
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
    const [locName, setLocName] = useState("");
    const [locCode, setLocCode] = useState("");
    const [locActive, setLocActive] = useState(true);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: whData, error: whError } = await supabase
                .from("warehouses")
                .select("*")
                .order("name", { ascending: true });

            if (whError) throw whError;

            const { data: locData, error: locError } = await supabase
                .from("locations")
                .select("*")
                .order("name", { ascending: true });

            if (locError) throw locError;

            const combined: WarehouseWithLocations[] = (whData || []).map((wh) => ({
                ...wh,
                locations: (locData || []).filter((l) => l.warehouse_id === wh.id),
            }));

            setWarehouses(combined);
        } catch (err: unknown) {
            console.error("Error loading warehouses:", err);
            const message = err instanceof Error ? err.message : "Failed to load warehouses";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreateWarehouseModal = () => {
        setEditingWarehouse(null);
        setWhName("");
        setWhCode("");
        setWhAddress("");
        setWhActive(true);
        setError("");
        setWarehouseModalOpen(true);
    };

    const openEditWarehouseModal = (wh: Warehouse) => {
        setEditingWarehouse(wh);
        setWhName(wh.name);
        setWhCode(wh.code);
        setWhAddress(wh.address || "");
        setWhActive(wh.is_active);
        setError("");
        setWarehouseModalOpen(true);
    };

    const openCreateLocationModal = (warehouseId: string) => {
        setTargetWarehouseId(warehouseId);
        setLocName("");
        setLocCode("");
        setLocActive(true);
        setError("");
        setLocationModalOpen(true);
    };

    const handleSaveWarehouse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!whName.trim() || !whCode.trim()) {
            setError("Name and Code are required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            if (editingWarehouse) {
                const { error: updateError } = await supabase
                    .from("warehouses")
                    .update({
                        name: whName.trim(),
                        code: whCode.trim().toUpperCase(),
                        address: whAddress.trim() || null,
                        is_active: whActive,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", editingWarehouse.id);

                if (updateError) throw updateError;
                setSuccessMessage("Warehouse updated successfully.");
            } else {
                const { data: newWh, error: insertError } = await supabase
                    .from("warehouses")
                    .insert({
                        name: whName.trim(),
                        code: whCode.trim().toUpperCase(),
                        address: whAddress.trim() || null,
                        is_active: whActive,
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Automatically create a default location for convenience
                if (newWh) {
                    await supabase.from("locations").insert({
                        warehouse_id: newWh.id,
                        name: "Main Storage",
                        code: `${newWh.code}-MAIN`,
                        is_active: true,
                    });
                }

                setSuccessMessage("Warehouse & default location created successfully.");
            }

            setWarehouseModalOpen(false);
            loadData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error saving warehouse:", err);
            const message = err instanceof Error ? err.message : "Unable to save warehouse.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!locName.trim() || !locCode.trim()) {
            setError("Location Name and Code are required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const { error: insertError } = await supabase.from("locations").insert({
                warehouse_id: targetWarehouseId,
                name: locName.trim(),
                code: locCode.trim().toUpperCase(),
                is_active: locActive,
            });

            if (insertError) throw insertError;

            setSuccessMessage("Location created successfully.");
            setLocationModalOpen(false);
            loadData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error saving location:", err);
            const message = err instanceof Error ? err.message : "Unable to create location.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWarehouse = async (wh: WarehouseWithLocations) => {
        if (!confirm(`Are you sure you want to delete warehouse "${wh.name}"? This may affect associated stock.`)) {
            return;
        }

        try {
            const { error: delError } = await supabase
                .from("warehouses")
                .delete()
                .eq("id", wh.id);

            if (delError) throw delError;

            setSuccessMessage(`Warehouse "${wh.name}" deleted.`);
            loadData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error deleting warehouse:", err);
            const message = err instanceof Error ? err.message : "Unable to delete warehouse.";
            alert(message);
        }
    };

    const handleDeleteLocation = async (loc: Location) => {
        if (!confirm(`Are you sure you want to delete location "${loc.name}" (${loc.code})?`)) {
            return;
        }

        try {
            const { error: delError } = await supabase
                .from("locations")
                .delete()
                .eq("id", loc.id);

            if (delError) throw delError;

            setSuccessMessage(`Location "${loc.name}" deleted.`);
            loadData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error deleting location:", err);
            const message = err instanceof Error ? err.message : "Unable to delete location.";
            alert(message);
        }
    };

    const filteredWarehouses = warehouses.filter((wh) =>
        wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wh.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wh.address && wh.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <AppLayout
            title="Warehouses & Locations"
            description="Manage your storage facilities, distribution hubs, and internal racks/zones."
            actions={
                <button
                    onClick={openCreateWarehouseModal}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
                >
                    <Plus size={18} />
                    Add Warehouse
                </button>
            }
        >
            {/* Feedback notifications */}
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
                    <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Search bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-80">
                    <Search
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search warehouses by name, code, address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                </div>
                <div className="text-sm font-medium text-slate-500">
                    Total Facilities: <span className="text-slate-900 font-bold">{filteredWarehouses.length}</span>
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading warehouses & locations...</p>
                </div>
            ) : filteredWarehouses.length === 0 ? (
                <EmptyState
                    icon={WarehouseIcon}
                    title={searchQuery ? "No warehouses match your search" : "No warehouses yet"}
                    description={
                        searchQuery
                            ? "Try refining your search query."
                            : "Create your first warehouse or storage location to begin tracking stock movements."
                    }
                    actionLabel={searchQuery ? undefined : "Add Warehouse"}
                    onAction={searchQuery ? undefined : openCreateWarehouseModal}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredWarehouses.map((wh) => (
                        <div
                            key={wh.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                        >
                            {/* Warehouse Header */}
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                            <WarehouseIcon size={22} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 text-lg">
                                                    {wh.name}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                                                    {wh.code}
                                                </span>
                                            </div>
                                            {wh.address ? (
                                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                    <MapPin size={13} className="text-slate-400" />
                                                    {wh.address}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-400 mt-0.5">No address specified</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/warehouses/${wh.id}`}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="View Details"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                        <button
                                            onClick={() => openEditWarehouseModal(wh)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Edit Warehouse"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWarehouse(wh)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                            title="Delete Warehouse"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Locations Section */}
                            <div className="p-6 bg-slate-50/50 flex-1">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Locations / Zones ({wh.locations?.length || 0})
                                    </span>
                                    <button
                                        onClick={() => openCreateLocationModal(wh.id)}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                                    >
                                        <Plus size={14} />
                                        Add Location
                                    </button>
                                </div>

                                {wh.locations && wh.locations.length > 0 ? (
                                    <div className="space-y-2">
                                        {wh.locations.map((loc) => (
                                            <div
                                                key={loc.id}
                                                className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-blue-500" />
                                                    <span className="font-semibold text-slate-900">{loc.name}</span>
                                                    <span className="font-mono text-slate-400">({loc.code})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                            loc.is_active
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        {loc.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteLocation(loc)}
                                                        className="text-slate-400 hover:text-rose-600 p-1"
                                                        title="Delete Location"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-xs text-slate-400">
                                        No specific locations defined yet.
                                    </div>
                                )}
                            </div>

                            {/* Warehouse Footer */}
                            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span
                                    className={`inline-flex items-center gap-1 font-semibold ${
                                        wh.is_active ? "text-emerald-700" : "text-slate-500"
                                    }`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            wh.is_active ? "bg-emerald-500" : "bg-slate-400"
                                        }`}
                                    />
                                    {wh.is_active ? "Operational" : "Inactive"}
                                </span>
                                <Link
                                    href={`/warehouses/${wh.id}`}
                                    className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                    View Full Details →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Warehouse Create/Edit Modal */}
            <Modal
                isOpen={warehouseModalOpen}
                onClose={() => setWarehouseModalOpen(false)}
                title={editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
                description="Storage facilities act as parent containers for inventory locations."
            >
                <form onSubmit={handleSaveWarehouse} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Warehouse Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Central Distribution Hub"
                                value={whName}
                                onChange={(e) => setWhName(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Code / ID <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. WH-CENTRAL"
                                value={whCode}
                                onChange={(e) => setWhCode(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                            Street Address / Location
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 100 Industrial Parkway, Sector 4"
                            value={whAddress}
                            onChange={(e) => setWhAddress(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="whActive"
                            checked={whActive}
                            onChange={(e) => setWhActive(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <label htmlFor="whActive" className="text-sm font-medium text-slate-700">
                            Warehouse is Active and Available for Shipments
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setWarehouseModalOpen(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
                        >
                            {saving ? "Saving..." : editingWarehouse ? "Update Warehouse" : "Create Warehouse"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Location Create Modal */}
            <Modal
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                title="Add Location Zone"
                description="Specify a rack, aisle, bin, or zone inside this warehouse."
            >
                <form onSubmit={handleSaveLocation} className="space-y-4">
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
                                placeholder="e.g. Rack A-1, Production Floor"
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
                                placeholder="e.g. LOC-A1"
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
                            Location is Active
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
                            {saving ? "Creating..." : "Add Location"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
