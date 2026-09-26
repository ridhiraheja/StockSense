export type DocumentStatus = "draft" | "waiting" | "ready" | "done" | "canceled";

export type StockMoveType = "receipt" | "delivery" | "transfer_in" | "transfer_out" | "adjustment";

export type AdjustmentReason = "damaged" | "lost" | "found" | "count_correction" | "other";

export interface Profile {
    id: string;
    email: string;
    full_name?: string | null;
    role?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Warehouse {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Location {
    id: string;
    warehouse_id: string;
    name: string;
    code: string;
    is_active: boolean;
    created_at?: string;
    warehouse?: Warehouse;
}

export interface Category {
    id: string;
    name: string;
    description?: string | null;
    created_at?: string;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    description?: string | null;
    category_id?: string | null;
    unit_of_measure: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    category?: Category;
    total_stock?: number;
}

export interface StockLevel {
    id: string;
    product_id: string;
    location_id: string;
    quantity: number;
    updated_at?: string;
    product?: Product;
    location?: Location;
}

export interface ReorderRule {
    id: string;
    product_id: string;
    location_id?: string | null;
    min_quantity: number;
    reorder_quantity: number;
    is_active: boolean;
    created_at?: string;
}

export interface Receipt {
    id: string;
    receipt_number: string;
    supplier_name?: string | null;
    warehouse_id: string;
    status: DocumentStatus;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
    warehouse?: Warehouse;
    receipt_items?: ReceiptItem[];
}

export interface ReceiptItem {
    id: string;
    receipt_id: string;
    product_id: string;
    location_id: string;
    quantity: number;
    created_at?: string;
    product?: Product;
    location?: Location;
}

export interface Delivery {
    id: string;
    delivery_number: string;
    customer_name?: string | null;
    warehouse_id: string;
    status: DocumentStatus;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
    warehouse?: Warehouse;
    delivery_items?: DeliveryItem[];
}

export interface DeliveryItem {
    id: string;
    delivery_id: string;
    product_id: string;
    location_id: string;
    quantity: number;
    created_at?: string;
    product?: Product;
    location?: Location;
}

export interface Transfer {
    id: string;
    transfer_number: string;
    source_location_id: string;
    destination_location_id: string;
    status: DocumentStatus;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
    source_location?: Location;
    destination_location?: Location;
    transfer_items?: TransferItem[];
}

export interface TransferItem {
    id: string;
    transfer_id: string;
    product_id: string;
    quantity: number;
    created_at?: string;
    product?: Product;
}

export interface Adjustment {
    id: string;
    adjustment_number: string;
    warehouse_id: string;
    status: DocumentStatus;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
    warehouse?: Warehouse;
    adjustment_items?: AdjustmentItem[];
}

export interface AdjustmentItem {
    id: string;
    adjustment_id: string;
    product_id: string;
    location_id: string;
    counted_quantity: number;
    difference: number;
    reason: AdjustmentReason;
    created_at?: string;
    product?: Product;
    location?: Location;
}

export interface StockMove {
    id: string;
    product_id: string;
    location_id?: string | null;
    source_location_id?: string | null;
    destination_location_id?: string | null;
    quantity: number;
    move_type: StockMoveType;
    reference?: string | null;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
    product?: Product;
    location?: Location;
    source_location?: Location;
    destination_location?: Location;
}
