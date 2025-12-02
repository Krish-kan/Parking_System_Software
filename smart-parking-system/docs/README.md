
# Smart Parking Management System

A minimal, *working* template that follows the project steps you provided.

## 1) Prerequisites
- Node.js 18+
- MySQL 8+
- VS Code (recommended)

## 2) Setup Database
```sql
-- in MySQL
CREATE DATABASE smart_parking DEFAULT CHARACTER SET utf8mb4;
USE smart_parking;
SOURCE ./database/schema.sql;
```
> The default admin row uses a dummy hash. Create a real admin via registration.

## 3) Backend
```bash
cd backend
cp .env.example .env
# edit .env with your DB credentials
npm install
npm run start   # or: npm run dev
```
You should see: `Listening on 3000` and hitting `http://localhost:3000/` returns "Smart Parking API running!"

## 4) Frontend
Open `frontend/index.html` via Live Server (or any static server). For a quick serve:
- Use VS Code "Live Server" extension, or
- Python: `cd frontend && python -m http.server 5500`

## 5) Flow Demo
1. Register a user (or owner) on `index.html`.
2. (As owner) create lots via API tools like Postman, or insert rows directly.
   - For a GUI, add POST `/api/lots` (Authorization: Bearer <token>).
3. Add spaces with `POST /api/lots/:lotId/spaces` body:
```json
{"spaces":[{"space_number":"A1"},{"space_number":"A2"}]}
```
4. Search lots on `search.html`; book a space -> a QR is generated and visible in dashboard/history.

## 6) Key Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/lots` and `GET /api/lots/:id`
- `POST /api/lots` (admin/owner)
- `POST /api/lots/:lotId/spaces` (admin/owner)
- `POST /api/reservations` (user) -> generates QR
- `GET  /api/reservations` (user)
- `POST /api/qr/validate-entry` (owner/admin)
- `POST /api/qr/validate-exit`  (owner/admin)

## 7) Notes
- Payments, Maps, emails, WebSockets, and admin UI are left extension-ready.
- Use this as a base and expand per your roadmap.


---
## New Modules

### Realtime Availability
- Requires nothing extra from you; Socket.io is embedded. Frontend listens for `space_update` events.

### Google Maps & Places
- Edit `frontend/pages/search.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` with your key.
- Autocomplete centers the map; you can wire the selected city to the `/api/lots?city=` filter.

### Razorpay (Test)
- Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `backend/.env` for live test orders.
- Without keys, the flow automatically switches to **mock** and still lets you generate a **Receipt PDF**.

### Receipt PDFs
- Endpoint: `GET /api/payments/receipt/:reservation_id` (requires auth). Streams a PDF with details + QR.

### Admin UI
- `frontend/pages/admin.html`: Create lots, add spaces in bulk, and view analytics (counters + revenue by lot).

### Install New Deps
```bash
cd backend
npm install
npm run start
```
