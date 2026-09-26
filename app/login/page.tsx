"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Lock, Mail, ArrowRight } from "lucide-react";
import { Alert, Button } from "@/components/ui";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        router.push("/dashboard");
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                {/* Brand Logo & Header */}
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
                    <h2 className="text-lg font-bold text-slate-900">Sign in to your account</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Enter your operator credentials to access warehouse controls.
                    </p>
                </div>

                {error && (
                    <Alert type="error" className="mb-5">
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email */}
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

                    {/* Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="ss-label mb-0">Password</label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="ss-input"
                        />
                    </div>

                    {/* Login Button */}
                    <div className="pt-2">
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            fullWidth
                            size="lg"
                        >
                            Sign In to StockSense
                        </Button>
                    </div>
                </form>

                {/* Signup Link */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        Don't have an account yet?{" "}
                        <Link
                            href="/signup"
                            className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
                        >
                            Register account
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}