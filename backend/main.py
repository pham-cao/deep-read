from db.engine import create_tables, engine
from routers import auth, collections, chat
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from os import getenv
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# Load CORS configuration
FRONTEND_URL = getenv("FRONTEND_URL", "http://localhost:5173")


def _pg_url_for_psycopg(url: str) -> str:
    """Convert SQLAlchemy asyncpg URL to plain psycopg3 URL."""
    return (
        url.replace("postgresql+asyncpg://", "postgresql://")
        .replace("postgres+asyncpg://", "postgres://")
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup — DB tables
    print("🚀 Starting up: Creating database tables...")
    try:
        await create_tables()
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"⚠️  Error creating tables: {e}")

    # Startup — LangGraph checkpointer + agent
    app.state.agent = None
    app.state.checkpointer = None
    app.state.pg_pool = None
    try:
        from psycopg_pool import AsyncConnectionPool
        from psycopg.rows import dict_row
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langgraph.prebuilt import create_react_agent

        raw_db_url = getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://deepread:deepread_pass@postgres:5432/deepread",
        )
        pg_url = _pg_url_for_psycopg(raw_db_url)

        pool = AsyncConnectionPool(
            conninfo=pg_url,
            max_size=5,
            kwargs={"autocommit": True, "row_factory": dict_row},
            open=False,
        )
        await pool.open()
        app.state.pg_pool = pool

        checkpointer = AsyncPostgresSaver(pool)
        await checkpointer.setup()
        print("✅ LangGraph checkpoint tables ready")

        api_key = getenv("GOOGLE_API_KEY") or getenv("GEMINI_API_KEY")
        if api_key:
            model = ChatGoogleGenerativeAI(
                model=getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                google_api_key=api_key,
                temperature=0.7,
            )
            app.state.agent = create_react_agent(
                model,
                tools=[],
                prompt=(
                    "You are Architect AI, a helpful assistant for architects and designers. "
                    "Provide clear, accurate, and practical answers about architecture, materials, "
                    "construction, and design."
                ),
                checkpointer=checkpointer,
            )
            print("✅ LangGraph agent ready")
        else:
            print("⚠️  GOOGLE_API_KEY not set — chat agent disabled")
    except Exception as e:
        print(f"⚠️  Could not set up LangGraph agent: {e}")

    yield

    # Shutdown
    print("🛑 Shutting down...")
    await engine.dispose()
    if app.state.pg_pool is not None:
        await app.state.pg_pool.close()
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
app.include_router(collections.router,
                   prefix="/collections", tags=["collections"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])


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
