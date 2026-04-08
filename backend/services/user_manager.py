import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from fastapi_sso.sso.base import OpenID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from db.models import GoogleAccount, User, UserSession


class UserManager:
    """Manages user lifecycle following Google OAuth2 best practices."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def login_or_create(self, openid: OpenID) -> tuple[User, str]:
        """
        Authenticate or create a user from Google OAuth callback.

        Implements the flow from google-oauth2-best-practice.md:
        1. Look up google_accounts by google_id (sub claim)
        2. If found: update last_login_at, sync display_name and avatar_url
        3. If not found: check if users.email exists; link or create
        4. Create user_sessions row with hashed refresh token
        5. Return (user, refresh_token)

        Note: fastapi-sso.verify_and_process() already validates email_verified with Google,
        so we don't need to check it here.

        Args:
            openid: OpenID object from fastapi-sso with Google claims

        Returns:
            tuple of (User ORM object, refresh_token string)
        """

        # 1. Look up existing google_accounts by google_id (with eager-loaded user relationship)
        stmt = select(GoogleAccount).where(GoogleAccount.google_id == openid.id).options(selectinload(GoogleAccount.user))
        result = await self.session.execute(stmt)
        google_account = result.scalars().first()

        # Build display name from first and last name
        display_name = None
        if openid.first_name or openid.last_name:
            display_name = f"{openid.first_name or ''} {openid.last_name or ''}".strip()

        if google_account:
            # Account exists, update last login and sync profile
            user = google_account.user
            google_account.last_login_at = datetime.now(tz=timezone.utc)
            user.display_name = display_name
            user.avatar_url = openid.picture
            user.updated_at = datetime.now(tz=timezone.utc)
            await self.session.flush()
        else:
            # Account doesn't exist, check if user with this email already exists
            stmt = select(User).where(User.email == openid.email)
            result = await self.session.execute(stmt)
            user = result.scalars().first()

            if user:
                # User exists with this email, link Google account and sync profile
                google_account = GoogleAccount(
                    id=uuid4(),
                    user_id=user.id,
                    google_id=openid.id,
                    email=openid.email,
                    last_login_at=datetime.now(tz=timezone.utc),
                )
                self.session.add(google_account)
                # Sync profile from Google
                user.display_name = display_name
                user.avatar_url = openid.picture
                user.updated_at = datetime.now(tz=timezone.utc)
            else:
                # Create new user and google_account
                user = User(
                    id=uuid4(),
                    email=openid.email,
                    display_name=display_name,
                    avatar_url=openid.picture,
                    is_active=True,
                )
                self.session.add(user)
                await self.session.flush()  # Flush to get user.id

                google_account = GoogleAccount(
                    id=uuid4(),
                    user_id=user.id,
                    google_id=openid.id,
                    email=openid.email,
                    last_login_at=datetime.now(tz=timezone.utc),
                )
                self.session.add(google_account)

        # 4. Create user_sessions row with hashed refresh token
        refresh_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        expires_at = datetime.now(tz=timezone.utc) + timedelta(days=7)

        session = UserSession(
            id=uuid4(),
            user_id=user.id,
            token_hash=token_hash,
            ip_address=None,  # Could extract from request if needed
            user_agent=None,  # Could extract from request if needed
            expires_at=expires_at,
        )
        self.session.add(session)
        await self.session.commit()

        return user, refresh_token

    async def revoke_session(self, token: str) -> bool:
        """
        Revoke a user session by deleting its token hash.

        Args:
            token: The refresh token string to revoke

        Returns:
            True if a session was revoked, False if token not found
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        stmt = select(UserSession).where(UserSession.token_hash == token_hash)
        result = await self.session.execute(stmt)
        session = result.scalars().first()

        if session:
            self.session.delete(session)
            await self.session.commit()
            return True

        return False

    async def get_user_by_id(self, user_id: str) -> User | None:
        """Fetch user by UUID."""
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()
