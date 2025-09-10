# Changelog

All notable changes to this project will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2025-09-10
### Added
- **Passwordless authentication** with Ed25519 key pairs:
  - Key generation (`keygen.mjs`) and signing (`sign.mjs`) scripts.
  - Challenge–response login mechanism using signatures instead of passwords.
  - Database schema updates: removed `passwordHash`, added `publicKeyEd25519`.
  - Admin approval workflow for new user registrations.
- Updated **README.md** with full setup flow:
  - Generating key pairs.
  - Seeding the database with an initial admin account.
  - Adding admin’s public key.
  - Registering a new user and completing registration with keys.
  - Login process with challenge and signature.
- Example `curl` requests for user registration and login.

### Changed
- Simplified route structure:
  - `auth.routes.ts`  
  - `registration.routes.ts`  
  - `admin.registration.routes.ts`
- Prisma schema: added relations for `User` ↔ `RefreshToken`, `Document`, `DocumentParticipant`, and `Signature`.

### Fixed
- JWT token signing with proper `expiresIn` string values (`"15m"`, `"7d"`).
- `tsconfig.json` adjusted for ESM (`"module": "NodeNext"` and `"verbatimModuleSyntax": false`).

---

## [1.0.0] - 2025-09-08
### Added
- Initial backend project setup with **Node.js (TypeScript)**, **Express**, and **Prisma ORM**.
- PostgreSQL integration with Docker Compose configuration.
- **User authentication**:
  - Registration with Argon2 password hashing.
  - Login with JWT (access + refresh tokens).
  - Refresh token rotation and logout functionality.
- Input validation using **Zod** schemas.
- Security middleware: **Helmet**, **CORS**, and **rate limiting**.
- Logging with **pino** and **pino-http**.
- Project documentation: `README.md` and this `CHANGELOG.md`.

### Fixed
- Environment variable parsing for JWT TTLs (`JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`) to avoid curly quote issues.
- Prisma `phone` field handling (`string | null`) to normalize `undefined` values.

---

## [Unreleased]
- Multi-factor authentication (MFA) support.
- OAuth2 (Google login).
- Document notarization features (upload, sign, verify).
- Blockchain integration for storing document hashes.
- Admin dashboard and monitoring tools.
