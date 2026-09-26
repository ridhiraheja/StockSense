"use client";

import React from "react";
import Link from "next/link";
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    XCircle,
    PackageOpen,
    Loader2,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    SlidersHorizontal,
    Info,
    AlertTriangle,
} from "lucide-react";

// ==========================================
// BUTTON COMPONENT
// ==========================================
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export function Button({
    children,
    className = "",
    variant = "primary",
    size = "md",
    isLoading = false,
    icon,
    disabled,
    fullWidth = false,
    ...props
}: ButtonProps) {
    const variantClass =
        variant === "primary"
            ? "ss-button-primary"
            : variant === "secondary"
            ? "ss-button-secondary"
            : variant === "danger"
            ? "ss-button-danger"
            : variant === "ghost"
            ? "ss-button-ghost"
            : "ss-button-secondary";

    const sizeClass =
        size === "sm" ? "ss-button-sm" : size === "lg" ? "ss-button-lg" : "";
    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            className={`ss-button ${variantClass} ${sizeClass} ${widthClass} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 size={16} className="animate-spin shrink-0" />
            ) : (
                icon && <span className="shrink-0">{icon}</span>
            )}
            <span>{children}</span>
        </button>
    );
}

// ==========================================
// STATUS & MOVEMENT BADGE COMPONENT
// ==========================================
export type BadgeStatus =
    | "draft"
    | "waiting"
    | "ready"
    | "done"
    | "canceled"
    | "in stock"
    | "low stock"
    | "out of stock"
    | "receipt"
    | "delivery"
    | "transfer_in"
    | "transfer_out"
    | "adjustment"
    | string;

export interface StatusBadgeProps {
    status: BadgeStatus;
    type?: "document" | "stock" | "move" | "reason";
    className?: string;
}

export function StatusBadge({ status, type = "document", className = "" }: StatusBadgeProps) {
    const s = String(status || "").toLowerCase().trim();

    // Stock Status
    if (type === "stock" || s === "in stock" || s === "low stock" || s === "out of stock") {
        if (s === "out of stock") {
            return (
                <span className={`status-badge bg-rose-50 text-rose-700 border border-rose-200/80 font-bold ${className}`}>
                    <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                    Out of Stock
                </span>
            );
        }
        if (s === "low stock") {
            return (
                <span className={`status-badge bg-amber-50 text-amber-700 border border-amber-200/80 font-bold ${className}`}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    Low Stock
                </span>
            );
        }
        return (
            <span className={`status-badge bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold ${className}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                In Stock
            </span>
        );
    }

    // Move Type Status
    if (
        type === "move" ||
        ["receipt", "delivery", "transfer_in", "transfer_out", "adjustment"].includes(s)
    ) {
        switch (s) {
            case "receipt":
                return (
                    <span className={`status-badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold ${className}`}>
                        <ArrowDownRight size={13} className="text-emerald-600 shrink-0" />
                        Receipt
                    </span>
                );
            case "delivery":
                return (
                    <span
                        className={`status-badge bg-purple-50 text-purple-700 border border-purple-200 font-bold ${className}`}
                    >
                        <ArrowUpRight size={13} className="text-purple-600 shrink-0" />
                        Delivery
                    </span>
                );
            case "transfer_in":
            case "transfer in":
                return (
                    <span
                        className={`status-badge bg-blue-50 text-blue-700 border border-blue-200 font-bold ${className}`}
                    >
                        <ArrowRightLeft size={13} className="text-blue-600 shrink-0" />
                        Transfer In
                    </span>
                );
            case "transfer_out":
            case "transfer out":
                return (
                    <span
                        className={`status-badge bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold ${className}`}
                    >
                        <ArrowRightLeft size={13} className="text-indigo-600 shrink-0" />
                        Transfer Out
                    </span>
                );
            case "adjustment":
                return (
                    <span
                        className={`status-badge bg-amber-50 text-amber-700 border border-amber-200 font-bold ${className}`}
                    >
                        <SlidersHorizontal size={13} className="text-amber-600 shrink-0" />
                        Adjustment
                    </span>
                );
            default:
                return (
                    <span className={`status-badge status-draft ${className}`}>
                        {status}
                    </span>
                );
        }
    }

    // Document Status
    switch (s) {
        case "draft":
            return (
                <span className={`status-badge bg-slate-100 text-slate-700 border border-slate-300/80 font-bold ${className}`}>
                    <Clock3 size={13} className="text-slate-500 shrink-0" />
                    Draft
                </span>
            );
        case "waiting":
            return (
                <span className={`status-badge bg-amber-50 text-amber-700 border border-amber-200/90 font-bold ${className}`}>
                    <Clock3 size={13} className="text-amber-600 shrink-0" />
                    Waiting
                </span>
            );
        case "ready":
            return (
                <span className={`status-badge bg-blue-50 text-blue-700 border border-blue-200/90 font-bold ${className}`}>
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                    Ready
                </span>
            );
        case "done":
            return (
                <span className={`status-badge bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-bold ${className}`}>
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    Done
                </span>
            );
        case "canceled":
        case "cancelled":
            return (
                <span className={`status-badge bg-rose-50 text-rose-700 border border-rose-200/90 font-bold ${className}`}>
                    <XCircle size={13} className="text-rose-600 shrink-0" />
                    Cancelled
                </span>
            );
        default:
            return (
                <span className={`status-badge status-draft ${className}`}>
                    {status}
                </span>
            );
    }
}

// ==========================================
// PAGE HEADER COMPONENT
// ==========================================
export function PageHeader({
    title,
    description,
    action,
    badge,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
    badge?: React.ReactNode;
}) {
    return (
        <div className="page-header">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="page-title">{title}</h1>
                    {badge}
                </div>
                {description && <p className="page-description">{description}</p>}
            </div>
            {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
    );
}

// ==========================================
// EMPTY STATE COMPONENT
// ==========================================
export function EmptyState({
    title,
    description,
    action,
    actionLabel,
    actionHref,
    onAction,
    icon: Icon = PackageOpen,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                <Icon size={24} />
            </div>
            <div className="empty-state-title">{title}</div>
            {description && <div className="empty-state-description">{description}</div>}

            {action ? (
                <div className="mt-4 flex justify-center">{action}</div>
            ) : actionLabel && actionHref ? (
                <div className="mt-4 flex justify-center">
                    <Link href={actionHref} className="ss-button ss-button-primary">
                        {actionLabel}
                    </Link>
                </div>
            ) : actionLabel && onAction ? (
                <div className="mt-4 flex justify-center">
                    <Button onClick={onAction}>{actionLabel}</Button>
                </div>
            ) : null}
        </div>
    );
}

// ==========================================
// ALERT NOTIFICATION COMPONENT
// ==========================================
export function Alert({
    type = "info",
    title,
    children,
    className = "",
}: {
    type?: "success" | "error" | "warning" | "info";
    title?: string;
    children: React.ReactNode;
    className?: string;
}) {
    const typeClass =
        type === "success"
            ? "ss-alert-success"
            : type === "error"
            ? "ss-alert-error"
            : type === "warning"
            ? "ss-alert-warning"
            : "ss-alert-info";

    const Icon =
        type === "success"
            ? CheckCircle2
            : type === "error"
            ? AlertCircle
            : type === "warning"
            ? AlertTriangle
            : Info;

    return (
        <div className={`ss-alert ${typeClass} ${className}`} role="alert">
            <Icon size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
                {title && <h5 className="font-semibold text-xs mb-0.5">{title}</h5>}
                <div className="text-xs leading-relaxed">{children}</div>
            </div>
        </div>
    );
}

// ==========================================
// CARD COMPONENTS
// ==========================================
export function Card({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={`ss-card ${className}`}>{children}</div>;
}

export function CardHeader({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${className}`}
        >
            {children}
        </div>
    );
}

export function CardTitle({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <h3 className={`text-sm font-bold text-slate-900 tracking-tight ${className}`}>
            {children}
        </h3>
    );
}

export function CardDescription({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <p className={`text-xs text-slate-500 mt-0.5 ${className}`}>{children}</p>;
}

export function CardContent({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`px-5 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between ${className}`}
        >
            {children}
        </div>
    );
}

// ==========================================
// FORM UTILITIES
// ==========================================
export function Label({
    children,
    required = false,
    className = "",
    htmlFor,
}: {
    children: React.ReactNode;
    required?: boolean;
    className?: string;
    htmlFor?: string;
}) {
    return (
        <label htmlFor={htmlFor} className={`ss-label ${className}`}>
            {children}
            {required && <span className="required">*</span>}
        </label>
    );
}

export function Input({
    className = "",
    ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={`ss-input ${className}`} {...props} />;
}

export function Select({
    className = "",
    children,
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={`ss-select ${className}`} {...props}>
            {children}
        </select>
    );
}

export function Textarea({
    className = "",
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={`ss-textarea ${className}`} {...props} />;
}

// ==========================================
// SKELETON LOADERS
// ==========================================
export function Skeleton({
    className = "",
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) {
    return <div className={`skeleton-pulse ${className}`} style={style} />;
}

export function TableSkeleton({
    rows = 5,
    columns = 5,
}: {
    rows?: number;
    columns?: number;
}) {
    return (
        <div className="ss-table-wrapper p-4 space-y-3">
            <div className="flex gap-4 pb-3 border-b border-slate-100">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 py-2 border-b border-slate-50">
                    {Array.from({ length: columns }).map((_, c) => (
                        <Skeleton key={c} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}