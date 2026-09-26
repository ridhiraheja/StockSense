import React from "react";
import { LucideIcon, PackageOpen } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
}

export function EmptyState({
    title,
    description,
    icon: Icon = PackageOpen,
    actionLabel,
    actionHref,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="text-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-300 my-4">
            <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Icon size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
                {description}
            </p>
            {actionLabel && actionHref && (
                <Link
                    href={actionHref}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition shadow-xs"
                >
                    {actionLabel}
                </Link>
            )}
            {actionLabel && onAction && !actionHref && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition shadow-xs"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
