import React from "react";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color?: "blue" | "green" | "purple" | "amber" | "indigo" | "red" | "cyan";
    description?: string;
    href?: string;
    trend?: {
        label: string;
        positive?: boolean;
    };
}

const colorStyles = {
    blue: {
        iconBg: "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/30",
        accentBg: "from-blue-500/15 via-indigo-500/10 to-transparent",
        indicator: "bg-gradient-to-r from-blue-500 to-cyan-400",
        pill: "bg-blue-50 text-blue-700 border-blue-200/80",
        borderHover: "hover:border-blue-300",
    },
    green: {
        iconBg: "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/30",
        accentBg: "from-emerald-500/15 via-teal-500/10 to-transparent",
        indicator: "bg-gradient-to-r from-emerald-500 to-teal-400",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        borderHover: "hover:border-emerald-300",
    },
    purple: {
        iconBg: "bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/30",
        accentBg: "from-purple-500/15 via-pink-500/10 to-transparent",
        indicator: "bg-gradient-to-r from-purple-500 to-pink-400",
        pill: "bg-purple-50 text-purple-700 border-purple-200/80",
        borderHover: "hover:border-purple-300",
    },
    amber: {
        iconBg: "bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-md shadow-amber-500/30",
        accentBg: "from-amber-500/15 via-orange-500/10 to-transparent",
        indicator: "bg-gradient-to-r from-amber-500 to-orange-400",
        pill: "bg-amber-50 text-amber-700 border-amber-200/80",
        borderHover: "hover:border-amber-300",
    },
    indigo: {
        iconBg: "bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/30",
        accentBg: "from-indigo-500/15 via-blue-500/10 to-transparent",
        indicator: "bg-gradient-to-r from-indigo-500 to-blue-400",
        pill: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
        borderHover: "hover:border-indigo-300",
    },
    red: {
        iconBg: "bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md shadow-rose-500/30",
        accentBg: "from-rose-500/15 via-red-500/10 to-transparent",
        indicator: "bg-gradient-to-r from-rose-500 to-red-400",
        pill: "bg-rose-50 text-rose-700 border-rose-200/80",
        borderHover: "hover:border-rose-300",
    },
    cyan: {
        iconBg: "bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-md shadow-cyan-500/30",
        accentBg: "from-cyan-500/15 via-blue-500/10 to-transparent",
        indicator: "bg-gradient-to-r from-cyan-500 to-blue-400",
        pill: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
        borderHover: "hover:border-cyan-300",
    },
};

export function StatCard({
    title,
    value,
    icon: Icon,
    color = "blue",
    description,
    href,
    trend,
}: StatCardProps) {
    const styling = colorStyles[color] || colorStyles.blue;

    const content = (
        <div className={`kpi-card relative overflow-hidden group bg-white/95 backdrop-blur-xs border border-slate-200/90 ${styling.borderHover} shadow-xs hover:shadow-lg transition-all duration-200`}>
            {/* Subtle Gradient Glow Corner */}
            <div
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${styling.accentBg} pointer-events-none opacity-80 group-hover:scale-135 transition-transform duration-300`}
            />

            {/* Top Accent Strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${styling.indicator}`} />

            <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="min-w-0 flex-1">
                    <p className="kpi-label text-slate-500">{title}</p>
                    <h4 className="kpi-value text-slate-900 mt-1">{value}</h4>
                </div>
                <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${styling.iconBg} transition-transform duration-200 group-hover:scale-110`}
                >
                    <Icon size={20} />
                </div>
            </div>

            {(description || trend) && (
                <div className="mt-4 pt-3 border-t border-slate-100/90 flex items-center justify-between text-xs relative z-10">
                    {description && (
                        <span className="text-slate-500 truncate font-medium">{description}</span>
                    )}
                    {trend && (
                        <span
                            className={`font-bold shrink-0 px-2 py-0.5 rounded-full text-[10px] ${
                                trend.positive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                        >
                            {trend.label}
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block no-underline">
                {content}
            </Link>
        );
    }

    return content;
}
