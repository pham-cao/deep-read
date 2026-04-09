import json
import os
import time
from typing import TYPE_CHECKING, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status

if TYPE_CHECKING:
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from db.models import ChatSession, User
from dependencies import get_current_user

router = APIRouter()


def _uuid7() -> str:
    """Generate a UUID v7 (time-ordered) without external dependencies."""
    ms = int(time.time() * 1000)
    rand_a = int.from_bytes(os.urandom(2), 'big') & 0x0FFF
    rand_b = int.from_bytes(os.urandom(8), 'big') & 0x3FFFFFFFFFFFFFFF
    val = (ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    h = f'{val:032x}'
    return f'{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}'


# Lazy global agent — built on first request so missing API keys don't break import.
# The checkpointer is passed in from app.state (set up during lifespan startup).
_agent = None


def _get_agent(checkpointer: "AsyncPostgresSaver"):
    global _agent
    if _agent is not None:
        return _agent

    from os import getenv
    api_key = getenv("GOOGLE_API_KEY") or getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_API_KEY is not set in the backend environment.",
        )

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langgraph.prebuilt import create_react_agent

    model = ChatGoogleGenerativeAI(
        model=getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        google_api_key=api_key,
        temperature=0.7,
    )
    _agent = create_react_agent(
        model,
        tools=[],
        prompt=(
            "You are Architect AI, a helpful assistant for architects and designers. "
            "Provide clear, accurate, and practical answers about architecture, materials, "
            "construction, and design."
        ),
        checkpointer=checkpointer,
    )
    return _agent


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatStreamRequest(BaseModel):
    message: str = Field(..., min_length=1)
    # history kept for API compatibility but ignored — checkpointer manages thread history
    history: list[ChatMessage] = Field(default_factory=list)
    session_id: Optional[str] = None


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/stream")
async def chat_stream(
    payload: ChatStreamRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Stream the agent's response token-by-token over Server-Sent Events."""
    agent = _get_agent(request.app.state.checkpointer)

    is_new_session = payload.session_id is None
    session_id = payload.session_id or _uuid7()

    # Persist a new ChatSession row the first time this session_id is used.
    if is_new_session:
        db.add(ChatSession(id=UUID(session_id), user_id=user.id))
        await db.commit()

    config = {"configurable": {"thread_id": session_id}}

    # With the checkpointer active, LangGraph loads full thread history automatically.
    # Only the new user message needs to be submitted.
    messages = [{"role": "user", "content": payload.message}]

    async def event_generator():
        try:
            yield _sse({"session_id": session_id})
            async for event in agent.astream(
                {"messages": messages},
                config,
                stream_mode="messages",
            ):
                # `messages` mode yields (message_chunk, metadata) tuples,
                # but be defensive in case the shape changes.
                if isinstance(event, tuple) and len(event) >= 1:
                    chunk = event[0]
                else:
                    chunk = event

                # Skip human/tool echoes — only stream AI-generated tokens.
                cls_name = type(chunk).__name__
                if cls_name not in ("AIMessage", "AIMessageChunk"):
                    continue

                content = getattr(chunk, "content", None)
                if not content:
                    continue

                # Gemini may return a string or a list of content blocks.
                if isinstance(content, str):
                    yield _sse({"token": content})
                elif isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict):
                            text = block.get("text") or ""
                            if text:
                                yield _sse({"token": text})
                        elif isinstance(block, str):
                            yield _sse({"token": block})

            yield _sse({"done": True})
        except Exception as exc:  # surface errors to the client instead of hanging
            import traceback
            traceback.print_exc()
            yield _sse({"error": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
