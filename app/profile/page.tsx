"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Profile } from "@/lib/types";
import {
    User,
    Mail,
    Shield,
    Calendar,
    CheckCircle,
    AlertCircle,
    Save,
} from "lucide-react";

export default function ProfilePage() {
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("Inventory Specialist");
    const [createdAt, setCreatedAt] = useState("");
    const [userId, setUserId] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    setUserId(user.id);
                    setEmail(user.email || "");
                    setCreatedAt(user.created_at || "");

                    // Fetch profile from table
                    const { data: prof } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", user.id)
                        .maybeSingle();

                    if (prof) {
                        setFullName(prof.full_name || user.user_metadata?.full_name || "");
                        setRole(prof.role || "Inventory Specialist");
                    } else if (user.user_metadata?.full_name) {
                        setFullName(user.user_metadata.full_name);
                    }
                }
            } catch (err) {
                console.error("Error loading profile:", err);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccessMessage("");

        try {
            // Update profile table
            const { error: upsertError } = await supabase
                .from("profiles")
                .upsert({
                    id: userId,
                    email: email,
                    full_name: fullName.trim(),
                    role: role,
                    updated_at: new Date().toISOString(),
                });

            if (upsertError) throw upsertError;

            // Update user metadata in auth
            await supabase.auth.updateUser({
                data: { full_name: fullName.trim() },
            });

            setSuccessMessage("Profile updated successfully!");
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err: unknown) {
            console.error("Error saving profile:", err);
            const message = err instanceof Error ? err.message : "Unable to save profile.";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppLayout
            title="User Profile"
            description="Manage your account details and operational preferences."
        >
            <div className="max-w-3xl mx-auto">
                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-3">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-3">
                        <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-8 text-white">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 rounded-2xl bg-blue-600/30 border-2 border-blue-400/40 text-blue-300 flex items-center justify-center font-bold text-3xl uppercase backdrop-blur-xs">
                                {(fullName || email || "U").charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{fullName || "StockSense User"}</h2>
                                <p className="text-sm text-slate-300 flex items-center gap-1.5 mt-1">
                                    <Mail size={15} />
                                    {email}
                                </p>
                                <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                                    <Shield size={12} />
                                    {role}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Registered Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Email is managed by Supabase Authentication.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
                                Operational Role
                            </label>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                            />
                        </div>

                        {createdAt && (
                            <div className="pt-2">
                                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    Member since {new Date(createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-50"
                            >
                                <Save size={16} />
                                {saving ? "Saving Changes..." : "Save Profile"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
