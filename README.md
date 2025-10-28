# FranceParts — Deployment & Security Notes

This repository contains the FranceParts web application. Before deploying, do NOT commit secrets into the repository.

Important security checklist:

- Keep all secrets out of the repository. Use your deployment platform's secret storage (Vercel/Netlify/AWS Secrets Manager/etc.) to set the following env vars:
	- SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
	- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
	- COOKIE_SECRET, UPLOAD_SECRET, UPLOAD_TOKEN_SECRET
- Copy `.env.example` to `.env` for local development and fill placeholders. Never commit `.env`.
- The repository now contains `.env.example` with placeholders and a `.gitignore` entry to prevent committing `.env` and build artifacts.

Deployment tip:
- On Vercel/Netlify/GCP/AWS set the environment variables in the project settings. Do not place production keys in the code.

If you want, I can:
- Rebuild the project and regenerate the `dist/` folder locally (I removed the committed `dist/` to avoid leaking built content).
- Add a CI workflow that checks for accidental secrets (simple grep) and fails the build if any are found.

Contact the maintainer for help setting up secure deploy targets.
