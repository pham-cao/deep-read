# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deep-read** is a full-stack application for document management and chat, with Google OAuth authentication. The project has separate frontend and backend implementations.

## Architecture

### Frontend (`/frontend`)
- **Framework**: React 19 with TypeScript (though currently using JSX)
- **Build Tool**: Vite 4.5
- **Routing**: React Router v7
- **Structure**:
  - `/src/pages/`: Route pages (LoginPage, ChatPage, DocumentsPage, DocumentDetailPage, HistoryPage)
  - `/src/components/`: Reusable components (Sidebar, Layout)
  - `/src/main.jsx`: Entry point with React Router setup
  - Each page has a corresponding `.css` file for styling

### Backend (`/backend`)
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn with async support
- **Database**: PostgreSQL with SQLAlchemy ORM (async with asyncpg)
- **Authentication**: Google OAuth via `fastapi-sso` with JWT tokens stored in httponly cookies
- **Structure**:
  - `main.py`: FastAPI app setup with CORS, startup event for DB table creation
  - `/db/`: Database layer (models.py, engine.py)
  - `/services/`: Business logic (user_manager.py)
  - `/routers/auth.py`: All authentication endpoints
  - `dependencies.py`: Dependency injection (JWT verification, get_current_user)
- **Key Features**:
  - Google OAuth login/callback flow with user persistence
  - JWT token generation (minimal payload: user UUID + expiration)
  - Protected endpoints that require valid JWT and active user account
  - Automatic table creation on startup
  - User profile syncing from Google on each login

### Authentication Flow
1. User clicks login → redirected to `/auth/google/login`
2. Google redirects back to `/auth/google/callback`
3. Backend verifies with Google OAuth:
   - Checks `email_verified` flag
   - Uses `UserManager.login_or_create()` to upsert user data in DB
   - Syncs display_name and avatar_url from Google profile
   - Creates session token hash record
4. JWT created with minimal payload: `{"sub": user.id, "exp": expiration}`
5. JWT set in httponly cookie, frontend redirected to `/chat`
6. Protected endpoints use `get_current_user` dependency to:
   - Extract user UUID from JWT
   - Query database for user record
   - Verify user is active
   - Return `User` ORM object to endpoint

## Development Commands

### Frontend (Local)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Build for production (TypeScript + Vite)
npm run preview      # Preview production build locally
```

### Backend (Local)
```bash
cd backend
python -m venv venv          # Create virtual environment (one-time)
source venv/bin/activate     # Activate virtual environment
pip install -r requirements.txt  # Install dependencies (FastAPI, SQLAlchemy, asyncpg, etc.)
python main.py               # Start uvicorn dev server (http://localhost:8000, auto-reload)
```

**Backend dependencies** (see `requirements.txt`):
- `fastapi`: Web framework
- `uvicorn[standard]`: ASGI server
- `fastapi-sso`: Google OAuth provider
- `sqlalchemy[asyncio]`: ORM with async support
- `asyncpg`: PostgreSQL async driver
- `python-jose[cryptography]`: JWT token handling
- `python-dotenv`: Environment variable loading
- `alembic`: Database migrations (for future use)

### Docker Compose (Full Stack with PostgreSQL)
```bash
# Copy environment template and update with your credentials
cp .env.example .env

# Start all services (backend + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

- Backend: http://localhost:8000
- PostgreSQL: localhost:5432 (accessible from backend as `postgres:5432`)
- Frontend still runs separately: `cd frontend && npm run dev`

## Configuration

### Environment Variables
Located in `.env` (use `.env.example` as template):

**OAuth & Security**:
- `GOOGLE_CLIENT_ID`: Google OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `SECRET_KEY`: JWT signing secret (use strong random string in production)

**URLs**:
- `FRONTEND_URL`: Frontend origin for CORS and redirects (default: http://localhost:5173)
- `BACKEND_URL`: Backend origin for OAuth redirect_uri (default: http://localhost:8000)

**Database**:
- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql+asyncpg://deepread:deepread_pass@postgres:5432/deepread`)
- `POSTGRES_USER`: Database user (default: deepread)
- `POSTGRES_PASSWORD`: Database password (default: deepread_pass)
- `POSTGRES_DB`: Database name (default: deepread)

**Note**: For production, update `.env` with real credentials. Use strong values for `SECRET_KEY` and `POSTGRES_PASSWORD`. The `.env.example` file provides a template.

### Frontend
- `vite.config.js`: May need proxy configuration for API calls in dev environment
- TypeScript configuration in `tsconfig.json`

## Key Implementation Details

### Authentication Cookie
- Token stored in `httponly` cookie named `token`
- Secure flag currently `False` in dev (set to `True` for production with HTTPS)
- SameSite set to `lax` to prevent CSRF
- Expires in 1 day from login

### CORS
- Only allows requests from `FRONTEND_URL` environment variable
- Credentials enabled to send cookies with requests

### Protected Endpoints
Backend endpoints like `/auth/me` require JWT from cookie. Frontend must send cookies with requests (ensure `fetch` calls have `credentials: 'include'`).

### Database (PostgreSQL + SQLAlchemy)
- When using docker-compose, backend can connect via `DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/db`
- Database runs on port 5432, persisted in Docker volume `postgres_data`
- Health check ensures database is ready before backend starts
- For local development without Docker, update `DATABASE_URL` to use `localhost` instead of `postgres`
- Tables auto-created on app startup via FastAPI lifespan context manager
- Uses async SQLAlchemy with asyncpg driver for non-blocking I/O
- Development uses `NullPool` to avoid connection pooling issues; production should use `QueuePool` with proper pool settings

## Common Development Tasks

**Running full stack with Docker**:
1. Copy and configure: `cp .env.example .env`
2. Start services: `docker-compose up -d`
3. In another terminal, start frontend: `cd frontend && npm run dev`
4. Navigate to http://localhost:5173
5. View backend logs: `docker-compose logs -f backend`

**Running backend locally with PostgreSQL in Docker**:
1. Start only database: `docker-compose up -d postgres`
2. Start backend: `cd backend && python main.py`
3. Backend connects via `DATABASE_URL` env var
4. In another terminal: `cd frontend && npm run dev`

**Testing authentication flow**:
- Use actual Google OAuth credentials in `.env` (test app setup in Google Cloud Console)
- Or mock the flow during development by manually setting the cookie

**Adding new API endpoints**:
1. Create route function in `backend/routers/`
2. Include router in `backend/main.py` with `app.include_router()`
3. Optionally protect with `Depends(get_current_user)` for auth requirement

**Adding new frontend pages**:
1. Create page component in `src/pages/`
2. Add route in `src/main.jsx` (App routing setup)
3. Link to it from Sidebar or other navigation

**OpenID object fields**:
The `OpenID` object from `fastapi-sso.verify_and_process()` has these fields:
- `id`: Google's "sub" claim (stable identifier)
- `email`: User's email address
- `first_name`, `last_name`: User's name parts (can be None)
- `picture`: Avatar URL from Google (can be None)
- `email_verified`: Whether Google verified the email (checked internally by fastapi-sso)
- `provider`: OAuth provider name ("google")

**Working with the database**:
1. Define new models in `backend/db/models.py` (inherit from `Base`)
2. Models automatically created on app startup via `create_tables()` in startup event
3. Use `Depends(get_session)` in endpoints to get an `AsyncSession`
4. Query with SQLAlchemy async syntax: `await session.execute(select(Model).where(...))`
5. For complex logic, add methods to service classes in `backend/services/`

**UserManager usage**:
```python
from db.engine import get_session
from services.user_manager import UserManager

async def my_endpoint(session: AsyncSession = Depends(get_session)):
    manager = UserManager(session)
    user = await manager.get_user_by_id(user_id)
```

## Database Schema

The backend uses three interconnected tables following [google-oauth2-best-practice.md](./backend/google-oauth2-best-practice.md):

### `users` — Core identity
- `id` (UUID, PK): Unique user identifier
- `email` (VARCHAR UNIQUE): Email address
- `display_name`: User's display name (synced from Google on each login)
- `avatar_url`: Profile picture URL (synced from Google on each login)
- `is_active` (BOOLEAN): Account status
- `created_at`, `updated_at`: Timestamps

### `google_accounts` — OAuth provider link
- `id` (UUID, PK): Account record ID
- `user_id` (FK → users.id): Links to user
- `google_id` (VARCHAR UNIQUE): Google's "sub" claim (stable identifier)
- `email`: Email from Google (for audit trail)
- `last_login_at`: Last authentication time
- `created_at`: First linked timestamp

### `user_sessions` — Session tokens
- `id` (UUID, PK): Session record ID
- `user_id` (FK → users.id): Links to user
- `token_hash` (VARCHAR UNIQUE): SHA-256 hash of refresh token (for logout)
- `ip_address`, `user_agent`: Optional request info
- `expires_at`: Token expiration
- `created_at`: Session creation time

## Backend File Structure

```
backend/
├── db/
│   ├── models.py          — SQLAlchemy ORM models (User, GoogleAccount, UserSession)
│   │                         Relationships use lazy=False for async safety
│   └── engine.py          — Async engine (NullPool for dev), session factory, create_tables()
├── services/
│   └── user_manager.py    — UserManager class with login_or_create() and revoke_session()
│                             Uses selectinload() for eager-loading relationships in async context
├── routers/
│   └── auth.py            — Google OAuth flow, integrates UserManager
│                             Suppresses ReusedOauthClientWarning (safe in FastAPI model)
├── main.py                — FastAPI app with lifespan context manager for startup/shutdown
├── dependencies.py        — get_current_user (fetches user from DB)
└── requirements.txt       — SQLAlchemy, asyncpg, alembic
```

## User Manager Workflow

Located in `backend/services/user_manager.py`, this service handles all user persistence logic following [google-oauth2-best-practice.md](./backend/google-oauth2-best-practice.md).

### `login_or_create(openid: OpenID) → (User, refresh_token)`
Implements the OAuth2 callback flow:

1. **Look up google_accounts**: Query by `google_id` (Google's "sub" claim)
2. **If account exists**:
   - Update `last_login_at` timestamp
   - Sync `display_name` (from `first_name`/`last_name`) and `avatar_url` (from `picture`)
3. **If account doesn't exist**:
   - Check if user with this email already exists
   - If yes: create and link new `GoogleAccount` + sync profile from Google
   - If no: create new `User` and `GoogleAccount` with Google profile data
4. **Create session**: Generate refresh token, store SHA-256 hash in `user_sessions`
5. **Return**: `(User ORM object, refresh_token string)`

Note: `fastapi-sso.verify_and_process()` already validates the email with Google, so we don't duplicate that check here.

### `revoke_session(token: str) → bool`
Deletes the session record by token hash (used for logout).

### `get_user_by_id(user_id: str) → User | None`
Queries a user by UUID.

### JWT Token Structure
- **Old** (before DB): `{"pld": {...full OpenID dict...}, "exp": ..., "sub": openid.id}`
- **New** (with DB): `{"sub": str(user.id), "exp": ...}`

This reduces token size and keeps OpenID data in DB where it can be updated. `get_current_user` dependency decodes the JWT, fetches the user record from DB, and returns the `User` ORM object.

## Async SQLAlchemy Patterns

When working with async SQLAlchemy, follow these patterns:

**Eager-loading relationships** - Always use `selectinload()` or `joinedload()` to avoid lazy loads:
```python
from sqlalchemy.orm import selectinload
stmt = select(GoogleAccount).options(selectinload(GoogleAccount.user))
result = await session.execute(stmt)
```

**Why?** Lazy loads trigger synchronous I/O in an async context, causing `greenlet_spawn` errors. Eager-load everything you'll need before returning from the query.

**Connection pooling** - Development uses `NullPool` to avoid greenlet issues. Production should use `QueuePool` with proper settings in `db/engine.py`.

**Flushing vs Committing**:
- `await session.flush()` - Sends changes to DB but doesn't commit (for intermediate operations)
- `await session.commit()` - Flushes and commits (use at the end of a transaction)

## Security Notes

**Email Verification**: The `fastapi-sso.verify_and_process()` call in the callback endpoint validates that Google confirmed the user's email (`email_verified: true`). We trust this validation and don't duplicate the check in `UserManager`. Google's OAuth2 flow ensures only verified emails reach our backend.

**Token Hashing**: User session tokens are never stored in plain text. Only the SHA-256 hash is persisted, so a database leak doesn't expose active refresh tokens.

**JWT Payload**: The JWT contains only the user UUID and expiration. The full user profile is fetched from the database on each request via `get_current_user`, so profile changes (like name or avatar) take effect immediately without token refresh.

**Account Linking**: When an email from Google matches an existing user but no `google_accounts` record exists, the system automatically links them (safe for single-provider systems). If supporting multiple auth methods in future, add an explicit user confirmation step.

**Database Connection**: Use strong credentials in production. The `DATABASE_URL` can include connection pool settings for production loads.

## Git Workflow
- Initial commits: `Initial commit` and `init front-end`
- Work on `main` branch
