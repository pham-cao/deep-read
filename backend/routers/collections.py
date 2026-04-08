from math import ceil
from uuid import uuid4
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from db.models import Collection, User
from dependencies import get_current_user

router = APIRouter()

PAGE_SIZE = 12


class CollectionCreate(BaseModel):
    name_collections: str = Field(..., min_length=1, max_length=255)
    descriptions: str | None = None
    base_64_icon: str | None = None


class CollectionResponse(BaseModel):
    id: str
    user_id: str
    name_collections: str
    descriptions: str | None
    base_64_icon: str | None
    created_at: str


class CollectionCountResponse(BaseModel):
    total: int
    page_size: int
    total_pages: int


class CollectionListResponse(BaseModel):
    items: list[CollectionResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


def _to_response(collection: Collection) -> CollectionResponse:
    return CollectionResponse(
        id=str(collection.id),
        user_id=str(collection.user_id),
        name_collections=collection.name,
        descriptions=collection.description,
        base_64_icon=collection.icon_base64,
        created_at=collection.created_at.isoformat(),
    )


@router.post("/", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new collection owned by the currently authenticated user."""
    collection = Collection(
        id=uuid4(),
        user_id=user.id,
        name=payload.name_collections,
        description=payload.descriptions,
        icon_base64=payload.base_64_icon,
    )
    session.add(collection)
    await session.commit()
    await session.refresh(collection)

    return _to_response(collection)


@router.get("/count", response_model=CollectionCountResponse)
async def count_collections(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return the total number of collections for the current user and pagination info."""
    stmt = select(func.count()).select_from(Collection).where(Collection.user_id == user.id)
    total = (await session.execute(stmt)).scalar_one()
    total_pages = ceil(total / PAGE_SIZE) if total else 0
    return CollectionCountResponse(
        total=total,
        page_size=PAGE_SIZE,
        total_pages=total_pages,
    )


@router.get("/", response_model=CollectionListResponse)
async def list_collections(
    page: int = Query(1, ge=1),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return a paginated list of collections (12 per page) owned by the current user."""
    count_stmt = select(func.count()).select_from(Collection).where(Collection.user_id == user.id)
    total = (await session.execute(count_stmt)).scalar_one()
    total_pages = ceil(total / PAGE_SIZE) if total else 0

    stmt = (
        select(Collection)
        .where(Collection.user_id == user.id)
        .order_by(Collection.created_at.desc())
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
    )
    result = await session.execute(stmt)
    items = [_to_response(c) for c in result.scalars().all()]

    return CollectionListResponse(
        items=items,
        page=page,
        page_size=PAGE_SIZE,
        total=total,
        total_pages=total_pages,
    )
