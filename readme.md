# Internal Orders App

SSL Access Parts — internal order tracking for salesmen and admin.

## Features

| Area | Capability |
|------|------------|
| Orders | Create / edit / soft-delete / permanent delete |
| Items | Multi-line items, AutoCount stock autocomplete |
| Totals | Live New Order total, card totals, `totalAmount` on order |
| Attachments | Multi-image upload → Firebase Storage |
| Status | Pending, Ordered, Follow Up, Pending Payment, Completed, **Cancelled** |
| Audit | Required reason on archive / cancel / permanent delete |
| Print | A4 print view from active & history |
| UX | Dark mode, toast feedback, search by amount |
| Hosting | Firebase Hosting + Realtime Database + Storage |

## Pages

- `index.html` — role landing
- `salesman.html` — New Order / Active / History
- `admin.html` — Active / History + status & remarks

## Architecture

```
AutoCount SQL Server (AED_SSL)  ←── Express API  (C:\API BACKUP, PORT 3001)
                                         │  GET /api/stock-items?q=
                                         │  GET /api/customers?q=
                                         │  (CORS enabled)
                    ┌────────────────────┘
                    │
         Cloudflare Pages (this UI: public/)
                    │  optional: Pages Function /api/* proxy
                    │            ORIGIN_API_BASE → Express
                    ▼
         Firebase RTDB (orders only) + Storage (attachments)
```

**Important:** Cloudflare Workers/Pages **cannot** connect to SQL Server on your office PC.
Keep the Express API (`C:\API BACKUP`) running where it can reach SQL Server, then expose it
via public URL / Cloudflare Tunnel. The frontend only needs the API base URL.

### Configure API base URL

Edit `public/config.js` or in browser console:

```js
localStorage.setItem('io-api-base', 'http://localhost:3001')
// or tunnel / production:
// localStorage.setItem('io-api-base', 'https://your-tunnel.trycloudflare.com')
// same-origin proxy on CF Pages (functions/api):
// localStorage.setItem('io-api-base', '')  // then set config apiBase carefully
location.reload()
```

Default is `http://localhost:3001` (matches your `.env` PORT).

### Cloudflare Pages deploy

```powershell
cd C:\Users\USER\internal-order-demo
npx wrangler pages deploy public --project-name=internal-orders
```

Set Pages env var **`ORIGIN_API_BASE`** = your Express public URL so `/api/*` is proxied.

### Express API (must run for stock/customer search)

```powershell
cd "C:\API BACKUP"
# .env has DB_* and PORT=3001
npm start
# Test: http://localhost:3001/api/health
# Test: http://localhost:3001/api/stock-items?q=lock
# Test: http://localhost:3001/api/customers?q=ssl
```

## Deploy frontend

```powershell
cd C:\Users\USER\internal-order-demo
.\deploy-public.ps1
# or: firebase deploy --only hosting
```

## Firebase Storage rules (required for attachments)

In Firebase Console → Storage → Rules, for a **private demo** you may temporarily use:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /order-attachments/{orderId}/{fileName} {
      allow read, write: if request.resource == null
        || request.resource.size < 5 * 1024 * 1024
           && request.resource.contentType.matches('image/.*');
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

For production, lock down with Firebase Auth.

## AutoCount stock sync

See [sync-agent/README.md](sync-agent/README.md). Mock:

```powershell
cd sync-agent
# .env with AUTOCOUNT_MOCK=1 + service account
npm run sync
```

## Order shape (key fields)

```json
{
  "company": "...",
  "orderItems": [{ "itemCode": "X", "itemDesc": "...", "units": 2, "price": "RM 10.00" }],
  "totalAmount": 20,
  "attachments": [{ "id": "...", "name": "a.jpg", "url": "https://...", "path": "order-attachments/..." }],
  "status": "Pending",
  "deleted": false,
  "deleteReason": "...",
  "cancelledReason": "...",
  "isUrgent": false
}
```

## Manual test checklist

1. **Live total** — add/edit/remove items on New Order; total bar updates (`RM 1,234.56` style).
2. **Submit toast** — submit → success toast → Active tab.
3. **Attachments** — add ≤5 images, remove one, submit; open order → thumbs.
4. **Dark mode** — header toggle; persists after reload.
5. **Card total** — order cards show amount on the right.
6. **Cancelled** — Admin status → Cancelled → must enter reason.
7. **Delete** — Archive requires reason; History shows reason.
8. **Print** — Print button → A4 layout with items + total.
9. **Search amount** — search `120` or part of total finds matching orders.
10. **Stock autocomplete** — still works if `stockItems` synced.
11. **Regression** — urgent sound on admin; completed cannot soft-delete.

## Out of scope

Firebase Auth roles, PDF library, AutoCount write-back, Cloud Functions.
