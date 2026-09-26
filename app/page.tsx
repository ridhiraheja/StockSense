"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                router.replace("/dashboard");
            } else {
                router.replace("/login");
            }
        };

        checkAuth();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-300 text-sm font-medium">Loading StockSense...</p>
            </div>
        </div>
    );
}
