"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Alert, TableSkeleton } from "@/components/ui";
import { Warehouse, Location } from "@/lib/types";
import {
    Plus,
    Warehouse as WarehouseIcon,
    MapPin,
    Search,
    Edit,
    Trash2,
    ExternalLink,
    Boxes,
    Building2,
} from "lucide-react";

interface WarehouseWithLocations extends Warehouse {
    locations?: Location[];
    total_locations?: number;
    total_stock_count?: number;
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

            // Fetch stock counts across locations
            const { data: stockData } = await supabase
                .from("stock_levels")
                .select("location_id, quantity");

            const combined: WarehouseWithLocations[] = (whData || []).map((wh) => {
                const whLocs = (locData || []).filter((l) => l.warehouse_id === wh.id);
                const locIds = new Set(whLocs.map((l) => l.id));
                const totalUnits = (stockData || [])
                    .filter((s) => locIds.has(s.location_id))
                    .reduce((sum, curr) => sum + (Number(curr.quantity) || 0), 0);

                return {
                    ...wh,
                    locations: whLocs,
                    total_locations: whLocs.length,
                    total_stock_count: totalUnits,
                };
            });

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

                // Auto-create default general storage zone for new warehouse
                if (newWh) {
                    await supabase.from("locations").insert({
                        warehouse_id: newWh.id,
                        name: "General Storage",
                        code: `${newWh.code}-GEN`,
                        is_active: true,
                    });
                }

                setSuccessMessage("Warehouse created with default storage zone.");
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
            setError("Zone Name and Code are required.");
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

            setSuccessMessage("Storage zone added to warehouse.");
            setLocationModalOpen(false);
            loadData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error creating location:", err);
            const message = err instanceof Error ? err.message : "Unable to add storage zone.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWarehouse = async (wh: WarehouseWithLocations) => {
        if (!confirm(`Are you sure you want to delete warehouse "${wh.name}"?`)) {
            return;
        }

        try {
            const { error: delError } = await supabase
                .from("warehouses")
                .delete()
                .eq("id", wh.id);

            if (delError) throw delError;

            setSuccessMessage(`Warehouse "${wh.name}" was deleted.`);
            loadData();
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error deleting warehouse:", err);
            const message = err instanceof Error ? err.message : "Unable to delete warehouse (it may contain active inventory or history).";
            alert(message);
        }
    };

    const filteredWarehouses = warehouses.filter((w) => {
        return (
            w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (w.address && w.address.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    });

    return (
        <AppLayout
            title="Warehouses & Facilities"
            description="Manage physical storage locations, aisles, bin zones, and distribution nodes."
            actions={
                <button
                    onClick={openCreateWarehouseModal}
                    className="ss-button ss-button-primary"
                >
                    <Plus size={16} />
                    Add Warehouse
                </button>
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

            {/* Filter Bar */}
            <div className="ss-card p-4 mb-6 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="relative w-full sm:w-72">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search warehouses by name, code, address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ss-input !pl-9"
                    />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    {filteredWarehouses.length} {filteredWarehouses.length === 1 ? "Warehouse" : "Warehouses"} registered
                </span>
            </div>

            {/* Warehouse Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="ss-card p-5 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="skeleton-pulse h-5 w-32 rounded" />
                                <div className="skeleton-pulse h-4 w-12 rounded-full" />
                            </div>
                            <div className="skeleton-pulse h-3 w-48 rounded" />
                            <div className="skeleton-pulse h-16 w-full rounded" />
                        </div>
                    ))}
                </div>
            ) : filteredWarehouses.length === 0 ? (
                <EmptyState
                    icon={Building2}
                    title="No warehouses found"
                    description={
                        searchQuery
                            ? "No facilities match your search query."
                            : "Create your first warehouse facility to start organizing stock zones."
                    }
                    actionLabel="Add Warehouse"
                    onAction={openCreateWarehouseModal}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredWarehouses.map((wh) => (
                        <div
                            key={wh.id}
                            className="ss-card p-5 flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                            <WarehouseIcon size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                                                {wh.name}
                                            </h3>
                                            <span className="text-[11px] font-mono font-semibold text-slate-400">
                                                {wh.code}
                                            </span>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            wh.is_active
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-slate-100 text-slate-600 border border-slate-200"
                                        }`}
                                    >
                                        {wh.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>

                                {wh.address && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                                        <MapPin size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{wh.address}</span>
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Storage Zones</span>
                                        <span className="font-bold text-slate-800 text-sm">
                                            {wh.total_locations || 0}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Units Stored</span>
                                        <span className="font-bold text-slate-800 font-mono text-sm">
                                            {wh.total_stock_count || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                                <Link
                                    href={`/warehouses/${wh.id}`}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    Manage Zones →
                                </Link>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openCreateLocationModal(wh.id)}
                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                        title="Add Location Zone"
                                    >
                                        <Plus size={15} />
                                    </button>
                                    <button
                                        onClick={() => openEditWarehouseModal(wh)}
                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                        title="Edit Facility"
                                    >
                                        <Edit size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteWarehouse(wh)}
                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                        title="Delete Facility"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* WAREHOUSE MODAL */}
            <Modal
                isOpen={warehouseModalOpen}
                onClose={() => setWarehouseModalOpen(false)}
                title={editingWarehouse ? "Edit Warehouse" : "Add Warehouse Facility"}
                description="Distribution center code, facility name, and address."
            >
                <form onSubmit={handleSaveWarehouse} className="space-y-4">
                    {error && (
                        <Alert type="error" className="mb-2">
                            {error}
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="ss-label">
                                Facility Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Main Warehouse, Central Hub"
                                value={whName}
                                onChange={(e) => setWhName(e.target.value)}
                                required
                                className="ss-input"
                            />
                        </div>

                        <div>
                            <label className="ss-label">
                                Code <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="WH-MAIN, HUB-NY"
                                value={whCode}
                                onChange={(e) => setWhCode(e.target.value)}
                                required
                                className="ss-input uppercase font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="ss-label">Street / Facility Address</label>
                        <input
                            type="text"
                            placeholder="123 Logistics Parkway, Suite 400"
                            value={whAddress}
                            onChange={(e) => setWhAddress(e.target.value)}
                            className="ss-input"
                        />
                    </div>

                    <div>
                        <label className="ss-label">Status</label>
                        <select
                            value={whActive ? "true" : "false"}
                            onChange={(e) => setWhActive(e.target.value === "true")}
                            className="ss-select"
                        >
                            <option value="true">Active Facility</option>
                            <option value="false">Inactive / Under Maintenance</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setWarehouseModalOpen(false)}
                            className="ss-button ss-button-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="ss-button ss-button-primary"
                        >
                            {saving ? "Saving..." : "Save Warehouse"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* LOCATION / ZONE MODAL */}
            <Modal
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                title="Add Storage Zone / Bin"
                description="Create a sub-location zone (aisle, shelf, bin, bay) within this warehouse."
            >
                <form onSubmit={handleSaveLocation} className="space-y-4">
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
                                placeholder="Aisle 1 - Bin A, Cold Room"
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
                                placeholder="A1-BA, CR-01"
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
                            {saving ? "Saving..." : "Save Zone"}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
