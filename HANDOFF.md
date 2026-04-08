# Deep-Read — Session Handoff

Snapshot of work completed during the previous session, intended for the next engineer (or next Claude run) picking up the project.

## Scope of work delivered

1. **Collections feature** (backend + frontend)
2. **Docker Compose env wiring**
3. **Streaming chat with LangGraph + Gemini** (backend + frontend)
4. **Streaming UX polish** (smooth typewriter, markdown rendering)

---

## 1. Collections API

### Backend

**`backend/db/models.py`** — added `Collection` ORM model and `User.collections` relationship.

```python
class Collection(Base):
    __tablename__ = "collections"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon_base64 = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    user = relationship("User", back_populates="collections")
```

Table is auto-created on backend startup via the existing `create_tables()` lifespan hook (`backend/main.py`). No Alembic migration was added.

**`backend/routers/collections.py`** — three endpoints, all protected by `get_current_user`:

| Method | Path        | Purpose                                          |
|--------|-------------|--------------------------------------------------|
| POST   | `/`         | Create a collection for the logged-in user       |
| GET    | `/count`    | `{ total, page_size: 12, total_pages }`          |
| GET    | `/?page=N`  | Paginated list (12/page, ordered `created_at desc`) |

**Security note**: `user_id` is taken from the JWT cookie via `get_current_user`, **never** from the request body. The create payload only accepts `name_collections`, `descriptions`, `base_64_icon`.

**`backend/main.py`** — registered: `app.include_router(collections.router, prefix="/collections", tags=["collections"])`.

### Frontend

**`frontend/src/pages/DocumentsPage.jsx`** — replaced mock state with server-driven pagination:

- `COLLECTIONS_PER_PAGE = 12`
- `fetchCollections(page)` fetches list and count in parallel (`credentials: 'include'`)
- `useEffect` refetches whenever `colPage` changes
- `handleCreateCollection` POSTs to `http://localhost:8000/collections/`, then jumps to page 1 on success
- New states: `isCreating`, `createError`, `isLoadingCollections`, `loadError`, `totalCollections`, `totalColPages`
- Loading / error / empty states added to the grid

---

## 2. Docker Compose env wiring

**`docker-compose.yml`** — added `env_file: - .env` to the backend service so `GOOGLE_API_KEY`, `GOOGLE_CLIENT_ID`, `SECRET_KEY`, etc., flow through without per-key duplication.

---

## 3. Streaming chat (LangGraph + Gemini)

### Backend

**`backend/requirements.txt`** — added:
```
langchain-core>=0.3
langgraph>=0.2.50
langchain-google-genai>=2.0
```

**`backend/routers/chat.py`** (new file)

- Lazy global agent built on first request (`_get_agent()`) — keeps the app bootable when LangChain packages or API keys are missing.
- Uses `langgraph.prebuilt.create_react_agent` with `ChatGoogleGenerativeAI`.
- Reads `GOOGLE_API_KEY` or `GEMINI_API_KEY`. Default model: `gemini-3-flash-preview` (env override `GEMINI_MODEL`).
- `POST /chat/stream` returns `StreamingResponse(media_type="text/event-stream")`.
- Body: `{ message: str, history: [{role, content}, ...] }`.
- Streams via `agent.astream(..., stream_mode="messages")`, which yields `(chunk, metadata)` tuples.

**Critical detail**: filter chunks by **class name** (`AIMessage` / `AIMessageChunk`), **not** by `metadata["langgraph_node"]`. Newer LangGraph versions changed the node name and the old filter silently dropped every token.

```python
cls_name = type(chunk).__name__
if cls_name not in ("AIMessage", "AIMessageChunk"):
    continue
```

Content can be `str` or a list of blocks (Gemini quirk) — both are handled.

SSE format: `data: {"token": "..."}\n\n`, terminated by `data: {"done": true}\n\n`. Errors sent as `data: {"error": "..."}\n\n`.

**`backend/main.py`** — registered: `app.include_router(chat.router, prefix="/chat", tags=["chat"])`.

### Frontend

**`frontend/src/pages/ChatPage.jsx`** — full streaming consumer:

- Sends `{ message, history }` to `/chat/stream` with `credentials: 'include'`.
- Reads `response.body.getReader()`, decodes with `TextDecoder({stream:true})`, splits on `\n\n`, parses `data:` lines as JSON.
- **Typewriter buffer with `requestAnimationFrame`**: tokens append to a `buffer.pending` string and a rAF loop drains adaptively (`Math.max(2, Math.ceil(len/8))` chars/frame). Smooths bursty Gemini chunks into a steady type-out.
- **Idempotent state updaters**: existence check happens *inside* `setMessages((prev) => ...)`, deriving from `prev.find(...)`. This was a fix for a React Strict Mode bug — closure-based `botCreated` flags get double-invoked in dev and break.
- **Scroll behavior**: `isStreamingRef` tracks streaming; `scrollToBottom` uses `'auto'` while streaming and `'smooth'` otherwise. Without this, restarted smooth scrolls fight each other and look jerky. Effect is wrapped in `requestAnimationFrame` with cleanup.

**Markdown rendering**:
- `npm install react-markdown remark-gfm`
- Bot bubbles render through `<ReactMarkdown remarkPlugins={[remarkGfm]}>` with a blinking `▍` cursor (`.chat-cursor`) while `msg.streaming === true`.
- User bubbles stay plain text (`white-space: pre-wrap`).
- React-markdown re-parses on every text mutation, so incomplete syntax renders as plain text until the closing token arrives — works seamlessly with streaming.

**`frontend/src/pages/ChatPage.css`** — added:
- `.chat-cursor` blink animation
- `.chat-markdown` styles: h1–h6, paragraphs, lists, links (`#006067`), blockquotes (left border + tinted bg), inline code (light tint), fenced code blocks (dark `#1f2937`), tables, hr, strong/em

---

## Bugs hit & resolutions

| Symptom | Root cause | Fix |
|---|---|---|
| `npm run dev` failed: cannot resolve `@vitejs/plugin-react` | Deps not installed | `npm install` first |
| `404 model models/gemini-2.0-flash is no longer available` | Deprecated model | Updated default; user later set `gemini-3-flash-preview` |
| Backend streamed but frontend showed nothing (1) | Filter `metadata.langgraph_node != "agent"` dropped all chunks because the node name changed in newer langgraph | Filter by class name `AIMessage`/`AIMessageChunk` instead |
| Backend streamed but frontend showed nothing (2) | React Strict Mode double-invokes state updaters; closure flag `botCreated` flipped on first call, second call skipped creation → updates targeted a non-existent message | Make updaters idempotent — check `prev.find(m => m.id === botId)` *inside* the updater |
| Streaming visibly jerky | Bursty token chunks + smooth scroll fighting itself | rAF typewriter buffer + instant scroll while streaming |

---

## Verification checklist

```bash
# 1. Backend boots and creates the collections table
docker-compose up -d --build
docker-compose logs -f backend
# Look for: "Database tables created successfully"

# 2. Log in via http://localhost:5173 to set the JWT cookie

# 3. Create a collection (replace <JWT>)
curl -X POST http://localhost:8000/collections/ \
  -H "Content-Type: application/json" \
  -b "token=<JWT>" \
  -d '{"name_collections":"Test","descriptions":"x","base_64_icon":""}'

# 4. Pagination
curl http://localhost:8000/collections/count -b "token=<JWT>"
curl "http://localhost:8000/collections/?page=1" -b "token=<JWT>"

# 5. Chat stream
curl -N -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -b "token=<JWT>" \
  -d '{"message":"Hello","history":[]}'
```

Frontend smoke tests:
- Documents page loads, paginates, and "Create collection" persists across reload
- Chat page streams a Gemini response token-by-token, renders markdown (lists, code fences, bold/italic), and the typing cursor appears only while streaming

---

## Known gaps / things deliberately not done

- **No Alembic migration** for `collections` — relies on `create_tables()`. Fine for dev, will need a migration for prod.
- **No tests** added for the new endpoints.
- **No collection update / delete endpoints** — only create + list + count.
- **Chat history is client-driven** — backend does not persist conversations. Each request resends the full history.
- **No rate limiting** on `/chat/stream`.
- **Gemini model name** (`gemini-3-flash-preview`) is preview; verify availability before deploying.
- **CORS** still locked to a single `FRONTEND_URL`.

---

## File index (touched this session)

```
backend/
  db/models.py            (modified — Collection model + relationship)
  routers/collections.py  (new)
  routers/chat.py         (new)
  main.py                 (modified — register routers)
  requirements.txt        (modified — langchain/langgraph/genai)

frontend/
  src/pages/DocumentsPage.jsx  (modified — server-driven pagination + create)
  src/pages/ChatPage.jsx       (modified — SSE streaming, typewriter, markdown)
  src/pages/ChatPage.css       (modified — cursor + .chat-markdown styles)
  package.json                 (modified — react-markdown, remark-gfm)

docker-compose.yml        (modified — env_file on backend)
```
