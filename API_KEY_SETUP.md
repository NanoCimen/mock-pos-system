# API Key Authentication Setup

## Backend Configuration

### 1. Update `backend/.env` file

Add the API_KEYS line to your existing `.env` file:

```env
PORT=3001
DATABASE_URL=postgresql://localhost:5432/mock_pos_db
API_KEYS=mock_pos_key_rest1,mock_pos_key_rest2,mock_pos_key_rest3
```

**Important:** The API keys must be comma-separated with NO SPACES.

### 2. Restart Backend Server

After updating `.env`, restart the backend:

```bash
cd backend
npm run dev
```

You should see: `API Keys Loaded: ✓` in the startup message.

## Frontend Configuration

The admin panel is already configured to use API key: `mock_pos_key_rest1`

If you need to change it, edit: `admin-panel/src/api/client.ts`

## How It Works

- **Public Route:** `/health` - No API key required
- **Protected Routes:** All `/api/*` routes require `X-API-Key` header
- **Default API Key:** `mock_pos_key_rest1` (for admin panel)

## Testing

```bash
# Test without API key (should fail)
curl http://localhost:3001/api/menu

# Test with API key (should work)
curl -H "X-API-Key: mock_pos_key_rest1" http://localhost:3001/api/menu

# Test health check (no key needed)
curl http://localhost:3001/health
```

## Security Notes

- Store API keys securely (never commit `.env` to git)
- Use different API keys for different environments
- Rotate keys periodically
- Each restaurant should have its own unique API key
