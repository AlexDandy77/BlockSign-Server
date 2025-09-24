# Changelog

All notable changes to this project will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org/).

---
## [1.4.0] - 2025-09-24
### Added
- **Attachments sending** supported:
  - Now the email mechanism can send files to recipients so they can review them.
- **Database** cleanup mechanism:
  - Deletes data as soon as it is no more needed.
- **Username** functionality:
  -  Now user can create a unique username at register process so other users will be able to tag them as participants in documents.
- **Document creation** mechanism:
  - A user can now create a document.
- **Helper script** to sign a payload.

---
## [1.3.0] - 2025-09-17
### Added
- **Refresh token** mechanism:
  - Reads refresh_token cookie and returns new access_token.
- **Logout** mechanism:
  - Deletes cookie.
- **User routes** created:
  -  Created new file (`user.routes.ts`) which for now has `/me` route and returns user information.

### Changed
- **Naming** of some export variables for clarity:
  - Changed to (`requireAuth.ts`) and (`requireAdmin.ts`). Both for User and Admin routes needed (`requireAuth`), which is when client sends a JWT token, but for Admin routes additionally needed (`requireAdmin`), that checks whether the role, encrypted in JWT matches the `ADMIN`.
  - Changed `admin.registration.routes.ts` to `admin.routes.ts`, admin now has additional user routes.

---
## [1.2.2] - 2025-09-15
### Changed
- **Real email messaging** now available and secured:
  -  Changed (`mailer.ts`) to secure: true.

---
## [1.2.1] - 2025-09-14
### Added
- **Mnemonic phrase generation** with same @scure/bip39 library:
  - Key generation (`keygen.mjs`) now generates a mnemonic phrase.
- Separate mnemonic to private key mechanism (`mnemonic-to-priv-key.mjs`):
  - Front-end script that calculates private key for further signature generation.

---

## [1.2.0] - 2025-09-13
### Added
- **Email messaging** with Ethereal:
  - Mail templates and functions to send email (`mailer.ts`) and OTP 6-digit code mechanism (`otp.ts`) which can generate a code, hash it, save it in the db, and verify code.
- Updated **README.md** with:
  - Email sending description process.
- Prisma database schema `prisma/schema.prisma` with:
  - New EmailOtp model and OtpPurpose enum.

### Changed
- Added email-related code to:
  - `registration.routes.ts`  
  - `admin.registration.routes.ts`

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
