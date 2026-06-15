import json
from os import getenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from db.models import User
from dependencies import get_current_user

from langchain_mcp_adapters.client import MultiServerMCPClient


client = MultiServerMCPClient(
    {
        "docs_knowledge": {
            # Make sure you start your weather server on port 8000
            "url": "http://host.docker.internal:8080/mcp",
            "transport": "streamable_http",
        }
    }
)

router = APIRouter()

# Lazy global agent — built on first request so missing API keys don't break import
_agent = None


async def _get_agent():
    global _agent
    if _agent is not None:
        return _agent
    
    tools =   await client.get_tools()

    api_key = getenv("GOOGLE_API_KEY") or getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_API_KEY is not set in the backend environment.",
        )

    # Imported lazily so that the rest of the app still boots if the LangChain
    # packages aren't installed yet.
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langgraph.prebuilt import create_react_agent

    model = ChatGoogleGenerativeAI(
        model=getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        google_api_key=api_key,
        temperature=0.7,
    )
    print("Initializing agent with tools:", tools)
    _agent = create_react_agent(
        model,
        tools=tools,
        prompt=("bạn là một trợ lý ảo có tên là DeepRead, giúp người dùng trả lời các câu hỏi dựa trên kiến thức từ các tài liệu đã được cung cấp. "
        ),
    )
    return _agent


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatStreamRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/stream")
async def chat_stream(
    payload: ChatStreamRequest,
    user: User = Depends(get_current_user),
):
    """Stream the agent's response token-by-token over Server-Sent Events."""
    agent = await _get_agent()

    # Build the message list: previous history + new user message
    messages = [{"role": m.role, "content": m.content} for m in payload.history]
    messages.append({"role": "user", "content": payload.message})

    async def event_generator():
        try:
            async for event in agent.astream(
                {"messages": messages},
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
