# AI-LoanGuard — Explainable ML Loan Eligibility System

An explainable machine-learning credit decision support system for Indian banking. It combines a
rule-based ML scoring engine with SHAP explanations, a human-override audit trail, fairness metrics,
and role-based portals for clients, loan officers, and branch managers.

**Stack:** React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Express 4 · Google Gemini (`@google/genai`) · Firebase Auth/Firestore (optional)

## Features

- Client portal: loan application, eligibility calculator, document upload, application tracking
- Loan officer portal: verification queue, document checks, DTI/LTV review, forward to manager
- Manager portal: underwriting workbench, SHAP waterfall explanations, override audit trail, analytics
- Server-side REST API with role-based status transition validation and audit logging
- Gemini-powered chatbot with a built-in offline fallback when no API key is configured

## Local development

Prerequisites: Node.js 20+ (Node 22 LTS recommended).

```bash
npm install
cp .env.example .env      # optional: add GEMINI_API_KEY
npm run dev               # http://localhost:3000
```

The Express server mounts Vite in middleware mode, so the frontend and API run on one port.

### Demo sign-in

The app seeds sample applications from `src/utils/sampleData.ts`. Sign in with the email/password
form using any email and password:

- Role: **Client**, **Loan Officer**, or **Bank Manager**
- Branch code for Manager/Officer: `111222`

New accounts and applications are stored in `data/portal_db.json` at runtime.

## Production build

```bash
npm install
npm run build             # Vite build -> dist/
NODE_ENV=production npm start
```

`server.ts` serves `dist/` and the REST API on `PORT` (default 3000).

## Deploy on Render

### Option A — Blueprint (recommended)

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint**, select the repository, and apply `render.yaml`.
3. Add `GEMINI_API_KEY` when prompted (optional, but required for live AI chat).
4. The service builds with `npm install && npm run build` and starts with `npm start`; the health
   check is `/api/health`.

### Option B — Manual Web Service

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Environment | `NODE_ENV=production`, `GEMINI_API_KEY=<your key>` (optional) |

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | Yes on Render | Set to `production` so the server serves the built frontend |
| `PORT` | Set by Render | Server port (falls back to 3000) |
| `GEMINI_API_KEY` | No | Enables live Gemini chat; without it the chatbot returns built-in guidance |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `DATA_DIR` | No | Directory for `portal_db.json`; use with a Render persistent disk |

### Data persistence

On Render's free plan the filesystem is ephemeral, so registered users and new applications reset
whenever the service restarts or redeploys (browser-side sessions remain). For durable storage,
attach a Render disk and set `DATA_DIR` to its mount path, or point the app at a managed database.

### Google sign-in

Google sign-in uses the Firebase web app in `firebase-applet-config.json`. The deployed domain must
be listed under **Firebase Console → Authentication → Settings → Authorized domains** (for example
`your-service.onrender.com`). Email/password sign-in works without this.

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Register a portal user |
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/google` | Verify Google/Firebase ID token |
| `GET` | `/api/applications` | List applications (role-filtered) |
| `POST` | `/api/applications` | Submit a loan application |
| `PATCH` | `/api/applications/:id/status` | Update application status |
| `GET` | `/api/applications/:id/documents` | Fetch application documents |
| `POST` | `/api/applications/:id/documents` | Upload a document |
| `PATCH` | `/api/applications/:id/documents/:docId/status` | Verify/reject a document |
| `GET` | `/api/audit-logs` | Audit trail |
| `POST` | `/api/chat` | Gemini chatbot |

## Security notes

This project is an academic/demo system. Portal roles and branch codes are enforced by the API and
UI, but the email/password flow auto-provisions accounts and is not production-grade authentication.
Before handling real banking data, replace it with a managed identity provider, add server-side
session tokens, store secrets outside the repository, and move the JSON database to a managed store.
