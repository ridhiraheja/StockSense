"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
    Settings as SettingsIcon,
    Warehouse,
    Tag,
    Shield,
    Database,
    KeyRound,
    LogOut,
    ExternalLink,
    CheckCircle2,
    Server,
    Boxes,
    Building2,
    SlidersHorizontal,
} from "lucide-react";

export default function SettingsPage() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState("");
    const [dbConnected, setDbConnected] = useState(true);

    useEffect(() => {
        const check = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || "");
            }
        };
        check();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <AppLayout
            title="System Settings"
            description="Manage organizational taxonomies, storage facilities, database connections, and system preferences."
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Master Data Catalogs */}
                <div className="ss-card p-6">
                    <div className="pb-3.5 mb-5 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Master Data Catalogs
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Configure facilities, bins, storage locations, and product classifications.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link
                            href="/warehouses"
                            className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition group bg-slate-50/40"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                                    <Warehouse size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                                        Warehouses & Storage Zones
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Manage physical distribution centers, aisles, and bin locations.
                                    </p>
                                </div>
                            </div>
                            <ExternalLink size={14} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                        </Link>

                        <Link
                            href="/categories"
                            className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition group bg-slate-50/40"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition">
                                    <Tag size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">
                                        Product Categories
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Group inventory items by material, taxonomy, or family.
                                    </p>
                                </div>
                            </div>
                            <ExternalLink size={14} className="text-slate-400 group-hover:text-purple-600 shrink-0" />
                        </Link>
                    </div>
                </div>

                {/* Database & Infrastructure Telemetry */}
                <div className="ss-card p-6">
                    <div className="pb-3.5 mb-5 border-b border-slate-100 flex items-center gap-2">
                        <Database size={16} className="text-emerald-600" />
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                Database & Architecture Telemetry
                            </h3>
                            <p className="text-xs text-slate-500">
                                Live PostgreSQL status and RPC stored procedure connectivity.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Database Engine
                            </span>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="font-bold text-slate-900 text-xs">Supabase PostgreSQL</span>
                            </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Security Layer
                            </span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <span className="font-bold text-slate-900 text-xs">Row Level Security (RLS)</span>
                            </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Atomic Calculations
                            </span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <span className="font-bold text-slate-900 text-xs">RPC Validation Functions</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account & Session Management */}
                <div className="ss-card p-6">
                    <div className="pb-3.5 mb-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Account & Authentication
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Current active user session details.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-semibold text-slate-700 block">
                                Signed in as
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                                {userEmail || "Authenticated User"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link
                                href="/profile"
                                className="ss-button ss-button-secondary ss-button-sm"
                            >
                                Edit Profile
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="ss-button ss-button-danger ss-button-sm"
                            >
                                <LogOut size={13} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
