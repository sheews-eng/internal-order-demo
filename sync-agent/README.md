# AutoCount Stock Sync Agent (optional / legacy)

> **Preferred path now:** the salesman page calls your Express API live  
> (`GET /api/stock-items`, `GET /api/customers` on `C:\API BACKUP`).  
> This sync-agent is only needed if you want an offline Firebase cache of stock.

Pulls stock items from an HTTP API (or mock data) and writes them to Firebase Realtime Database under `stockItems/`.

## Prerequisites

- Node.js 18+
- Firebase project service account JSON with Realtime Database write access
- Network access to AutoCount Integrator (or use mock mode)

## Setup

```powershell
cd sync-agent
copy .env.example .env
# Edit .env — set FIREBASE_DATABASE_URL and GOOGLE_APPLICATION_CREDENTIALS
npm install
```

Place your service account file as `serviceAccount.json` (or set path in `.env`).

### Mock sync (no AutoCount)

```powershell
# In .env: AUTOCOUNT_MOCK=1
npm run sync
```

### Live Integrator

1. Set `AUTOCOUNT_MOCK=0`
2. Set `AUTOCOUNT_BASE_URL` and `AUTOCOUNT_STOCK_PATH` to your stock list endpoint
3. Set API key / Basic auth as needed
4. Adjust `AUTOCOUNT_FIELD_*` if JSON field names differ from `ItemCode`, `Description`, `Price`, `UOM`

```powershell
npm run sync
```

### Continuous loop

```powershell
npm start
```

Runs once immediately, then every `SYNC_INTERVAL_MINUTES` (default 15).

## Windows Task Scheduler

1. Create a task that runs every 15 minutes:
   - Program: `node`
   - Arguments: `C:\path\to\internal-order-demo\sync-agent\src\index.js --once`
   - Start in: `C:\path\to\internal-order-demo\sync-agent`
2. Ensure the task user can read `.env` and `serviceAccount.json`.

## RTDB shape

```
stockItems/{safeItemCode}
  itemCode, itemDesc, price, uom, updatedAt
stockMeta
  lastSyncAt, lastSyncStatus, lastSyncMessage, itemCount
```

## Security

- Never put Integrator API keys or `serviceAccount.json` in `public/`
- Keep `.env` and service account out of git (see root `.gitignore`)
