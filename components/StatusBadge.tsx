import React from "react";
import { DocumentStatus, StockMoveType, AdjustmentReason } from "@/lib/types";

interface StatusBadgeProps {
    status: DocumentStatus | StockMoveType | AdjustmentReason | string;
    type?: "document" | "move" | "stock" | "reason";
}

export function StatusBadge({ status, type = "document" }: StatusBadgeProps) {
    const s = String(status || "").toLowerCase();

    if (type === "stock" || s === "in stock" || s === "low stock" || s === "out of stock") {
        if (s === "out of stock") {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                    <span className="w-1.5 h-1.5 mr-1.5 bg-red-600 rounded-full"></span>
                    Out of Stock
                </span>
            );
        }
        if (s === "low stock") {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 mr-1.5 bg-amber-600 rounded-full"></span>
                    Low Stock
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-600 rounded-full"></span>
                In Stock
            </span>
        );
    }

    if (type === "move" || ["receipt", "delivery", "transfer_in", "transfer_out", "adjustment"].includes(s)) {
        switch (s) {
            case "receipt":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        + Receipt
                    </span>
                );
            case "delivery":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        - Delivery
                    </span>
                );
            case "transfer_in":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        → Transfer In
                    </span>
                );
            case "transfer_out":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        ← Transfer Out
                    </span>
                );
            case "adjustment":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        ~ Adjustment
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {status}
                    </span>
                );
        }
    }

    // Document Status
    switch (s) {
        case "draft":
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                    Draft
                </span>
            );
        case "waiting":
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    Waiting
                </span>
            );
        case "ready":
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                    Ready
                </span>
            );
        case "done":
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Done
                </span>
            );
        case "canceled":
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                    Canceled
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 capitalize">
                    {status}
                </span>
            );
    }
}
