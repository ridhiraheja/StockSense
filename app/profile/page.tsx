"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Alert, Button } from "@/components/ui";
import {
    User,
    Mail,
    Shield,
    Calendar,
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
            description="Manage your account profile details, system role, and operator credentials."
        >
            <div className="max-w-3xl mx-auto space-y-6">
                {error && (
                    <Alert type="error">
                        {error}
                    </Alert>
                )}

                {successMessage && (
                    <Alert type="success">
                        {successMessage}
                    </Alert>
                )}

                {/* Profile Card Header */}
                <div className="ss-card overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white border-b border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-2xl uppercase shrink-0">
                                {(fullName || email || "U").charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl font-bold tracking-tight truncate">
                                    {fullName || "StockSense Operator"}
                                </h2>
                                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                                    <Mail size={13} />
                                    {email}
                                </p>
                                <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                    <Shield size={11} />
                                    {role}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="ss-label">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sarah Connor"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="ss-input"
                                />
                            </div>

                            <div>
                                <label className="ss-label">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="ss-input cursor-not-allowed bg-slate-50 text-slate-500"
                                />
                                <span className="ss-helper">Managed by authentication provider.</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="ss-label">Operational Role</label>
                                <input
                                    type="text"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="ss-input"
                                />
                            </div>

                            <div>
                                <label className="ss-label">Account Member Since</label>
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 h-[38px]">
                                    <Calendar size={14} className="text-slate-400" />
                                    <span>
                                        {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={saving}
                                icon={<Save size={15} />}
                            >
                                Save Profile
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
