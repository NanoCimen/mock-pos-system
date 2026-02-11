# YAPos UI

Minimal POS UI to create **tables** and **tickets** for testing with YAP.

## Run locally (dev)

1. Install and start the API (from repo root):
   ```bash
   npm install && npm run db:migrate:tables && npm run db:seed
   npm run dev
   ```
2. In another terminal, run the UI (from repo root):
   ```bash
   npm run pos-ui:dev
   ```
3. Open **http://localhost:3003**. The UI uses **http://localhost:3000/api/v1** by default.

## Point to cloud POS

To use the deployed API (https://pos.yap.net.do):

```bash
VITE_POS_API_URL=https://pos.yap.net.do/api/v1 VITE_POS_API_KEY=dev-api-key-12345 npm run dev
```

Or create `pos-ui/.env`:

```
VITE_POS_API_URL=https://pos.yap.net.do/api/v1
VITE_POS_API_KEY=dev-api-key-12345
```

## Build and serve from main server

From repo root:

```bash
npm run pos-ui:build
npm start
```

Then open **http://localhost:3000** (or https://pos.yap.net.do in production). The same server serves both the API and the POS UI.

## Amounts (DOP)

All amounts are in **whole DOP** (e.g. 320 = 320 DOP, 3200 = 3200 DOP). No cents conversion.

## Flow for YAP testing

1. **Tables** – Add tables (e.g. mesa_1, Table 1) or use existing ones.
2. **Tickets** – Create a ticket for a table.
3. **Ticket detail** – Add items (price in DOP). Use **Remove** on any unpaid item to delete it (e.g. to clean duplicate items so total matches). **Copy** the ticket ID.
4. **In YAP** – Point YAP to your POS API (`http://localhost:3000/api/v1` or `https://pos.yap.net.do/api/v1`) with header `X-POS-API-KEY: dev-api-key-12345`. Use the ticket ID to:
   - `GET /api/v1/tickets/:ticketId` – fetch ticket and items.
   - `POST /api/v1/payments` – send payment with `ticketId`, `items` (array of `{ itemId, quantity }`), `amount` (total in DOP), `method`, `externalProvider`, `externalPaymentId`.
5. After payment, refresh the ticket in the POS UI to see updated paid status.
