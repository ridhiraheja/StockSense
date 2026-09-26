"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package } from "lucide-react";
import { Alert, Button } from "@/components/ui";

export default function SignupPage() {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
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

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        if (data.session) {
            router.push("/dashboard");
            return;
        }

        setMessage(
            "Account created successfully! Please check your email inbox to verify your account."
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
                    <h2 className="text-lg font-bold text-slate-900">Create Operator Account</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Register a new user profile to access inventory workflows.
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

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="ss-label">Full Name</label>
                        <input
                            type="text"
                            placeholder="e.g. John Miller"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="ss-input"
                        />
                    </div>

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

                    <div>
                        <label className="ss-label">Password (Min. 6 chars)</label>
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
                        <label className="ss-label">Confirm Password</label>
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
                            Create Account
                        </Button>
                    </div>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
                        >
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}