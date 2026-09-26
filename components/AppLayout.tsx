"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
    LayoutDashboard,
    Boxes,
    Tag,
    Truck,
    ShoppingCart,
    ArrowRightLeft,
    SlidersHorizontal,
    History,
    Warehouse,
    Settings,
    User,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Package,
    Shield,
    Sparkles,
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
    const [userRole, setUserRole] = useState<string>("Inventory Specialist");
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
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name, role")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profile?.full_name) {
                    setUserName(profile.full_name);
                } else if (user.user_metadata?.full_name) {
                    setUserName(user.user_metadata.full_name);
                }

                if (profile?.role) {
                    setUserRole(profile.role);
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
            label: "Deliveries",
            href: "/deliveries",
            icon: ShoppingCart,
        },
        {
            label: "Transfers",
            href: "/transfers",
            icon: ArrowRightLeft,
        },
        {
            label: "Adjustments",
            href: "/adjustments",
            icon: SlidersHorizontal,
        },
        {
            label: "Stock Ledger",
            href: "/moves",
            icon: History,
        },
    ];

    const organizationItems = [
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
            <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-xs font-medium tracking-wide">Connecting to StockSense...</p>
                </div>
            </div>
        );
    }

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[#090D16] text-slate-300 select-none border-r border-[#1e293b]/80 relative overflow-hidden">
            {/* Ambient Background Glow in Sidebar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />
            
            {/* Brand Logo Header */}
            <div className="p-5 border-b border-[#1e293b]/70 flex items-center justify-between relative z-10">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 group-hover:shadow-blue-500/50 transition-all duration-200">
                        <Package size={22} className="drop-shadow-xs" />
                    </div>
                    <div>
                        <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                            StockSense
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 uppercase tracking-widest">
                            Enterprise Cloud
                        </p>
                    </div>
                </Link>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
                    aria-label="Close menu"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6 relative z-10">
                {/* Main Overview */}
                <div>
                    <p className="px-3 text-[10px] font-extrabold text-slate-400/90 uppercase tracking-widest mb-2.5">
                        Core Platform
                    </p>
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const active = isLinkActive(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                                        active
                                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                                            : "hover:bg-[#151c2e] hover:text-white text-slate-300"
                                    }`}
                                >
                                    <Icon size={16} className={active ? "text-white" : "text-slate-400"} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Operations Section */}
                <div>
                    <div
                        onClick={() => setOperationsOpen(!operationsOpen)}
                        className="flex items-center justify-between px-3 text-[10px] font-extrabold text-slate-400/90 uppercase tracking-widest cursor-pointer hover:text-slate-200 mb-2.5"
                    >
                        <span>Operations Flow</span>
                        <ChevronDown
                            size={12}
                            className={`transition-transform duration-200 ${
                                operationsOpen ? "rotate-0" : "-rotate-90"
                            }`}
                        />
                    </div>
                    {operationsOpen && (
                        <div className="space-y-1">
                            {operationsItems.map((item) => {
                                const active = isLinkActive(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                                            active
                                                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                                                : "hover:bg-[#151c2e] hover:text-white text-slate-300"
                                        }`}
                                    >
                                        <Icon
                                            size={16}
                                            className={active ? "text-white" : "text-slate-400"}
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Organization & Setup */}
                <div>
                    <p className="px-3 text-[10px] font-extrabold text-slate-400/90 uppercase tracking-widest mb-2.5">
                        Organization
                    </p>
                    <div className="space-y-1">
                        {organizationItems.map((item) => {
                            const active = isLinkActive(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                                        active
                                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                                            : "hover:bg-[#151c2e] hover:text-white text-slate-300"
                                    }`}
                                >
                                    <Icon size={16} className={active ? "text-white" : "text-slate-400"} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* User Profile & Logout Bottom Panel */}
            <div className="p-3.5 border-t border-[#1e293b]/70 bg-[#060910]/90 relative z-10">
                <Link
                    href="/profile"
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#151c2e] transition mb-2 group"
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border border-blue-400/30 flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-sm shadow-blue-500/20">
                        {(userName || userEmail || "U").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition">
                            {userName || "Inventory Specialist"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate font-mono">{userEmail}</p>
                    </div>
                </Link>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition duration-150"
                >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-30 shadow-xl">
                {sidebarContent}
            </aside>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div
                        className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
                        onClick={() => setMobileOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="relative w-64 max-w-xs flex-1 z-10 shadow-2xl">
                        {sidebarContent}
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="flex-1 md:pl-64 flex flex-col min-w-0">
                {/* Header Top Bar */}
                <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3.5">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition"
                            aria-label="Open sidebar menu"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            {title && (
                                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-2">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="text-xs text-slate-500 hidden sm:block mt-1 font-medium">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                </header>

                {/* Main Page Content */}
                <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
