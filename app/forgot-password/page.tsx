"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

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
            "Password reset link has been sent. Please check your email."
        );
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

                <h1 className="text-3xl font-bold text-gray-900 text-center">
                    StockSense
                </h1>

                <p className="text-gray-600 text-center mt-2 mb-8">
                    Inventory Management System
                </p>

                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Forgot Password?
                </h2>

                <p className="text-gray-600 mb-6">
                    Enter your registered email address to receive a password reset link.
                </p>

                <form onSubmit={handleReset} className="space-y-5">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-50 border border-green-200 text-green-600 rounded-lg p-3 text-sm">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>

                </form>

                <p className="text-center text-gray-600 mt-6">
                    Remember your password?{" "}
                    <Link
                        href="/login"
                        className="text-blue-600 font-semibold hover:underline"
                    >
                        Back to Login
                    </Link>
                </p>

            </div>
        </main>
    );
}