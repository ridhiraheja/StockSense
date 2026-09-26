"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
    LayoutDashboard,
    Boxes,
    Truck,
    ShoppingCart,
    ArrowRightLeft,
    SlidersHorizontal,
    History,
    Warehouse,
    Tag,
    User,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    PlusCircle,
    Bell,
    Shield,
} from "lucide-react";

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
}

export function AppLayout({
    children,
    title,
    description,
    actions,
}: AppLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [userEmail, setUserEmail] = useState<string>("");
    const [userName, setUserName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [operationsOpen, setOperationsOpen] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function checkUser() {
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error || !user) {
                if (isMounted) {
                    router.replace("/login");
                }
                return;
            }

            if (isMounted) {
                setUserEmail(user.email || "");
                // Fetch profile if exists
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profile?.full_name) {
                    setUserName(profile.full_name);
                } else if (user.user_metadata?.full_name) {
                    setUserName(user.user_metadata.full_name);
                }
                setLoading(false);
            }
        }

        checkUser();

        return () => {
            isMounted = false;
        };
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isLinkActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    const navItems = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            label: "Products",
            href: "/products",
            icon: Boxes,
        },
        {
            label: "Categories",
            href: "/categories",
            icon: Tag,
        },
    ];

    const operationsItems = [
        {
            label: "Receipts",
            href: "/receipts",
            icon: Truck,
        },
        {
            label: "Delivery Orders",
            href: "/deliveries",
            icon: ShoppingCart,
        },
        {
            label: "Internal Transfers",
            href: "/transfers",
            icon: ArrowRightLeft,
        },
        {
            label: "Adjustments",
            href: "/adjustments",
            icon: SlidersHorizontal,
        },
        {
            label: "Move History",
            href: "/moves",
            icon: History,
        },
    ];

    const bottomItems = [
        {
            label: "Warehouses",
            href: "/warehouses",
            icon: Warehouse,
        },
        {
            label: "Settings",
            href: "/settings",
            icon: Settings,
        },
        {
            label: "Profile",
            href: "/profile",
            icon: User,
        },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-300 text-sm font-medium">Loading StockSense...</p>
                </div>
            </div>
        );
    }

    const sidebarContent = (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none">
            {/* Logo */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                        <Boxes size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                            StockSense
                        </h1>
                        <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                            Inventory System
                        </p>
                    </div>
                </Link>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                {/* Main Menu */}
                <div className="space-y-1">
                    <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Main
                    </p>
                    {navItems.map((item) => {
                        const active = isLinkActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                                    active
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                        : "hover:bg-slate-800/80 hover:text-white text-slate-300"
                                }`}
                            >
                                <Icon size={18} className={active ? "text-white" : "text-slate-400"} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Operations Menu */}
                <div className="space-y-1">
                    <div
                        onClick={() => setOperationsOpen(!operationsOpen)}
                        className="flex items-center justify-between px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 mb-2"
                    >
                        <span>Operations</span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${
                                operationsOpen ? "rotate-0" : "-rotate-90"
                            }`}
                        />
                    </div>
                    {operationsOpen &&
                        operationsItems.map((item) => {
                            const active = isLinkActive(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                                        active
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                            : "hover:bg-slate-800/80 hover:text-white text-slate-300"
                                    }`}
                                >
                                    <Icon
                                        size={18}
                                        className={active ? "text-white" : "text-slate-400"}
                                    />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                </div>

                {/* Management Menu */}
                <div className="space-y-1">
                    <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Organization
                    </p>
                    {bottomItems.map((item) => {
                        const active = isLinkActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                                    active
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                        : "hover:bg-slate-800/80 hover:text-white text-slate-300"
                                }`}
                            >
                                <Icon size={18} className={active ? "text-white" : "text-slate-400"} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* User & Logout Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
                <Link
                    href="/profile"
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition mb-2"
                >
                    <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm uppercase">
                        {(userName || userEmail || "U").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                            {userName || "Inventory Specialist"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                    </div>
                </Link>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-30 shadow-xl">
                {sidebarContent}
            </aside>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div
                        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-64 max-w-xs flex-1 z-10 shadow-2xl">
                        {sidebarContent}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 md:pl-64 flex flex-col min-w-0">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition"
                        >
                            <Menu size={22} />
                        </button>
                        <div>
                            {title && (
                                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
