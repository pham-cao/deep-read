from os import getenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from db.models import Base

# Load database URL from environment
DATABASE_URL = getenv("DATABASE_URL", "postgresql+asyncpg://deepread:deepread_pass@localhost:5432/deepread_db")

# Create async engine
# Using default QueuePool for better async support
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging in development
    pool_size=5,  # Number of connections to keep in pool
    max_overflow=10,  # Additional connections above pool_size
    pool_pre_ping=True,  # Verify connections are alive before using them
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session():
    """FastAPI dependency to get an AsyncSession for a request."""
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    """Create all tables defined in Base.metadata. Call on app startup."""
    import asyncio

    # Retry logic to wait for database to be ready
    max_retries = 5
    retry_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return  # Success, exit function
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⏳ Database not ready yet, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries})...")
                await asyncio.sleep(retry_delay)
            else:
                print(f"❌ Failed to create tables after {max_retries} attempts: {e}")
                raise


async def drop_tables():
    """Drop all tables. Only use in development/testing."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
