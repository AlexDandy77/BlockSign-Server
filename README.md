# BlockSign Backend (Node.js + Prisma + PostgreSQL)

Secure, scalable backend for **document notarization** and **auth**.  
Tech stack: **Node.js (TypeScript)**, **Express**, **Prisma ORM**, **PostgreSQL**, **JWT** (access + refresh), **Argon2**, **Zod**, **Helmet**, **CORS**, **Rate limiting**, **Pino logging**.

> This README covers: setup, environment, run scripts, Docker, Prisma, and current API (Auth). It also includes fixes for common ESM/CJS & JWT pitfalls we encountered during setup.

---

## ✨ Features (MVP)
- Email/password registration with **Argon2id** hashing
- Login → **JWT access** (short-lived) + **refresh** (HttpOnly cookie)
- Token **rotation** (`/refresh`) and **logout** (refresh revocation)
- Input validation with **Zod**
- Security middleware: **Helmet**, **CORS**, **Rate limiting**
- Structured logging with **pino** / `pino-http`
- **Prisma** database layer with migrations
- Dockerized **PostgreSQL**

> Next milestones: TOTP MFA, Google OAuth2, email verification / reset tokens, Document/Signature/Verification entities, blockchain anchoring.

---

## 🧱 Project Structure

```
src/
  app.ts
  server.ts
  env.ts
  prisma.ts
  routes/
    auth.routes.ts
  middlewares/
    error.ts
    auth.ts
    rateLimit.ts
  schemas/
    auth.schema.ts
  services/
    auth.service.ts
  utils/
    tokens.ts
prisma/
  schema.prisma
docker-compose.yml
tsconfig.json
package.json
```

---

## ✅ Prerequisites
- **Node.js** 18+
- **Docker** (for local Postgres) or a running PostgreSQL 14+ instance
- **npm**

---

## ⚙️ Environment

Create a `.env` in the project root (plain ASCII, no curly quotes!):

```env
# Database (Prisma)
DATABASE_URL="postgresql://app:app@localhost:5433/blocksign?schema=public"

# Auth
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
JWT_SECRET="set-a-secret"

# Server
PORT=4000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> **Tip:** If you ever see `Error: "expiresIn" should be a number of seconds or string representing a timespan`, check for smart quotes in `.env` or undefined env vars.

---

## 🐘 Database (Docker)

Start Postgres locally:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: blocksign
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Run it:

```bash
docker compose up -d
```

---

## 🔧 Install & Migrate

```bash
npm install
npx prisma migrate dev --name init
```

---

## ▶️ Run in Development

### ESM (modern; requires “.js” on your own relative imports)
`package.json` uses `"type": "module"` and `tsconfig` uses `"module": "NodeNext"`.

```bash
# recommended ESM runner
npm i -D tsx
npm run dev
```

Add this script if not present:
```json
"scripts": {
  "dev": "tsx watch ./src/server.ts"
}
```

**Or** with `ts-node` ESM loader:
```json
"scripts": {
  "dev": "node --loader ts-node/esm --no-warnings ./src/server.ts"
}
```

> In ESM you **must** add `.js` to relative imports between your own files at runtime, e.g. `import { env } from './env.js'` (TypeScript maps it to `.ts`).
---

## 🔒 Auth API

Base path: `/api/v1/auth`

### Register
`POST /api/v1/auth/register`  
Body:
```json
{
  "email": "alice@example.com",
  "fullName": "Alice Example",
  "password": "Aa123456",
  "phone": "+37360000000"
}
```
Response `201`:
```json
{
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "fullName": "Alice Example",
    "role": "USER"
  }
}
```

### Login
`POST /api/v1/auth/login`  
Body:
```json
{
  "email": "alice@example.com",
  "password": "Aa123456"
}
```
Response `200`:
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "fullName": "Alice Example",
    "role": "USER"
  }
}
```
- Sets `refresh_token` **HttpOnly** cookie (7 days by default).

### Refresh
`POST /api/v1/auth/refresh`  
- Rotates refresh token (cookie) and returns a new **access token**.

Response `200`:
```json
{ "accessToken": "eyJhbGci..." }
```

### Logout
`POST /api/v1/auth/logout`  
- Revokes the stored refresh token and clears the cookie.  
Response `204`.

---

## 🧪 Quick cURL tests

```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","fullName":"Alice","password":"Aa123456"}'

# Login (save cookies)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"a@b.com","password":"Aa123456"}'

# Refresh (send cookies)
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -b cookies.txt

# Logout
curl -X POST http://localhost:4000/api/v1/auth/logout -b cookies.txt
```

---

## 🛡️ Security Notes

- **Passwords**: Argon2id hashing.
- **JWT**: short-lived access, long-lived refresh (HttpOnly cookie), rotation on refresh.
- **CORS**: set `CORS_ORIGIN` to your frontend origin.
- **Helmet** & **rate limiting** enabled on auth endpoints.
- **Validation**: Zod schemas on inputs.
- **Sessions**: stateless (access token), refresh tokens stored in DB and revocable.

---

## 🧰 Troubleshooting

- **“Must use import to load ES Module”**: you’re running CJS with ESM files. Use ESM loader (`node --loader ts-node/esm` or `tsx`) **or** switch project to CJS (see above).
- **“Cannot find module '../x' in ESM”**: add `.js` to your **own** relative imports in ESM (e.g., `../utils/tokens.js`).
- **`expiresIn` error with `jsonwebtoken`**: ensure `.env` values are plain (`15m`, `7d`) without curly quotes; confirm they’re defined.
- **Prisma `phone` type**: Prisma `String?` = `string | null`. Normalize `undefined` to `null` when writing: `phone: input.phone ?? null`.
- **Restart TS server**: VS Code → Command Palette → *TypeScript: Restart TS Server*.

---

## 📦 Scripts

```bash
npm run dev        # start in dev
npm run build      # compile to dist/
npm start          # run compiled app
npm run prisma:migrate
npm run prisma:studio
```

---

## 📜 License
MIT.

---
