# 🛡️ Aegis — Digital Risk Protection Platform
### Autonomous Brand Impersonation, Social & Mobile App Defense

> **ByteXL Hackathon — Challenge 03: Digital Risk Protection (Social & App Monitoring)**  
> **Production Release:** `v1.0.0-production`  
> **Platform Engine:** Hybrid Deterministic Heuristics + XGBoost Machine Learning + Tree-SHAP Explainability  
> **Deployment Target:** Vercel (Frontend & Serverless Backend) / Local Dev

---

## 🌟 Executive Overview

**Aegis** is an enterprise-grade Digital Risk Protection platform built to detect, triage, and counter brand impersonations operating outside the organizational perimeter across social media ecosystems, public domain namespaces, and mobile application marketplaces.

Built strictly against the Challenge 03 evaluation rubric and real-world cybersecurity requirements, Aegis combines:
1. **Brand Digital Twin Ground Truth**: Strict baseline defining legitimate corporate handles, package IDs, publishers, logos, and authorized partner exceptions.
2. **0% False Positive Exclusion Gate**: Mathematical set-membership short-circuit ensuring verified enterprise assets (`@apexbank`, `com.apexbank.mobile`) are never flagged to analysts or users.
3. **Social Media Impersonation Monitoring (30% weight)**: RapidFuzz token matching coupled with an 11-feature behavioral XGBoost classifier (**92.50% accuracy**, **98.36% ROC-AUC**).
4. **Mobile App Store Monitoring (30% weight)**: 4-pillar detection evaluating similar app names, rogue publishers, TF-IDF description plagiarism, 64-bit perceptual logo hashes, and a 215-permission XGBoost malware model (**97.91% accuracy**).
5. **Bonus Look-alike Name Detection (5–10 pts)**: Character swaps (`0`→`o`, `@`→`a`), trust keyword stripping, and punctuation collapse with residual fuzz defense preventing over-flagging on legitimate third parties.
6. **Account & Persona Workspace**: Complete workspace settings panel (`/app/account`) with profile customization, session audits, notification toggles, and Supabase RBAC integration.
7. **Production Gated Navigation**: Clean public landing page showcasing platform capabilities, workflow, and architecture, with console access gated behind authentication or 1-click evaluation access.

---

## 🏗️ System Architecture & Detection Pipeline

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   INCOMING TELEMETRY                                   │
│            Social Profiles · Mobile APKs · Domains · User Query Submissions            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                STAGE 1: BRAND DIGITAL TWIN & EXCLUSION GATE (TIER 0)                   │
│                                                                                        │
│   Candidate Handle ∈ Official Handles? ───────► YES ──► SHORT-CIRCUIT: TIER 0          │
│   Candidate Package ∈ Official App IDs? ──────► YES ──► 0.00% FALSE POSITIVE           │
│   Candidate Handle ∈ Partner Allowlist? ──────► YES ──► IMMUNITY GUARANTEED            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ NO (Non-Official Entity)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 2: DUAL-ENGINE HYBRID DETECTION                           │
│                                                                                        │
│   ┌───────────────────────────────────┐    ┌───────────────────────────────────────┐   │
│   │   DETERMINISTIC HEURISTIC ENGINE  │    │     SUPERVISED ML CLASSIFIERS         │   │
│   │                                   │    │                                       │   │
│   │ • RapidFuzz Token & Levenshtein   │    │ • Social Profile XGBoost (92.50%)     │   │
│   │ • 64-Bit pHash Visual Distance    │    │   (Ratios, Digit counts, Age, Bio)    │   │
│   │ • TF-IDF Cosine Similarity        │    │ • Rogue Mobile APK XGBoost (97.91%)   │   │
│   │ • Leetspeak & Look-alike Swaps    │    │   (215 Dangerous Android Permissions) │   │
│   │ • Deceptive Keyword Stripping     │    │ • Tree-SHAP Feature Attributions      │   │
│   └─────────────────┬─────────────────┘    └───────────────────┬───────────────────┘   │
│                     └───────────────────────┬──────────────────┘                       │
└─────────────────────────────────────────────┼──────────────────────────────────────────┘
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 3: MULTI-FEED THREAT ENRICHMENT                           │
│                                                                                        │
│      AbuseIPDB (IP Reputation)         Google Safe Browsing (Phishing / Malware)       │
│      AlienVault OTX (Threat Pulses)    VirusTotal v3 (Multi-AV Consensus)              │
│      ICANN RDAP (Domain Age & DNS)     Sectigo crt.sh (TLS Certificate Logs)           │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     STAGE 4: TRIAGE, SCORING & SOC DISPATCH                            │
│                                                                                        │
│     Tier 0 (0–29): Clean / Benign Asset (Auto-cleared)                                 │
│     Tier 1 (30–69): Suspicious Similarity (Queued for Analyst Review)                  │
│     Tier 2 (70–100): Confirmed Malicious Impersonation (Instant SOC Escalation)        │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        SQLite / Supabase Postgres                           WebSocket Broadcast
     Detections · Cases · Audit Logs                      Real-Time SOC Alert Stream
```

---

## 📁 Production Directory Structure

```text
Aegisshield_Production/
├── api/
│   └── index.py               # Vercel Serverless Function entry point (ASGI bridge)
├── backend/
│   ├── api/routes/            # FastAPI REST endpoints (analyzer, brands, cases, etc.)
│   ├── data/                  # Reference datasets & baseline assets
│   ├── db/                    # SQLAlchemy models & session manager
│   ├── models/                # Trained XGBoost models (.json) & Tree-SHAP attributions
│   ├── schemas/               # Pydantic v2 validation contracts
│   ├── services/              # Exclusion gate, RapidFuzz, pHash, TF-IDF, live feeds
│   ├── utils/                 # Threat scoring, normalization, and helpers
│   ├── aegis.db               # Pre-seeded SQLite demo database
│   ├── main.py                # FastAPI application entry point
│   ├── requirements.txt       # Backend dependencies
│   ├── vercel.json            # Standalone backend Vercel configuration
│   └── .env.example           # Backend environment variables template
├── frontend/
│   ├── public/                # Static assets and favicons
│   ├── src/
│   │   ├── AccountPage.tsx    # Interactive account & preferences workspace
│   │   ├── account.ts         # Account state, default profiles, storage helpers
│   │   ├── account-theme.css  # Space Grotesk / Inter cyber typography
│   │   ├── account.css        # Account panel layouts, toggles, and modals
│   │   ├── App.tsx            # Main application router and console views
│   │   ├── AuthPage.tsx       # Supabase authentication & 1-click test accounts
│   │   ├── data.ts            # REST API client & live WebSocket subscriber
│   │   ├── supabase.ts        # Supabase JS client and session cache
│   │   ├── index.css          # Cyber-radar design system (#080C0C, #B3F4CE)
│   │   └── main.tsx           # React DOM root entry point
│   ├── index.html             # HTML5 template with SEO & meta tags
│   ├── package.json           # Frontend dependencies & scripts
│   ├── vite.config.ts         # Vite bundler configuration
│   ├── vercel.json            # Standalone frontend Vercel configuration (SPA rewrites)
│   └── .env.example           # Frontend environment variables template
├── .env.example               # Root unified environment variables template
├── .gitignore                 # Production ignore rules
├── requirements.txt           # Root requirements for Vercel Python runtime
├── vercel.json                # Root unified fullstack Vercel deployment config
├── VERCEL_DEPLOYMENT.md       # Step-by-step Vercel deployment runbook
└── README.md                  # This documentation
```

---

## ⚡ Quick Start (Local Run)

### 1. Backend Service
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python main.py
# Server runs on: http://localhost:8000
# OpenAPI Docs:   http://localhost:8000/docs
```

### 2. Frontend Console
```bash
cd frontend
npm install
npm run dev
# Vite runs on: http://localhost:5173
```

---

## ☁️ Vercel Deployment Guide

Aegis is configured for 1-click deployment on [Vercel](https://vercel.com):

### Option A: Unified Monorepo Deployment (Recommended)
1. Push `Aegisshield_Production` to GitHub:
   ```bash
   git init
   git branch -M main
   git remote add origin https://github.com/toonscascade/Sequence_Zero_Aegis.git
   git add .
   git commit -m "feat: Aegis production release"
   git push -u origin main
   ```
2. In Vercel ([vercel.com/new](https://vercel.com/new)), import `Sequence_Zero_Aegis`.
3. The root `vercel.json` automatically builds the React SPA and maps `/api/(.*)` to `api/index.py`.
4. Set Environment Variables in Vercel:
   - `ENVIRONMENT`: `production`
   - `VITE_SUPABASE_PROJECT_REF`: `qqmpnhrcxshkxggqjjrq`
   - `VITE_SUPABASE_URL`: `https://qqmpnhrcxshkxggqjjrq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: *(your Supabase anon key)*
5. Click **Deploy**!

👉 **Detailed multi-option guide with serverless database configurations: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).**

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Healthcheck and operational status |
| `GET` | `/api/brands/active` | Active Brand Digital Twin baseline |
| `POST` | `/api/brands` | Create or update Brand Digital Twin |
| `POST` | `/api/analyze/profile` | Analyze social media profile candidate |
| `POST` | `/api/analyze/app` | Analyze mobile APK / App Store candidate |
| `POST` | `/api/analyze/url` | Analyze URL or domain candidate |
| `GET` | `/api/detections` | Filter and paginate detected threats |
| `GET` | `/api/detections/{id}` | Detailed threat record with SHAP explainability |
| `GET` | `/api/cases` | SOC investigation cases queue |
| `PATCH`| `/api/cases/{id}` | Update case status or assign analyst |
| `GET` | `/api/campaigns` | Graph of correlated threat infrastructure |
| `GET` | `/api/typosquat/{domain}`| Generate and verify typosquat permutations |
| `WS`  | `/ws/feed` | Real-time WebSocket feed of high-severity alerts |

---

## 🔒 Evaluation Compliance Matrix

| Requirement | Implementation | Measured Outcome |
| :--- | :--- | :--- |
| **0% Official False Positives** | Set-membership exclusion gate before any scoring | **0.00% FP** on official handles/APKs |
| **Social Media Impersonation** | RapidFuzz token matching + 11-feature XGBoost | **92.50% Accuracy** (98.36% ROC-AUC) |
| **Mobile App Store Monitoring** | 4-Pillar audit: name, logo pHash, TF-IDF desc, permissions | **97.91% Accuracy** on 3,008 APKs |
| **Look-alike Variations (Bonus)** | Leetspeak tables, trust word stripping, separator collapse | Full reason code audit trail |
| **Explainable AI** | Zero-dependency Tree-SHAP native booster contributions | Real-time top-5 feature attributions |
| **Authentication & RBAC** | Supabase Auth with session persistence & quick-fills | 4 role tiers with audit logging |
| **Account Management** | Workspace settings, custom profile, notification toggles | Accessible at `/app/account` |

---

## 📄 License
Enterprise MIT License — ByteXL Hackathon 2026.
