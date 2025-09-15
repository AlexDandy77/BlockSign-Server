# BlockSign Backend (Node.js + Prisma + PostgreSQL)

Secure, scalable backend for **document notarization** and **auth**.  
Tech stack: **Node.js (TypeScript)**, **Express**, **Prisma ORM**, **PostgreSQL**, **JWT** (access + refresh), **Argon2**, **Zod**, **Helmet**, **CORS**, **Rate limiting**, **Pino logging**.

> This README covers: setup, environment, run scripts, Docker, Prisma, and current API (Auth). It also includes fixes for common ESM/CJS & JWT pitfalls we encountered during setup.

---

## 🧱 Project Structure

```
prisma/
  schema.prisma
  seed.ts
scripts/
  admin-set-key.js
  keygen.mjs
  sign.mjs
  verify.mjs
src/
  crypto/
    ed25519.ts
  email/
    mailer.ts
    otp.ts
  middlewares/
    error.ts
    auth.ts
    rateLimit.ts
    requireAdmin.ts
  routes/
    auth.routes.ts
    registration.routes.ts
    admin.registration.routes.ts
  utils/
    tokens.ts
  app.ts
  env.ts
  prisma.ts
  server.ts
.env
.gitignore
CHANGELOG.md
docker-compose.yml
LICENSE
package-lock.json
package.json
README.md
tsconfig.json
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

# Email 
SMTP_HOST=mail.blocksign.md
SMTP_PORT=<port>
SMTP_USER=<email@address.user>
SMTP_PASS=<password-user>
MAIL_FROM="BlockSign <info@blocksign.md>"
APP_URL=http://localhost:5173
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
npx prisma migrate reset
npx prisma migrate dev --name blocksign
```

---

## 📦 Scripts

```bash
npm run dev        # start in dev
npm run build      # compile to dist/
npm start          # run compiled app
npm run prisma:migrate # migrate db schema
npm run prisma:studio  # start db dashboard
```
---

## Seed the admin user
Seed the admin:
```bash
npm run prisma:seed
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

> In ESM you **must** add `.js` to relative imports between your own files at runtime, e.g. `import { env } from './env.js'` (TypeScript maps it to `.ts`).
---

## 🔑 Initial setup for admin login 

### 1: Generate key pair for admin
```bash
node scripts/keygen.mjs
```

This outputs:
```
MNEMONIC: <tell the user>
PUBLIC_KEY_HEX: <copy for DB>
PRIVATE_KEY_HEX: <for client to generate signature>
```

### 2: Push admin's public key into db
```bash
node scripts/admin-set-key.js <public-key>
```

### 3: Get a challenge
**/1 Start the server**
```bash
npm run dev
```

**/2 Request challenge**
```bash
POST http://localhost:4000/api/v1/auth/challenge
body: {"email": "admin's email"}
```
### 4: Sign it with private key and  obtain signature
```bash
node sign.mjs <PRIVATE_KEY_HEX> "message-to-sign"
```

### 5: Complete login 
```bash
POST http://localhost:4000/api/v1/auth/complete
{
    "email": "admin@blocksign.local",
    "challenge": "challenge",
    "signatureB64": "signature" 
}
```
and get **accessToken** from response body.


### 6: Use this JWT token for access to admin routes
```bash
GET http://localhost:4000/api/v1/admin/registrations
Authorization: Bearer {access-token}
```
---

## 🔒 Auth API

Base path: `/api/v1/`

---

## 👤 User Registration Flow

### 1. User submits registration request
```bash
curl -X POST http://localhost:4000/api/v1/registration/request   -H "Content-Type: application/json"   -d '{"email": "alexisdandy15@gmail.com", "fullName": "Alexei Pavlovschii", "phone": "777777777",
    "idnp": "8888888888888"
}'
```
and gets **requestId** in response body.

### 2. Admin lists pending requests
```bash
curl -X GET http://localhost:4000/api/v1/admin/registration/requests   -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### 3. Admin approves request
```bash
curl -X POST http://localhost:4000/api/v1/admin/registrations/{requestId}/approve   -H "Content-Type: application/json"   -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

User receives an email (simulated, check logs) with a link (**token** in response body at dev stage).

### 4. Client generates a new key pair
The key pair is generated, private key is saved in secure memory and given for the user to save. With private key client signs token.

### 5. User completes registration with public key and token signature
```bash
curl -X POST http://localhost:4000/api/v1/registrations/complete   -H "Content-Type: application/json"   -d '{
    "token":"token",
    "publicKeyEd25519":"<PUBLIC_KEY_HEX>",
    "signatureB64": "<signature-of-the-token>"
  }'
```
This results in successful finish of registering a user. Now he can login via api/v1/auth/challenge.

---

## 🔐 Login Flow (Passwordless)

### 1. Start login: request challenge
```bash
curl -X POST http://localhost:4000/api/v1/auth/challenge   -H "Content-Type: application/json"   -d '{"email":"user1@example.com"}'
```

Response:
```json
{ "challenge": "P78F0gnAdOcc..." }
```

### 2. User signs challenge
```bash
node scripts/sign.mjs P78F0gnAdOcc...
```

Output:
```
SIGNATURE_B64: vC58Hm7npg+QFIZM...
```

### 3. Complete login
```bash
curl -X POST http://localhost:4000/api/v1/auth/complete   -H "Content-Type: application/json"   -d '{
    "email":"user1@example.com",
    "challenge":"P78F0gnAdOcc...",
    "signatureB64":"vC58Hm7npg+QFIZM..."
  }'
```

Response:
```json
{
  "accessToken":"<JWT>",
  "user":{ "id":"...", "email":"user1@example.com", "fullName":"Alice Example", "role":"USER" }
}
```

---
## Real Email Mechanism
Get credentials from your SMTP provider and put them into .env file.

---
## 📜 License
This project is secured under MIT license.
