import React from "react";
import { DocumentStatus, StockMoveType, AdjustmentReason } from "@/lib/types";
import {
    Clock3,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    SlidersHorizontal,
} from "lucide-react";

interface StatusBadgeProps {
    status: DocumentStatus | StockMoveType | AdjustmentReason | string;
    type?: "document" | "move" | "stock" | "reason";
    className?: string;
}

export function StatusBadge({
    status,
    type = "document",
    className = "",
}: StatusBadgeProps) {
    const s = String(status || "").toLowerCase().trim();

    // Stock Status
    if (
        type === "stock" ||
        s === "in stock" ||
        s === "low stock" ||
        s === "out of stock"
    ) {
        if (s === "out of stock") {
            return (
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    Out of Stock
                </span>
            );
        }
        if (s === "low stock") {
            return (
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                    Low Stock
                </span>
            );
        }
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
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
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
                    >
                        <ArrowDownRight size={12} className="text-emerald-600" />
                        Receipt
                    </span>
                );
            case "delivery":
                return (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
                    >
                        <ArrowUpRight size={12} className="text-purple-600" />
                        Delivery
                    </span>
                );
            case "transfer_in":
            case "transfer in":
                return (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
                    >
                        <ArrowRightLeft size={12} className="text-blue-600" />
                        Transfer In
                    </span>
                );
            case "transfer_out":
            case "transfer out":
                return (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
                    >
                        <ArrowRightLeft size={12} className="text-indigo-600" />
                        Transfer Out
                    </span>
                );
            case "adjustment":
                return (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
                    >
                        <SlidersHorizontal size={12} className="text-amber-600" />
                        Adjustment
                    </span>
                );
            default:
                return (
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
                    >
                        {status}
                    </span>
                );
        }
    }

    // Document Status
    switch (s) {
        case "draft":
            return (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 ${className}`}
                >
                    <Clock3 size={12} className="text-slate-500" />
                    Draft
                </span>
            );
        case "waiting":
            return (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 ${className}`}
                >
                    <Clock3 size={12} className="text-amber-600" />
                    Waiting
                </span>
            );
        case "ready":
            return (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-300 ${className}`}
                >
                    <AlertCircle size={12} className="text-blue-600" />
                    Ready
                </span>
            );
        case "done":
            return (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 ${className}`}
                >
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Done
                </span>
            );
        case "canceled":
        case "cancelled":
            return (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 ${className}`}
                >
                    <XCircle size={12} className="text-rose-600" />
                    Canceled
                </span>
            );
        default:
            return (
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 capitalize ${className}`}
                >
                    {status}
                </span>
            );
    }
}
