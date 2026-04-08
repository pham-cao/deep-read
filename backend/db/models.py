from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    """Core user identity table. No password field — Google SSO only."""
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    google_accounts = relationship("GoogleAccount", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class GoogleAccount(Base):
    """Google-specific account data tied to a user. Stores google_id (sub claim) as unique identifier."""
    __tablename__ = "google_accounts"

    id = Column(Uuid(as_uuid=True), primary_key=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    google_id = Column(String(255), unique=True, nullable=False, index=True)  # "sub" claim from Google
    email = Column(String(255), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="google_accounts")

    def __repr__(self):
        return f"<GoogleAccount(id={self.id}, google_id={self.google_id}, user_id={self.user_id})>"


class UserSession(Base):
    """Stores hashed refresh tokens for session management. Hash prevents token retrieval from DB."""
    __tablename__ = "user_sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)  # SHA-256 hash of refresh token
    ip_address = Column(String(45), nullable=True)  # Supports IPv4 and IPv6
    user_agent = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class Collection(Base):
    """A user-owned collection (e.g. group of documents)."""
    __tablename__ = "collections"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon_base64 = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="collections")

    def __repr__(self):
        return f"<Collection(id={self.id}, name={self.name}, user_id={self.user_id})>"
