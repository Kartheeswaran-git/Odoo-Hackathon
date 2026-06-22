# TypeScript Routes Documentation

This document explains the TypeScript route definitions located in the `backend/src/routes/` directory of the application. These routes define the API endpoints for managing the core ERP modules.

All these routes use the `express.Router()` object and interact with the PostgreSQL database via a shared `pool` imported from `../db`.

---

## 1. Authentication Routes (`auth.routes.ts`)

These routes handle user authentication and user listing.

### `POST /login`
- **Purpose**: Authenticates a user by their `name`.
- **Request Body**: `{ "name": "string" }`
- **Logic**: Queries the `users` table for a matching name. If found, it returns the user object and a mock JWT token (`mock-jwt-token`). In a production setting, this would verify a password hash and issue a real JWT.

### `GET /users`
- **Purpose**: Fetches a list of all registered users.
- **Logic**: Executes `SELECT * FROM users ORDER BY id ASC` and returns the array of users.

---

## 2. Bill of Materials (BOM) Routes (`bom.routes.ts`)

These routes manage the recipes/components required to manufacture products.

### `GET /`
- **Purpose**: Retrieves all Bills of Materials.
- **Logic**: Performs a SQL `JOIN` between `bills_of_materials` and `products` to return the BOM ID, Product ID, and Product Name, ordered from newest to oldest.

### `POST /`
- **Purpose**: Creates a new Bill of Material and its associated components.
- **Request Body**:
  ```json
  {
    "product_id": "uuid",
    "components": [
      { "component_product_id": "uuid", "quantity": number }
    ]
  }
  ```
- **Logic**: Uses a database transaction (`BEGIN` / `COMMIT`). It first inserts a row into `bills_of_materials`. Then, it iterates through the provided `components` array and inserts each into the `bom_components` table. If any insertion fails, it rolls back the entire transaction.

---

## 3. Manufacturing Orders Routes (`manufacturing.routes.ts`)

These routes handle requests to manufacture products.

### `GET /`
- **Purpose**: Retrieves a list of all manufacturing orders.
- **Logic**: Executes `SELECT * FROM manufacturing_orders ORDER BY id DESC`.

### `POST /`
- **Purpose**: Creates a new manufacturing order.
- **Request Body**: `{ "product_id": "uuid", "quantity": number }`
- **Logic**: Inserts a new record into the `manufacturing_orders` table with the requested product and quantity, and returns the created record.

---

## 4. Products Routes (`products.routes.ts`)

These routes manage the master inventory catalog.

### `GET /`
- **Purpose**: Retrieves the entire product catalog.
- **Logic**: Executes `SELECT * FROM products ORDER BY id DESC`.

### `POST /`
- **Purpose**: Adds a new product to the catalog.
- **Request Body**:
  ```json
  {
    "sku": "string",
    "name": "string",
    "cost_price": number,
    "sales_price": number,
    "procurement_type": "string",
    "procurement_source": "string"
  }
  ```
- **Logic**: Inserts the new product into the `products` table. Uses default values for prices (`0`) and procurement type (`'MTS'` - Make To Stock) if not provided.

---

## 5. Purchase Orders Routes (`purchase.routes.ts`)

These routes manage purchasing stock from vendors.

### `GET /`
- **Purpose**: Retrieves all purchase orders.
- **Logic**: Executes `SELECT * FROM purchase_orders ORDER BY id DESC`.

### `POST /`
- **Purpose**: Creates a new purchase order and its associated line items.
- **Request Body**:
  ```json
  {
    "vendor_name": "string",
    "items": [
      { "product_id": "uuid", "quantity": number, "unit_cost": number }
    ]
  }
  ```
- **Logic**: Utilizes a database transaction. First, it creates the main `purchase_orders` record for the given `vendor_name`. Then, it iterates through the `items` array, inserting each line item into `purchase_order_items`. If successful, the transaction is committed; otherwise, it rolls back.

---

## 6. Sales Orders Routes (`sales.routes.ts`)

These routes manage customer orders and sales demand.

### `GET /`
- **Purpose**: Retrieves all sales orders.
- **Logic**: Executes `SELECT * FROM sales_orders ORDER BY id DESC`.

### `POST /`
- **Purpose**: Creates a new sales order with multiple product line items.
- **Request Body**:
  ```json
  {
    "customer_name": "string",
    "items": [
      { "product_id": "uuid", "quantity": number, "unit_price": number }
    ]
  }
  ```
- **Logic**: Operates within a transaction. Inserts the parent record into `sales_orders` with the `customer_name`. It then inserts each item into `sales_order_items` linked to the parent order. On failure, all insertions are rolled back to maintain data integrity.
