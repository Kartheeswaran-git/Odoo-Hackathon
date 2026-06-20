# Shiv Furniture Works ERP

Furniture-manufacturing ERP with a React frontend, Express REST API, and Supabase PostgreSQL database.

## Architecture

| Layer | Location | Responsibility |
|---|---|---|
| Frontend | `frontend/` | Screens, forms, navigation, UI state, and calls to the REST API only. It has no direct Supabase client or database access. |
| Backend | `backend/` | Login/signup, JWT validation, role/permission checks, inventory reads, sales-order creation, staff access management, and REST endpoints. |
| Database | `database/` | PostgreSQL schema, inventory ledger, BoMs, order relations, audit log, RLS policies, and the user permission matrix. |

## Database setup

Run these complete files in order in the Supabase SQL Editor:

1. [01_init_schema.sql](database/01_init_schema.sql)
2. [04_user_access_control.sql](database/04_user_access_control.sql)

Promote the first Admin after signup:

```sql
update public.users
set role = 'Admin', active = true
where id = 'AUTH_USER_UUID';
```

## Backend setup

```sh
cd backend
cp .env.example .env
npm install
npm run dev
```

Set these values in `backend/.env`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
FRONTEND_URL=http://localhost:5174
```

### Backend operations

- `POST /api/auth/login` - Supabase email/password sign-in
- `POST /api/auth/signup` - create a staff account
- `GET /api/auth/me` - authenticated profile and permission matrix
- `GET /api/inventory` - live Free-to-Use inventory
- `GET/POST /api/sales-orders` - list and create sales drafts
- `POST /api/sales-orders/:id/confirm` - backend-only stock reservation, MTO deficit handling, and draft purchase/manufacturing generation
- `GET /api/staff` - Admin staff list and permissions
- `PUT /api/staff/:id` - Admin activation, role, and CRUD permission updates
- `GET /api/modules/:module` - supported module data
- `POST/DELETE /api/modules/:module` - create or delete supported module records; records persist in PostgreSQL `module_records`

## Frontend setup

```sh
cd frontend
cp .env.example .env
npm install
npm run dev -- --port 5174
```

Set `VITE_API_URL=http://localhost:3000` in `frontend/.env`.

### Frontend modules

- Dashboard
- Parties
- Items and Product Ledger
- Sales
- Purchases
- Manufacturing
- Bill of Materials
- Reports
- Audit Logs
- Manage Users
- Settings
- Login and Signup

## Staff access workflow

1. A staff member signs up at `/signup`.
2. The account remains inactive.
3. An Admin opens **Manage Users**.
4. The Admin activates the account and grants View/Create/Edit/Delete/Approve permissions per module.
5. The staff member signs in again; the API enforces the granted access.
