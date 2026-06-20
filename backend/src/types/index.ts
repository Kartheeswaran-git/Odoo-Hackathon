export type DecimalString = string;
export type ISODateString = string;

export type UserRole =
  | 'Admin'
  | 'Sales'
  | 'Purchase'
  | 'Manufacturing'
  | 'Inventory';

export type ProcurementType = 'MTS' | 'MTO';
export type ProcurementSource = 'PURCHASE' | 'MANUFACTURING';
export type SalesOrderStatus = 'DRAFT' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
export type PurchaseOrderStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED';
export type ManufacturingOrderStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
export type StockMovementType = 'IN' | 'OUT' | 'RESERVED' | 'CONSUMED';

export interface User {
  id: number;
  name: string;
  role: UserRole;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  cost_price: DecimalString;
  sales_price: DecimalString;
  on_hand_qty: DecimalString;
  reserved_qty: DecimalString;
  procurement_type: ProcurementType;
  procurement_source: ProcurementSource;
}

export interface BillOfMaterials {
  id: number;
  product_id: number;
}

export interface BomComponent {
  id: number;
  bom_id: number;
  component_product_id: number;
  quantity: DecimalString;
}

export interface SalesOrder {
  id: number;
  customer_name: string;
  status: SalesOrderStatus;
  created_at: ISODateString;
}

export interface SalesOrderItem {
  id: number;
  sales_order_id: number;
  product_id: number;
  quantity: DecimalString;
  unit_price: DecimalString;
}

export interface PurchaseOrder {
  id: number;
  vendor_name: string;
  status: PurchaseOrderStatus;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  quantity: DecimalString;
  unit_cost: DecimalString;
}

export interface ManufacturingOrder {
  id: number;
  product_id: number;
  quantity: DecimalString;
  status: ManufacturingOrderStatus;
}

export interface StockLedgerEntry {
  id: number;
  product_id: number;
  movement_type: StockMovementType;
  quantity: DecimalString;
  reference_id: number | null;
  created_at: ISODateString;
}
