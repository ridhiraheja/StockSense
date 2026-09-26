"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

        setMessage("Password updated successfully!");

        setTimeout(() => {
            router.push("/login");
        }, 1500);
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
                    Reset Password
                </h2>

                <p className="text-gray-600 mb-6">
                    Enter your new password below.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-5">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                        </label>

                        <input
                            type="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {loading ? "Updating..." : "Update Password"}
                    </button>

                </form>

            </div>
        </main>
    );
}