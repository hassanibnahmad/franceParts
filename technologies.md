# Project technologies and libraries

This document lists the main technologies, libraries, dev-tools and environment variables used in the FranceParts project.

## Overview
- Frontend: React (TypeScript) + Vite
- Styling: Tailwind CSS + PostCSS + Autoprefixer
- Icons: lucide-react
- Animations: framer-motion, AOS
- Backend: Express (embedded server `server.cjs`) using Node.js
- Database / Auth: Supabase (via `@supabase/supabase-js`)
- Email sending: nodemailer over SMTP (server reads SMTP_* env vars)
- Password hashing: bcryptjs

## Dependencies (from package.json)
- @supabase/supabase-js ^2.75.0 — Supabase client for DB/auth interactions
- @types/react-router-dom ^5.3.3 — types for react-router-dom (project uses react-router-dom)
- aos ^2.3.4 — scroll/animation on scroll library
- bcryptjs ^2.4.3 — password hashing/verifying on server
- body-parser ^2.2.0 — Express middleware for request bodies
- dotenv ^17.2.3 — load .env files for server
- express ^5.1.0 — small API server for admin endpoints
- framer-motion ^12.23.24 — animations for UI
- lucide-react ^0.545.0 — icon components used in UI
- node-fetch ^3.3.2 — fetch on Node (server side)
- nodemailer ^6.9.3 — sending transactional emails via SMTP
- react ^19.1.1 — UI library
- react-dom ^19.1.1 — DOM renderer
- react-router-dom ^7.9.4 — routing

## Dev dependencies
- @eslint/js ^9.36.0
- @types/node ^24.6.0
- @types/react ^19.1.16
- @types/react-dom ^19.1.9
- @vitejs/plugin-react ^5.0.4
- autoprefixer ^10.4.21
- concurrently ^8.2.0 (used to run server + vite in dev)
- eslint ^9.36.0
- eslint-plugin-react-hooks ^5.2.0
- eslint-plugin-react-refresh ^0.4.22
- globals ^16.4.0
- postcss ^8.5.6
- tailwindcss ^3.4.18
- typescript ~5.9.3
- typescript-eslint ^8.45.0
- vite ^7.1.7

## Where key libraries are used
- Supabase: `src/lib/supabase.ts`, `src/lib/supabaseClient.ts`, server-side queries in `server.cjs` for admin lookups and updates.
- nodemailer + SMTP: `server.cjs` constructs email HTML for password resets and sends via nodemailer when SMTP env vars are present.
- bcryptjs: `server.cjs` uses it to compare password hashes (admin login/change-password flows).
- lucide-react: icons used across `src/pages/*` and `src/components/*` (e.g., `Admin.tsx` header and buttons).
- Tailwind CSS: global styles (`index.css`, `tailwind.config.cjs`) and utility classes across components.
- Vite: development server and build tool (scripts in `package.json`).

## Environment variables (important)
The server expects the following environment variables for email and other behavior (see `server.cjs`):
- SMTP_HOST — SMTP server host (required for sending emails via nodemailer)
- SMTP_PORT — SMTP server port (465, 587, etc.)
- SMTP_USER — SMTP auth username
- SMTP_PASS — SMTP auth password
- SMTP_FROM — optional override for "from" address
- SUPPORT_EMAIL — support contact used in email footer
- DEV_SITE_ORIGIN — used to construct reset links in dev (fallback: `http://localhost:5173`)

Supabase environment / keys (typical names used elsewhere):
- SUPABASE_URL (or similar) — project URL
- SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY — server & client keys (ensure service role is kept server-side only)

Security notes:
- Nodemailer is used with SMTP env vars; you can configure any SMTP provider (Gmail App Password, SendGrid SMTP, Mailgun SMTP, SES SMTP) by setting the SMTP_* envs. There is no provider hard-coded.
- Avoid committing `.env` with secrets. Use deployment platform secret storage.

## Optional provider switch
If you'd like to move from SMTP to a provider SDK (SendGrid / AWS SES / Mailgun client), I can update `server.cjs` to use that provider's API (requires adding the provider SDK and env vars). Using provider APIs (SendGrid, SES) often improves deliverability and gives quota/analytics.

## Quick reference
- Main frontend entry: `src/main.tsx`, pages in `src/pages/` (Admin.tsx, AdminReset.tsx, etc.)
- Server: `server.cjs` — admin endpoints, reset-email generation, nodemailer usage

---
If you want, I can:
- add example `.env.example` entries for SendGrid / Mailgun / SES + how to configure them here, or
- switch email sending code to a provider SDK (pick one) and update `package.json` accordingly.

(Completed: created `technologies.md` at project root.)