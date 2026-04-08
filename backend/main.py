from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from os import getenv
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from routers import auth
from db.engine import create_tables, engine

# Load CORS configuration
FRONTEND_URL = getenv("FRONTEND_URL", "http://localhost:5173")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    print("🚀 Starting up: Creating database tables...")
    try:
        await create_tables()
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"⚠️  Error creating tables: {e}")

    yield

    # Shutdown
    print("🛑 Shutting down...")
    await engine.dispose()
    print("✅ Shutdown complete")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Fluid Architect AI - Auth API",
    description="Authentication API for Fluid Architect AI using Google SSO",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(auth.router, prefix="/auth", tags=["auth"])


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Fluid Architect AI Auth API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
