BEGIN;

CREATE TYPE user_role AS ENUM (
  'Admin',
  'Sales',
  'Purchase',
  'Manufacturing',
  'Inventory'
);

CREATE TYPE procurement_type AS ENUM ('MTS', 'MTO');
CREATE TYPE procurement_source AS ENUM ('PURCHASE', 'MANUFACTURING');
CREATE TYPE sales_order_status AS ENUM ('DRAFT', 'CONFIRMED', 'DELIVERED', 'CANCELLED');
CREATE TYPE purchase_order_status AS ENUM ('DRAFT', 'CONFIRMED', 'RECEIVED');
CREATE TYPE manufacturing_order_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE stock_movement_type AS ENUM ('IN', 'OUT', 'RESERVED', 'CONSUMED');

CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL CHECK (BTRIM(name) <> ''),
  role user_role NOT NULL
);

CREATE TABLE products (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE CHECK (BTRIM(sku) <> ''),
  name VARCHAR(255) NOT NULL CHECK (BTRIM(name) <> ''),
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sales_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (sales_price >= 0),
  on_hand_qty NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0),
  reserved_qty NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0 AND reserved_qty <= on_hand_qty),
  procurement_type procurement_type NOT NULL DEFAULT 'MTS',
  procurement_source procurement_source NOT NULL
);

CREATE TABLE bills_of_materials (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE bom_components (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bom_id INTEGER NOT NULL REFERENCES bills_of_materials(id) ON UPDATE CASCADE ON DELETE CASCADE,
  component_product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  UNIQUE (bom_id, component_product_id)
);

CREATE TABLE sales_orders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL CHECK (BTRIM(customer_name) <> ''),
  status sales_order_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_order_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  UNIQUE (sales_order_id, product_id)
);

CREATE TABLE purchase_orders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL CHECK (BTRIM(vendor_name) <> ''),
  status purchase_order_status NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE purchase_order_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14, 2) NOT NULL CHECK (unit_cost >= 0),
  UNIQUE (purchase_order_id, product_id)
);

CREATE TABLE manufacturing_orders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  status manufacturing_order_status NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE stock_ledger (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  movement_type stock_movement_type NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  reference_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bom_components_component_product_id ON bom_components(component_product_id);
CREATE INDEX idx_sales_order_items_product_id ON sales_order_items(product_id);
CREATE INDEX idx_purchase_order_items_product_id ON purchase_order_items(product_id);
CREATE INDEX idx_manufacturing_orders_product_id ON manufacturing_orders(product_id);
CREATE INDEX idx_stock_ledger_product_created_at ON stock_ledger(product_id, created_at DESC);
CREATE INDEX idx_stock_ledger_reference_id ON stock_ledger(reference_id);

COMMIT;
