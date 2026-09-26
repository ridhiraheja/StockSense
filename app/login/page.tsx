"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
        <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

                <h1 className="text-3xl font-bold text-gray-900 text-center">
                    StockSense
                </h1>

                <p className="text-gray-600 text-center mt-2 mb-8">
                    Inventory Management System
                </p>

                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Login
                </h2>

                <form onSubmit={handleLogin} className="space-y-5">

                    {/* Email */}
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

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Forgot Password */}
                    <div className="text-right">
                        <Link
                            href="/forgot-password"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                {/* Signup */}
                <p className="text-center text-gray-600 mt-6">
                    Don't have an account?{" "}
                    <Link
                        href="/signup"
                        className="text-blue-600 font-semibold hover:underline"
                    >
                        Sign Up
                    </Link>
                </p>

            </div>
        </main>
    );
}