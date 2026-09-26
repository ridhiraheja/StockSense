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
    actionNode?: React.ReactNode;
}

export function EmptyState({
    title,
    description,
    icon: Icon = PackageOpen,
    actionLabel,
    actionHref,
    onAction,
    actionNode,
}: EmptyStateProps) {
    return (
        <div className="empty-state my-4">
            <div className="empty-state-icon">
                <Icon size={22} />
            </div>
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-description">{description}</p>
            {actionNode && <div className="mt-4 flex justify-center">{actionNode}</div>}
            {actionLabel && actionHref && !actionNode && (
                <div className="mt-4 flex justify-center">
                    <Link href={actionHref} className="ss-button ss-button-primary">
                        {actionLabel}
                    </Link>
                </div>
            )}
            {actionLabel && onAction && !actionHref && !actionNode && (
                <div className="mt-4 flex justify-center">
                    <button onClick={onAction} className="ss-button ss-button-primary">
                        {actionLabel}
                    </button>
                </div>
            )}
        </div>
    );
}
