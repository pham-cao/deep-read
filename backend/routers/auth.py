import datetime
import warnings
from os import getenv
from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi_sso.sso.google import GoogleSSO
from fastapi_sso.sso.base import OpenID
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from db.models import User
from dependencies import get_current_user
from services.user_manager import UserManager

# Suppress the ReusedOauthClientWarning - it's safe to reuse in FastAPI's request-per-connection model
warnings.filterwarnings("ignore", message=".*Reusing the SSO object.*")

# Load environment variables
GOOGLE_CLIENT_ID = getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = getenv("GOOGLE_CLIENT_SECRET")
SECRET_KEY = getenv("SECRET_KEY", "your-secret-key-here")
FRONTEND_URL = getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = getenv("BACKEND_URL", "http://localhost:8000")

# Validate required environment variables
if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")

# Initialize GoogleSSO
google_sso = GoogleSSO(
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    redirect_uri=f"{BACKEND_URL}/auth/google/callback"
)

router = APIRouter()


@router.get("/google/login")
async def google_login():
    """Redirect user to Google OAuth consent screen."""
    return await google_sso.get_login_redirect()


@router.get("/google/callback")
async def google_callback(request: Request, session: AsyncSession = Depends(get_session)):
    """
    Handle Google OAuth callback.
    Verify user data with UserManager, create JWT, set cookie, and redirect to frontend.
    """
    openid = await google_sso.verify_and_process(request)
    if not openid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

    # Use UserManager to create/update user and get session info
    user_manager = UserManager(session)
    user, refresh_token = await user_manager.login_or_create(openid)

    # Create JWT token with user ID (not full OpenID dict)
    expiration = datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(days=1)
    token = jwt.encode(
        {
            "sub": str(user.id),  # User UUID as subject
            "exp": expiration,
        },
        key=SECRET_KEY,
        algorithm="HS256"
    )

    # Create response redirecting to frontend /chat
    response = RedirectResponse(url=f"{FRONTEND_URL}/chat", status_code=302)

    # Set JWT in httponly cookie
    response.set_cookie(
        key="token",
        value=token,
        expires=expiration,
        httponly=True,
        secure=False,  # Set to True in production (HTTPS only)
        samesite="lax"
    )

    return response


@router.get("/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """
    Protected endpoint: return current user's information from database.
    """
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    """
    Logout endpoint: delete token cookie and redirect to login.
    """
    response = RedirectResponse(url=f"{FRONTEND_URL}/login", status_code=302)
    response.delete_cookie(key="token")
    return response


@router.get("/logout")
async def logout_get():
    """
    Allow GET logout for convenience (e.g., clicking logout link).
    """
    response = RedirectResponse(url=f"{FRONTEND_URL}/login", status_code=302)
    response.delete_cookie(key="token")
    return response
