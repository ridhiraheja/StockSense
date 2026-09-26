import React from "react";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: "blue" | "green" | "purple" | "amber" | "indigo" | "red";
    description?: string;
    href?: string;
}

const colorStyles = {
    blue: {
        bg: "bg-blue-50 text-blue-600 border-blue-200",
        iconBg: "bg-blue-500 text-white",
        glow: "hover:border-blue-300",
    },
    green: {
        bg: "bg-emerald-50 text-emerald-600 border-emerald-200",
        iconBg: "bg-emerald-500 text-white",
        glow: "hover:border-emerald-300",
    },
    purple: {
        bg: "bg-purple-50 text-purple-600 border-purple-200",
        iconBg: "bg-purple-500 text-white",
        glow: "hover:border-purple-300",
    },
    amber: {
        bg: "bg-amber-50 text-amber-600 border-amber-200",
        iconBg: "bg-amber-500 text-white",
        glow: "hover:border-amber-300",
    },
    indigo: {
        bg: "bg-indigo-50 text-indigo-600 border-indigo-200",
        iconBg: "bg-indigo-500 text-white",
        glow: "hover:border-indigo-300",
    },
    red: {
        bg: "bg-rose-50 text-rose-600 border-rose-200",
        iconBg: "bg-rose-500 text-white",
        glow: "hover:border-rose-300",
    },
};

export function StatCard({ title, value, icon: Icon, color, description, href }: StatCardProps) {
    const styling = colorStyles[color] || colorStyles.blue;

    const content = (
        <div className={`bg-white rounded-xl shadow-xs p-5 border border-slate-200 transition-all hover:shadow-sm ${styling.glow} ${href ? "cursor-pointer" : ""}`}>
            <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styling.iconBg} shadow-xs`}>
                    <Icon size={24} />
                </div>
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                    {value}
                </span>
            </div>
            <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }

    return content;
}
