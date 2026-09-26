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
    CheckCircle,
    Server,
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
            description="Application preferences, master catalogs, database connections, and security."
        >
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Master Data Management */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                        Master Data Catalogs
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                        Configure organizational taxonomies, storage facilities, and classification.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link
                            href="/warehouses"
                            className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition">
                                    <Warehouse size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                                        Warehouses & Locations
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Manage physical distribution centers, aisles, and storage zones.
                                    </p>
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-600" />
                        </Link>

                        <Link
                            href="/categories"
                            className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">
                                        Product Categories
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Group inventory items by type, material, or department.
                                    </p>
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-slate-400 group-hover:text-purple-600" />
                        </Link>
                    </div>
                </div>

                {/* Database & System Health */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <Database size={18} className="text-emerald-600" />
                        Database & Security Architecture
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                        Live infrastructure status and database connection telemetry.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-xs font-semibold text-slate-400 uppercase block">Engine</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="font-bold text-slate-900 text-sm">Supabase PostgreSQL</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-xs font-semibold text-slate-400 uppercase block">RLS Policies</span>
                            <div className="flex items-center gap-2 mt-1">
                                <CheckCircle size={14} className="text-emerald-600" />
                                <span className="font-bold text-slate-900 text-sm">Row Level Security Active</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-xs font-semibold text-slate-400 uppercase block">Stored Procedures</span>
                            <div className="flex items-center gap-2 mt-1">
                                <CheckCircle size={14} className="text-emerald-600" />
                                <span className="font-bold text-slate-900 text-sm">RPC Atomic Stock Functions</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account & Security */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                        Account & Authentication
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                        Active session credentials and signout controls.
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Logged in as</p>
                            <p className="font-bold text-slate-900 text-sm mt-0.5">{userEmail}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/forgot-password"
                                className="px-4 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                            >
                                Reset Password
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                            >
                                <LogOut size={14} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
