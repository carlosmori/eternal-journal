# Eternal Journal API

NestJS backend for the Eternal Journal hybrid app. Provides Web2 authentication (Google OAuth + JWT) and journal storage for users who sign in with Google.

---

## Overview

Eternal Journal is a hybrid Web2/Web3 application with three persistence tiers:

| Tier      | Auth                | Storage                   | API Usage     |
| --------- | ------------------- | ------------------------- | ------------- |
| **Guest** | None                | `localStorage` (browser)  | No API calls  |
| **Web2**  | Google OAuth + JWT  | NestJS API (in-memory)    | Full REST API |
| **Web3**  | Wallet (RainbowKit) | Blockchain (Base Sepolia) | No API calls  |

**This backend serves only the Web2 tier.** Guest and Web3 modes are handled entirely on the frontend (localStorage and smart contract respectively).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Eternal Journal Frontend                      │
│                         (Next.js)                                 │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ Guest              │ Web2               │ Web3
         │ (no API)           │ (this API)         │ (blockchain)
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ localStorage │    │   NestJS API      │    │  Base Sepolia     │
│              │    │   (this service)  │    │  Smart Contract   │
└──────────────┘    └──────────────────┘    └──────────────────┘
```

### Data Flow (Web2)

1. User clicks "Sign in with Google" → redirects to `GET /auth/google`
2. Google OAuth flow → callback at `GET /auth/google/callback`
3. API issues JWT (access + refresh) → redirects to frontend with tokens in URL
4. Frontend stores tokens, calls `GET /auth/me` to validate
5. Journal CRUD: `GET /journal`, `POST /journal`, `DELETE /journal/:id` with `Authorization: Bearer <token>`

---

## Tech Stack

| Category      | Technology                         |
| ------------- | ---------------------------------- |
| **Runtime**   | Node.js                            |
| **Framework** | NestJS 11                          |
| **Language**  | TypeScript 5                       |
| **Auth**      | Passport.js, Google OAuth 2.0, JWT |
| **Config**    | @nestjs/config (env vars)          |

### Dependencies

- `@nestjs/passport` — Passport integration
- `passport-google-oauth20` — Google OAuth strategy
- `passport-jwt` — JWT validation strategy
- `@nestjs/jwt` — JWT signing and verification

---

## Project Structure

```
apps/api/
├── src/
│   ├── main.ts                 # Bootstrap, CORS
│   ├── app.module.ts           # Root module
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts  # /auth/* routes
│   │   ├── auth.service.ts    # User store, token generation
│   │   ├── guards/
│   │   │   ├── google-auth.guard.ts
│   │   │   └── jwt-auth.guard.ts
│   │   └── strategies/
│   │       ├── google.strategy.ts
│   │       └── jwt.strategy.ts
│   └── journal/
│       ├── journal.module.ts
│       ├── journal.controller.ts  # /journal/* routes (JWT-protected)
│       └── journal.service.ts     # In-memory per-user storage
├── .env
├── .env.example
└── package.json
```

---

## Auth Module

### Google OAuth Flow

1. **`GET /auth/google`** — Initiates OAuth. Redirects user to Google consent screen.
2. **`GET /auth/google/callback`** — Google redirects here after consent. API:
   - Receives user profile (id, email, name, picture)
   - Finds or creates user in memory (keyed by `googleId`)
   - Generates `accessToken` (1h) and `refreshToken` (7d)
   - Redirects to `{FRONTEND_URL}/auth/callback?accessToken=...&refreshToken=...`

### JWT Endpoints

| Method | Route           | Auth       | Description                                                             |
| ------ | --------------- | ---------- | ----------------------------------------------------------------------- |
| GET    | `/auth/me`      | Bearer JWT | Returns current user (`userId`, `email`, `name`)                        |
| POST   | `/auth/refresh` | —          | Body: `{ refreshToken }`. Returns new `accessToken` and `refreshToken`. |

### User Storage

Users are stored in memory (`Map<googleId, StoredUser>`). No database yet. On server restart, all users and sessions are lost. This is intentional for the current MVP; a database will be added later.

---

## Journal Module

All journal endpoints require a valid JWT in the `Authorization` header.

### Endpoints

| Method | Route          | Description                                              |
| ------ | -------------- | -------------------------------------------------------- |
| GET    | `/journal`     | List all entries for the authenticated user              |
| POST   | `/journal`     | Create a new entry. Body: `{ date, title, description }` |
| DELETE | `/journal/:id` | Delete an entry by ID                                    |

### Entry Shape

```json
{
  "id": 1234567890,
  "date": "2025-02-16",
  "title": "My thought",
  "description": "The content of the entry.",
  "timestamp": 1739721600
}
```

### Storage

Entries are stored in memory: `Map<userId, JournalEntry[]>`. Each user's entries are isolated. No database; data is lost on restart. Database persistence is planned for a future iteration.

---

## Guest Mode (Context)

Guest mode does **not** use this API. Entries are stored in the browser's `localStorage` under the key `eternal-journal-guest-entries`. The frontend warns users that data is device-only and encourages sign-in for persistence.

---

## Environment Variables

Create `.env` from `.env.example`:

| Variable               | Description                                 | Example                                                        |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                      | From [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                  | From Google Cloud Console                                      |
| `JWT_SECRET`           | Secret for signing JWTs                     | Strong random string                                           |
| `API_URL`              | Public URL of this API (for OAuth callback) | `http://localhost:3001`                                        |
| `FRONTEND_URL`         | Frontend URL (OAuth redirect target)        | `http://localhost:3000`                                        |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **Google+ API** / **Google Identity**
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `{API_URL}/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

---

## Run

```bash
# From repo root
npm run dev:api

# Or from apps/api
npm run dev
```

API runs at **http://localhost:3001**.

---

## CORS

CORS is configured to allow requests from `FRONTEND_URL` (default `http://localhost:3000`) with credentials. Update for production.

---

## Future Work

- [ ] Database (e.g. PostgreSQL) for users and journal entries
- [ ] Optional: httpOnly cookies instead of tokens in URL
- [ ] Rate limiting
- [ ] Input validation (class-validator)
