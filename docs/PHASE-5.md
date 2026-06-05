# Phase 5 — Google Apps Script + Vercel

> Remove the laptop dependency entirely. Data lives in Google Sheets,
> all logic runs in Google Apps Script, the UI is hosted on Vercel.
> Open the app from your iPhone from anywhere in the world.

---

## Architecture

```
iPhone / any browser
        │
        ▼
  Vercel CDN (React app — free, global)
        │
        ▼
  Google Apps Script Web App (your logic — free, runs as you)
        │
        ▼
  Google Spreadsheet (your data — always in Drive)
```

---

## Step-by-Step Setup

### Step 1 — Create the Google Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**
2. Name it **"Finsight"**
3. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**[THIS_PART]**/edit`
4. Keep this tab open — you'll run the setup script here

> The script will auto-create all 6 sheet tabs with the right headers.
> You don't need to create them manually.

---

### Step 2 — Open Apps Script Editor

1. In the spreadsheet, click **Extensions → Apps Script**
2. Delete all existing code in `Code.gs`
3. Open `docs/Code.gs` from this repo
4. Paste the entire contents into the editor
5. Click **Save** (Ctrl+S / Cmd+S)

---

### Step 3 — Run the Sheet Setup

1. In the Apps Script editor, select function **`setupSheets`** from the dropdown
2. Click **▶ Run**
3. Allow the permissions popup (it needs access to your spreadsheet)
4. You should see 6 new sheet tabs appear in the spreadsheet:
   - `Transactions` `Persons` `Borrows` `BorrowPayments` `SplitBalances` `Budgets`

---

### Step 4 — Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙ next to "Type" → select **Web app**
3. Set:
   - **Description**: Finsight API
   - **Execute as**: Me (your Google account)
   - **Who has access**: Anyone
4. Click **Deploy**
5. Copy the **Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfycbx.../exec`

> **Security note:** The URL is a long unguessable string. Anyone who has this URL
> can read/write your data. Keep it private. For a personal-only app this is fine.

---

### Step 5 — Test the Apps Script URL

Open this in your browser (replace with your URL):
```
https://script.google.com/macros/s/YOUR_ID/exec?path=persons
```
You should see: `[]` (empty array — no persons yet). That confirms the API is live.

---

### Step 6 — Update the Frontend

Create `frontend/.env.local` (this file stays on your machine, never committed):
```env
VITE_API_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

Run the frontend locally to test against Apps Script:
```bash
cd frontend && npm run dev
```

Open the app, add a person, add a transaction — verify data appears in the Google Sheet.

---

### Step 7 — Deploy Frontend to Vercel

1. Push the code to GitHub (if not already)
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Set:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:
   - **Name**: `VITE_API_URL`
   - **Value**: your Apps Script URL
5. Click **Deploy**
6. Vercel gives you a URL like `https://finsight-abc.vercel.app`

---

### Step 8 — Install on iPhone

1. Open the Vercel URL in Safari on your iPhone
2. Tap Share → **Add to Home Screen**
3. Name it "Finsight" → Add
4. Open from home screen — it runs as a PWA (full screen, no browser bar)

---

## Spreadsheet Structure

Each entity is a sheet tab with these columns:

### Transactions
| ID | Type | Amount | Date | Category | PaymentMethod | PersonId | Note | CreatedAt |

### Persons
| ID | Name | Type | Phone | CreatedAt |

### Borrows
| ID | PersonId | Principal | InterestRate | StartDate | Status | CreatedAt |

### BorrowPayments
| ID | BorrowId | Amount | Date | Note |

### SplitBalances
| ID | PersonId | Balance | Source | LastSyncedAt |

### Budgets
| ID | Category | MonthlyLimit | Month |

---

## How the API Client Routes Calls

The frontend `client.ts` auto-detects if `VITE_API_URL` is an Apps Script URL
and translates REST calls transparently:

| Axios call (code)                        | What gets sent to GAS                                 |
|------------------------------------------|-------------------------------------------------------|
| `GET /transactions?type=EXPENSE`         | `GET ?path=transactions&type=EXPENSE`                 |
| `GET /transactions/summary?month=2026-06`| `GET ?path=transactions%2Fsummary&month=2026-06`      |
| `POST /transactions` + body              | `POST ?path=transactions` + body                      |
| `PUT /transactions/1` + body             | `POST ?path=transactions&id=1&method=PUT` + body      |
| `DELETE /transactions/1`                 | `POST ?path=transactions&id=1&method=DELETE`          |
| `POST /borrows/1/payment` + body         | `POST ?path=borrows&id=1&action=payment` + body       |
| `PUT /borrows/1/settle`                  | `POST ?path=borrows&id=1&action=settle&method=PUT`    |

No changes needed in any API file — the client handles all translation.

---

## Re-deploying After Code Changes

When you update `Code.gs`:
1. Apps Script editor → **Deploy → Manage deployments**
2. Click the pencil ✏ on your deployment
3. Change **Version** to **New version**
4. Click **Deploy**

When you update the frontend:
- Just `git push` — Vercel auto-deploys on every push

---

## Migrating Existing Data (optional — task 5.10)

If you have data in the local SQLite database that you want in Sheets:
1. Export each table as CSV:
   ```bash
   cd server && npx prisma db pull
   sqlite3 prisma/dev.db ".mode csv" ".output transactions.csv" "SELECT * FROM Transaction;"
   ```
2. Open the Google Sheet → sheet tab → **File → Import → Upload** the CSV
3. Adjust column order to match the sheet headers

---

## Limitations vs NestJS

| Feature            | NestJS (local)      | Apps Script              |
|--------------------|---------------------|--------------------------|
| Response time      | <5ms                | ~300–800ms               |
| Offline writes     | Yes                 | No (needs internet)      |
| Concurrent users   | Depends on server   | 30 requests/minute/user  |
| Splitwise sync     | ✅ (in server)      | ❌ Remove or proxy       |
| Cold start         | None                | ~2s after inactivity     |

For a personal finance app with one user, all limitations are acceptable.
