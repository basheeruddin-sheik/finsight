# Auth0 setup (Finsight)

The app now requires login (Auth0) and scopes all data to the signed-in user.
Do the one-time Auth0 dashboard setup below, fill the env vars, restart, and
log in. Your existing data is automatically transferred to your account the
first time you sign in.

## 1. Create the Auth0 resources (dashboard, ~10 min)

Create a free Auth0 account, then in the dashboard:

### a) API (the backend resource server)
- **Applications → APIs → Create API**
- Name: `Finsight API`
- **Identifier (audience):** `https://finsight-api` (any URL-like string; it does
  not need to resolve). Copy this — it's your `AUTH0_AUDIENCE` / `VITE_AUTH0_AUDIENCE`.
- Signing algorithm: **RS256** (default).

### b) Application (the frontend SPA)
- **Applications → Applications → Create Application**
- Type: **Single Page Web Applications**
- From its **Settings**, copy **Domain** and **Client ID**.
- Set these (add your phone/LAN/tunnel URLs too, comma-separated):
  - **Allowed Callback URLs:** `http://localhost:5173, http://192.168.1.5:5173`
  - **Allowed Logout URLs:** `http://localhost:5173, http://192.168.1.5:5173`
  - **Allowed Web Origins:** `http://localhost:5173, http://192.168.1.5:5173`
- **Refresh Token Rotation:** Settings → enable **Allow Refresh Token Rotation**
  (and Refresh Tokens) — keeps the installed PWA logged in smoothly.

### c) Login method (email + password)
- **Authentication → Database** → ensure `Username-Password-Authentication` is
  enabled for the application. (Disable social connections if you don't want them.)
- Create your user under **User Management → Users → Create User**, or use the
  **Sign up** link on the login page.

## 2. Fill the env vars

**`server/.env`**
```
AUTH0_DOMAIN=your-tenant.us.auth0.com      # no https://
AUTH0_AUDIENCE=https://finsight-api        # the API Identifier from step 1a
```

**`frontend/.env.local`**
```
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=<SPA Client ID from step 1b>
VITE_AUTH0_AUDIENCE=https://finsight-api
```

> The values must match: the SPA requests a token for `VITE_AUTH0_AUDIENCE`, and
> the API validates exactly that `AUTH0_AUDIENCE`.

## 3. Run

```
./start.sh
```
Open the app → you'll be redirected to Auth0 to log in → back to Finsight.
On your **first** login, all pre-existing (pre-auth) data is claimed by your
account. New users who sign up later start with a fresh default setup and only
see their own data.

## How it works (for reference)

- **Frontend:** `Auth0Provider` (refresh-token rotation) gates every route via
  `RequireAuth`; an axios interceptor attaches the access token to each request.
- **Backend:** a global guard validates the Auth0 RS256 token (issuer + audience).
  A Mongoose tenant plugin + request context auto-scopes **every** query/insert
  to the user's id (`sub`) and **fails closed** if there's no user — so data can't
  leak across users. Transactions, people, types, categories, budgets and splits
  are all per-user.
- **First-run:** `OnboardingService` seeds a new user's default types/categories,
  or (for the very first user) transfers all legacy data to them.

## Notes / limits

- The API now **requires** a token — you can't `curl` it without `Authorization:
  Bearer <token>`. To test from the CLI, grab a token from the browser
  (Application tab → Local Storage → the Auth0 cache) or use Auth0's API test tab.
- Mongo index change: on first boot the server rebuilds indexes so uniqueness is
  per-user (e.g. two users can both have an `EXPENSE` type). This is automatic.
- The old Google Apps Script API mode is effectively retired — Auth0 tokens
  target the NestJS backend.
