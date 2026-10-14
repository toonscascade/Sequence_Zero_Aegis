"""
AegisShield Backend — FastAPI Application Entry Point
=====================================================
Multi-signal brand protection and impersonation detection platform.
Hosts identity evaluation, XGBoost behavioral models, multi-feed threat
intelligence enrichment, Tree SHAP explainability, SOC case management,
and real-time WebSocket alert streaming.
"""

from dotenv import load_dotenv

# Load local environment variables (.env)
load_dotenv()


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.routes import (
    brands,
    analyze,
    detections,
    cases,
    campaigns,
    feedback,
    typosquat,
    blocklist,
    websocket_feed,
)
from db.session import engine
from db.models import Base

# --------------- App Setup ---------------
app = FastAPI(
    title="Aegis Digital Risk Protection API",
    version="1.0.0",
    description="Aegis — Social & App Impersonation Monitoring Engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------- Database ---------------
try:
    Base.metadata.create_all(bind=engine)
    from db.models import Brand
    from db.session import SessionLocal
    with SessionLocal() as db_init:
        if db_init.query(Brand).first() is None:
            print("[Aegis] Initializing database with demo fixtures...")
            try:
                from db.seed import seed_database
                seed_database()
            except Exception as seed_err:
                print(f"[Aegis] Auto-seed warning: {seed_err}")
except Exception as e:
    print(f"[Aegis] Warning during table initialization: {e}")

# --------------- Register Routers ---------------
app.include_router(brands.router, prefix="/api", tags=["Brands"])
app.include_router(analyze.router, prefix="/api", tags=["Analyzer"])
app.include_router(detections.router, prefix="/api", tags=["Detections"])
app.include_router(cases.router, prefix="/api", tags=["Cases"])
app.include_router(campaigns.router, prefix="/api", tags=["Campaigns"])
app.include_router(feedback.router, prefix="/api", tags=["Feedback"])
app.include_router(typosquat.router, prefix="/api", tags=["Typosquat"])
app.include_router(blocklist.router, prefix="/api", tags=["Blocklist"])
app.include_router(websocket_feed.router, tags=["WebSocket"])


@app.get("/")
async def root():
    return {
        "service": "Aegis Digital Risk Intelligence API",
        "status": "operational",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "platform": "Aegis", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
