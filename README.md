# Finsight

A personal finance tracker built as a Progressive Web App (PWA). Track income, expenses, investments, borrows, family transfers, splits, and budgets — all in one place.

## Features

- **Transactions** — income, expenses, investments, family transfers with custom types and categories
- **Borrows** — track money lent and borrowed, partial payments, interest, write-offs
- **Splits** — shared expenses with friends and family
- **Budgets** — monthly budget limits with live tracking
- **Reports** — monthly breakdown, savings rate, category trends
- **Insights** — visual charts for spending patterns and savings
- **PWA** — installable on iPhone and Android, works offline
- **Dark mode** — automatic system theme support
- **Multi-tenancy** — Auth0-based auth, each user's data is fully isolated

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | MongoDB (Atlas) |
| Auth | Auth0 |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

## Project Structure

```
finsight/
├── frontend/        # React + Vite PWA
├── server/          # NestJS REST API
├── docs/            # Setup guides
├── seed.js          # Dev data seeder
└── start.sh         # Local dev launcher
```

## Local Development

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- Auth0 account — see [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)

### Setup

```bash
# Install dependencies
cd frontend && npm install
cd ../server && npm install

# Configure environment
cp frontend/.env.example frontend/.env.local
cp server/.env.example server/.env
# Fill in your Auth0 and MongoDB values in both files
```

### Run

```bash
# Start both frontend and backend together
./start.sh

# Or separately:
cd server   && npm run start:dev   # → http://localhost:3000
cd frontend && npm run dev         # → http://localhost:5173
```

### Seed test data

```bash
TOKEN=<your_auth0_bearer_token> node seed.js
```

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (leave unset in dev to auto-detect) |
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience |

### Backend (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3000) |
| `MONGODB_URI` | MongoDB connection string |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Auth0 API audience |

## Deployment

**Frontend → Vercel**
- Root directory: `frontend`
- Branch: `prod`
- Set all `VITE_*` environment variables in the Vercel dashboard

**Backend → Railway**
- Root directory: `server`
- Branch: `prod`
- Set `MONGODB_URI`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` in the Railway dashboard

See [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md) for Auth0 configuration details.

## Deploying a new version

```bash
git checkout prod
git merge main
git push origin prod
git checkout main
```

Both Vercel and Railway auto-deploy on push to `prod`.
