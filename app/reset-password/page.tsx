"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { Alert, Button } from "@/components/ui";

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        setMessage("Password updated successfully! Redirecting to sign in...");

        setTimeout(() => {
            router.push("/login");
        }, 1500);
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 mb-3">
                        <Package size={26} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        StockSense
                    </h1>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                        Inventory Management System
                    </p>
                </div>

                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Set New Password</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Enter your new secure password below.
                    </p>
                </div>

                {error && (
                    <Alert type="error" className="mb-5">
                        {error}
                    </Alert>
                )}

                {message && (
                    <Alert type="success" className="mb-5">
                        {message}
                    </Alert>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                        <label className="ss-label">New Password (Min. 6 chars)</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="ss-input"
                        />
                    </div>

                    <div>
                        <label className="ss-label">Confirm New Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="ss-input"
                        />
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            fullWidth
                            size="lg"
                        >
                            Update Password
                        </Button>
                    </div>
                </form>
            </div>
        </main>
    );
}