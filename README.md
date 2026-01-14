# POS Simulator - REST API

A cloud-hosted REST POS Simulator that behaves like a real restaurant POS (similar to Square, Toast, and Clover), designed specifically to test third-party payment and bill-splitting integrations like YAP.

## 🎯 Features

- **Partial Payment Support**: Items can be paid in multiple transactions
- **External Payment Confirmations**: Accepts payments from external providers
- **Real-world Failure Modes**: Simulates common POS failures
- **REST API**: Clean, versioned JSON API
- **API Key Authentication**: Secure access control

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/pos_simulator
PORT=3000
POS_API_KEY=dev-api-key-12345
SIMULATED_DELAY_MS=0
FAILURE_RATE=0.0
```

### 3. Initialize Database

```bash
npm run db:init
npm run db:seed
```

### 4. Start Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Reference

### Authentication

All API requests require the `X-POS-API-KEY` header:

```bash
X-POS-API-KEY: dev-api-key-12345
```

### Base URL

```
http://localhost:3000/api/v1
```

---

## 📋 Endpoints

### Get Capabilities

```bash
curl -X GET http://localhost:3000/api/v1/capabilities \
  -H "X-POS-API-KEY: dev-api-key-12345"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supportsPartialPayments": true,
    "supportsItemLocking": false,
    "supportsWebhooks": false,
    "supportsRefunds": false,
    "currency": ["DOP"]
  }
}
```

---

### List All Tickets

```bash
curl -X GET "http://localhost:3000/api/v1/tickets?status=open" \
  -H "X-POS-API-KEY: dev-api-key-12345"
```

**Query Parameters:**
- `status` (optional): `open`, `partially_paid`, `paid`, `cancelled`
- `tableId` (optional): Filter by table ID

---

### Get Ticket by ID

```bash
curl -X GET http://localhost:3000/api/v1/tickets/ticket_open_1 \
  -H "X-POS-API-KEY: dev-api-key-12345"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ticket_open_1",
    "table_id": "table_1",
    "status": "open",
    "currency": "DOP",
    "subtotal": 1850.00,
    "tax": 333.00,
    "total": 2183.00,
    "opened_at": "2026-01-14T10:30:00Z",
    "items": [
      {
        "id": "item_1_1",
        "ticket_id": "ticket_open_1",
        "name": "Caesar Salad",
        "unit_price": 350.00,
        "quantity": 2,
        "paid_quantity": 0,
        "status": "unpaid"
      }
    ]
  }
}
```

---

### Create New Ticket

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "table_10"
  }'
```

---

### Add Items to Ticket

```bash
curl -X POST http://localhost:3000/api/v1/tickets/ticket_open_1/items \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "Grilled Chicken",
        "unitPrice": 650.00,
        "quantity": 2,
        "notes": "Extra sauce"
      },
      {
        "name": "French Fries",
        "unitPrice": 200.00,
        "quantity": 1
      }
    ]
  }'
```

---

### Get Ticket Items

```bash
curl -X GET http://localhost:3000/api/v1/tickets/ticket_open_1/items \
  -H "X-POS-API-KEY: dev-api-key-12345"
```

---

### Update Item (Partial Payment)

```bash
curl -X PATCH http://localhost:3000/api/v1/items/item_1_1 \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "paidQuantity": 1,
    "notes": "Paid 1 of 2"
  }'
```

---

### Process External Payment ⭐

**This is the critical endpoint for YAP integration.**

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "ticket_open_1",
    "items": [
      {
        "itemId": "item_1_1",
        "quantity": 2
      },
      {
        "itemId": "item_1_2",
        "quantity": 1
      }
    ],
    "amount": 1850.00,
    "method": "card",
    "externalProvider": "YAP",
    "externalPaymentId": "yap_pay_xyz789"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment_xyz",
    "ticket_id": "ticket_open_1",
    "amount": 1850.00,
    "method": "card",
    "external_provider": "YAP",
    "external_payment_id": "yap_pay_xyz789",
    "status": "confirmed",
    "items": [...]
  }
}
```

**Error Responses:**

1. **Item Already Paid:**
```json
{
  "success": false,
  "error": "Item item_1_1 (Caesar Salad) is already fully paid"
}
```

2. **Ticket Closed:**
```json
{
  "success": false,
  "error": "Ticket is cancelled"
}
```

3. **Amount Mismatch:**
```json
{
  "success": false,
  "error": "Payment amount mismatch. Expected 1850.00, got 1800.00"
}
```

4. **Insufficient Quantity:**
```json
{
  "success": false,
  "error": "Only 1 units of Caesar Salad are available for payment (1 already paid)"
}
```

---

### Get Payments for Ticket

```bash
curl -X GET "http://localhost:3000/api/v1/payments?ticketId=ticket_open_1" \
  -H "X-POS-API-KEY: dev-api-key-12345"
```

---

### Close Ticket

```bash
curl -X POST http://localhost:3000/api/v1/tickets/ticket_open_1/close \
  -H "X-POS-API-KEY: dev-api-key-12345"
```

---

## 🧪 Testing Scenarios

### Scenario 1: Full Payment

```bash
# 1. Create ticket
TICKET_ID=$(curl -s -X POST http://localhost:3000/api/v1/tickets \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"tableId": "table_test"}' | jq -r '.data.id')

# 2. Add items
curl -X POST http://localhost:3000/api/v1/tickets/$TICKET_ID/items \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Burger", "unitPrice": 500.00, "quantity": 1},
      {"name": "Fries", "unitPrice": 200.00, "quantity": 1}
    ]
  }'

# 3. Get ticket with items
curl -X GET http://localhost:3000/api/v1/tickets/$TICKET_ID \
  -H "X-POS-API-KEY: dev-api-key-12345"

# 4. Pay full amount (826 DOP including tax)
curl -X POST http://localhost:3000/api/v1/payments \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d "{
    \"ticketId\": \"$TICKET_ID\",
    \"items\": [
      {\"itemId\": \"item_id_1\", \"quantity\": 1},
      {\"itemId\": \"item_id_2\", \"quantity\": 1}
    ],
    \"amount\": 826.00,
    \"method\": \"card\",
    \"externalProvider\": \"YAP\",
    \"externalPaymentId\": \"yap_test_123\"
  }"
```

### Scenario 2: Partial Payment (Bill Splitting)

```bash
# Use ticket_open_1 from seed data
# Item 1: Caesar Salad x2 @ 350 DOP each

# Person 1 pays for 1 salad
curl -X POST http://localhost:3000/api/v1/payments \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "ticket_open_1",
    "items": [{"itemId": "item_1_1", "quantity": 1}],
    "amount": 413.00,
    "method": "card",
    "externalProvider": "YAP",
    "externalPaymentId": "yap_person1"
  }'

# Person 2 pays for the second salad
curl -X POST http://localhost:3000/api/v1/payments \
  -H "X-POS-API-KEY: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "ticket_open_1",
    "items": [{"itemId": "item_1_1", "quantity": 1}],
    "amount": 413.00,
    "method": "card",
    "externalProvider": "YAP",
    "externalPaymentId": "yap_person2"
  }'
```

---

## 🔧 Development Mode

### Enable Failure Simulation

```bash
# .env
FAILURE_RATE=0.1  # 10% of requests will fail
SIMULATED_DELAY_MS=500  # 500ms delay on all requests
```

### Reset Database

```bash
npm run db:reset
```

---

## 📊 Seed Data

The database comes with pre-seeded data:

- **3 Open Tickets** (table_1, table_2, table_3)
- **1 Partially Paid Ticket** (table_4)
- **1 Fully Paid Ticket** (table_5)
- **21 Total Items**
- **3 Payment Records**

---

## 🏗️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Module System**: ESM

---

## 📝 Notes

- All amounts are in DOP (Dominican Pesos) by default
- Tax rate is 18% (configurable)
- Item quantities must be positive integers
- Partial payments are tracked per item
- Ticket status automatically updates based on item payment status

---

## 🤝 Integration Guide for YAP

1. Call `GET /api/v1/capabilities` to verify partial payment support
2. Call `GET /api/v1/tickets/:ticketId` to fetch ticket and items
3. User selects items to pay in YAP interface
4. Process payment through YAP
5. Call `POST /api/v1/payments` to confirm payment with POS
6. Handle error responses appropriately

---

## 📄 License

ISC
