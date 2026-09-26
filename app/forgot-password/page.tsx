"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Package, ArrowLeft } from "lucide-react";
import { Alert, Button } from "@/components/ui";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        setMessage("");
        setError("");
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        setMessage(
            "Password reset link has been sent! Please check your email inbox."
        );
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
                    <h2 className="text-lg font-bold text-slate-900">Forgot Password</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Enter your registered email address to receive a secure recovery link.
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

                <form onSubmit={handleReset} className="space-y-4">
                    <div>
                        <label className="ss-label">Email Address</label>
                        <input
                            type="email"
                            placeholder="operator@stocksense.io"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            Send Recovery Link
                        </Button>
                    </div>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                    >
                        <ArrowLeft size={14} />
                        Back to Login
                    </Link>
                </div>
            </div>
        </main>
    );
}