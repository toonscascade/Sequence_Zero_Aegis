import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Bridge package namespaces so 'from api.routes import ...' resolves to backend/api/routes
import api
backend_api_dir = str(backend_dir / "api")
if backend_api_dir not in getattr(api, "__path__", []):
    api.__path__.append(backend_api_dir)

from main import app

# Export ASGI app for Vercel Serverless Function
export = app
