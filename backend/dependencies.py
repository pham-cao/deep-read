from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyCookie
from jose import JWTError, jwt
from os import getenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.engine import get_session
from db.models import User

SECRET_KEY = getenv("SECRET_KEY", "your-secret-key-here")


async def get_current_user(
    token: str = Depends(APIKeyCookie(name="token", auto_error=False)),
    session: AsyncSession = Depends(get_session)
) -> User:
    """
    Dependency to extract and verify JWT token from cookies.
    Fetches the user from database using the user_id from the token.
    Returns the User ORM object if valid, else raises 401.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    try:
        claims = jwt.decode(token, key=SECRET_KEY, algorithms=["HS256"])
        user_id_str = claims.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        # Convert string UUID back to UUID
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID format"
            )

        # Fetch user from database
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        return user

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
