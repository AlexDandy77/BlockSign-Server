# Changelog

All notable changes to this project will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org/).

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
