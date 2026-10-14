# 🚀 Aegis — Vercel Production Deployment Guide

> **Target Platform:** [Vercel](https://vercel.com)  
> **Application:** Aegis Digital Risk Protection (React 18 + Vite + Python FastAPI)  
> **Status:** Production-Ready (`Aegisshield_Production/`)

---

## 📌 Architecture on Vercel

Aegis is built with a decoupled architecture that is 100% cloud-ready:
- **Frontend**: High-performance React 18 SPA bundled with Vite, styled with vanilla CSS and responsive dark cyber theme.
- **Backend**: FastAPI REST engine with XGBoost machine learning, RapidFuzz token matching, and Tree-SHAP explainability.
- **Database**: Dual-mode engine supporting embedded zero-config `aegis.db` (auto-mirrored to `/tmp/aegis.db` on serverless) or Supabase / Neon PostgreSQL via `DATABASE_URL`.

You can deploy Aegis on Vercel in either of **two seamless ways**:

---

## ⚡ Option 1: Unified Fullstack Deployment (Recommended)

Deploy the entire project as a single Vercel service where the frontend and backend live under the same domain (`https://your-aegis.vercel.app`).

### Step-by-Step Instructions:

1. **Push to GitHub**:
   Push the `Aegisshield_Production` repository to your GitHub account:
   ```bash
   cd Aegisshield_Production
   git init
   git add .
   git commit -m "feat: Aegis production release v1.0.0"
   git remote add origin https://github.com/your-username/aegis-production.git
   git push -u origin main
   ```

2. **Import Project into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository.
   - Project Name: `aegis`

3. **Configure Project Settings**:
   The included [vercel.json](./vercel.json) at the root automatically configures the build:
   - **Framework Preset**: `Other`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `pip install -r requirements.txt`

4. **Add Environment Variables**:
   In Vercel Dashboard → **Settings** → **Environment Variables**, configure:

   | Variable | Value | Purpose |
   | :--- | :--- | :--- |
   | `ENVIRONMENT` | `production` | Enables production mode |
   | `VITE_SUPABASE_PROJECT_REF` | `qqmpnhrcxshkxggqjjrq` | Supabase auth integration |
   | `VITE_SUPABASE_URL` | `https://qqmpnhrcxshkxggqjjrq.supabase.co` | Supabase API endpoint |
   | `VITE_SUPABASE_ANON_KEY` | *(your anon JWT key)* | Supabase client authentication |
   | `DATABASE_URL` | *(optional Postgres URL)* | If using Supabase Postgres (defaults to `aegis.db`) |
   | `ABUSEIPDB_API_KEY` | *(optional)* | Live IP reputation corroboration |
   | `GOOGLE_SAFE_BROWSING_API_KEY` | *(optional)* | Live malicious URL checking |
   | `VIRUSTOTAL_API_KEY` | *(optional)* | Multi-engine antivirus scanning |

5. **Deploy**:
   Click **Deploy**. Vercel will:
   - Compile the React frontend into static assets in `frontend/dist`.
   - Provision `api/index.py` as an AWS Lambda Serverless Function powered by `@vercel/python`.
   - Map `/api/(.*)` to FastAPI and all other routes to React SPA.

---

## 🌐 Option 2: Separate Deployments (Frontend on Vercel + Standalone Backend)

If you prefer hosting the FastAPI backend on a dedicated container service (like Render, Railway, Fly.io, or AWS ECS) while keeping the frontend on Vercel's global CDN:

### Part A: Deploy Frontend on Vercel
1. In Vercel, set **Root Directory** to `frontend`.
2. **Framework Preset**: `Vite`.
3. In **Environment Variables**, set:
   ```env
   VITE_API_BASE=https://your-backend-url.onrender.com
   VITE_SUPABASE_PROJECT_REF=qqmpnhrcxshkxggqjjrq
   VITE_SUPABASE_URL=https://qqmpnhrcxshkxggqjjrq.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Deploy! The included [frontend/vercel.json](./frontend/vercel.json) guarantees that SPA routes (`/app`, `/app/analyzer`, `/app/account`, `/login`) do not 404 when refreshed in the browser.

### Part B: Deploy Backend
1. **On Vercel**: Set root directory to `backend`, deploy using [backend/vercel.json](./backend/vercel.json).
2. **On Render / Railway**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 🗄️ Database Handling on Vercel Serverless

Vercel Serverless Functions operate on a read-only filesystem, with `/tmp` being the only writable directory.

Aegis solves this natively in [backend/db/session.py](./backend/db/session.py):
1. **Zero-Config SQLite**: When running on Vercel (`VERCEL=1`), the pre-seeded `aegis.db` is automatically mirrored into `/tmp/aegis.db`. Writes, investigations, and verdicts work seamlessly during runtime.
2. **Enterprise Postgres**: If you provide a Supabase or Neon connection string via `DATABASE_URL`, Aegis automatically switches to remote PostgreSQL with connection pooling.

---

## 🔍 Post-Deployment Verification Checklist

Once deployed, run these 4 checks on your production URL:

1. **Backend Health Check**:
   Visit `https://your-domain.vercel.app/health` → should return:
   ```json
   {"status": "ok", "platform": "Aegis", "version": "1.0.0"}
   ```

2. **Swagger API Docs**:
   Visit `https://your-domain.vercel.app/docs` → interactive FastAPI OpenAPI specification.

3. **Frontend Application**:
   Visit `https://your-domain.vercel.app/` → Aegis cyber defense command center.

4. **Account & Persona Workspace**:
   Navigate to `/app/account` → verify profile details, theme switcher, and session indicators.

5. **Exclusion Gate Test**:
   Submit `@apexbank` in the Threat Analyzer → verify instant **Tier 0 (0% False Positive)** result.
