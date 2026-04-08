# Deep-Read Login Flow

## Complete Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEEP-READ LOGIN FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                                 ┌──────────────┐
│   FRONTEND   │                                                 │   BACKEND    │
│ (React App)  │                                                 │  (FastAPI)   │
└──────────────┘                                                 └──────────────┘
       │                                                                │
       │  1. User clicks "Login with Google"                          │
       │─────────────────────────────────────────────────────────────>│
       │                                                                │
       │  2. Backend redirects to Google OAuth consent screen          │
       │<─────────────────────────────────────────────────────────────│
       │        Location: https://accounts.google.com/o/oauth2/...    │
       │                                                                │
       │  3. User authenticates with Google                           │
       │  (happens in browser, not between our servers)               │
       │                                                                │
       │  4. Google redirects back to backend callback with code      │
       │<──────────────────────────────────────────────────────────────│
       │        /auth/google/callback?code=...&scope=...              │
       │                                                                │
       │                                         ┌────────────┐       │
       │                                         │  GOOGLE    │       │
       │                                         │   OAuth    │       │
       │                                         │  Provider  │       │
       │                                         └────────────┘       │
       │                                               ^               │
       │                                               │               │
       │                                    5. Backend exchanges      │
       │                                       code for tokens        │
       │                                    6. Backend verifies       │
       │                                       tokens & gets user data│
       │                                               │               │
       │                         ┌─────────────────────┼──────────────┤
       │                         │                     │              │
       │                    ┌────▼──────┐        ┌─────▼────────────┐│
       │                    │ PostgreSQL │        │  UserManager     ││
       │                    │  Database  │        │  Service         ││
       │                    └────┬───────┘        │                  ││
       │                         │         7. Look up google_accounts││
       │                    ┌────▼───────┐        │    by google_id  ││
       │                    │ users tbl  │        │                  ││
       │                    │ google_accs│        │ 8. If exists:    ││
       │                    │ sessions   │        │    - Update      ││
       │                    └────────────┘        │      last_login  ││
       │                                          │    - Sync profile││
       │                                          │                  ││
       │                                          │ 9. If not exists:││
       │                                          │    - Create user ││
       │                                          │    - Link account││
       │                                          │                  ││
       │                                          │ 10. Create       ││
       │                                          │     session token││
       │                                          └──────────────────┘│
       │                                                │              │
       │  11. Backend creates JWT token                │              │
       │      Payload: {"sub": user.id, "exp": ...}    │              │
       │<─────────────────────────────────────────────┤              │
       │      Set-Cookie: token=...                    │              │
       │      Location: /chat                          │              │
       │                                                │              │
       │  12. JWT stored in httponly cookie            │              │
       │      (secure, not accessible from JS)         │              │
       │                                                │              │
       │  13. Redirect to /chat with authentication    │              │
       │      Cookie automatically sent on next request               │
       │                                                │              │
       │  14. Fetch /auth/me with cookie               │              │
       │─────────────────────────────────────────────>│              │
       │                                                │              │
       │      15. Backend verifies JWT from cookie    │              │
       │      16. Query users table for full profile   │              │
       │      17. Return user data                     │              │
       │<─────────────────────────────────────────────│              │
       │      {"id": "...", "email": "...", ...}       │              │
       │                                                │              │
       │  18. Frontend shows authenticated UI          │              │
       │      with user info                           │              │
       │                                                │              │
       │  ✅ LOGIN COMPLETE                            │              │
       │                                                │              │
```

---

## Step-by-Step Breakdown

### 1. **Frontend → Backend Login Redirect**
```
GET /auth/google/login
```
- User clicks "Login" button
- Frontend redirects to backend

### 2. **Backend → Google OAuth**
```
303 See Other
Location: https://accounts.google.com/o/oauth2/auth?
  client_id=...
  redirect_uri=http://localhost:8000/auth/google/callback
  scope=email+profile+openid
```
- FastAPI SSO library generates Google OAuth URL
- Backend redirects browser to Google

### 3. **User Authenticates with Google**
- User enters credentials on Google's servers
- Google verifies identity
- User grants permission to share email & profile

### 4. **Google → Backend Callback**
```
GET /auth/google/callback?code=...&scope=...
```
- Google redirects back to backend with authorization code
- `fastapi-sso` exchanges code for tokens

### 5. **Backend Processes Authentication**

**a) Verify with Google:**
```python
openid = await google_sso.verify_and_process(request)
# Returns OpenID object with:
# - id (google's "sub" claim)
# - email
# - first_name, last_name
# - picture (avatar URL)
```

**b) UserManager handles upsert logic:**
```python
user, refresh_token = await user_manager.login_or_create(openid)
```

**c) Database operations:**
- Look up `google_accounts` by `google_id`
- If exists: Update `last_login_at`, sync profile
- If not: Check `users` by email, link or create new

**d) Create JWT:**
```python
token = jwt.encode({
    "sub": str(user.id),  # User UUID
    "exp": expiration      # 1 day from now
}, SECRET_KEY, "HS256")
```

### 6. **Backend → Frontend Response**
```
302 Found
Location: http://localhost:5173/chat
Set-Cookie: token=eyJ...; HttpOnly; Secure; SameSite=Lax
```

- Minimal JWT payload (just user UUID + expiration)
- Full user profile stored in database
- Cookie marked `HttpOnly` (not accessible from JavaScript)
- `SameSite=Lax` prevents CSRF attacks

### 7. **Frontend → Protected Endpoint**
```
GET /auth/me
Cookie: token=eyJ...
```

Backend dependency:
```python
user = await get_current_user(token)
# 1. Extract JWT from cookie
# 2. Verify signature with SECRET_KEY
# 3. Get user_id from token payload
# 4. Query database for full User object
# 5. Return User ORM object
```

### 8. **Protected Endpoints Now Available**
```
GET  /auth/me        → Returns user info
POST /auth/logout    → Revokes session
```

---

## Security Measures

| Layer | Protection |
|-------|------------|
| **Email** | Verified by Google (email_verified flag) |
| **Token Storage** | HttpOnly cookie (not accessible from JS) |
| **Token Transmission** | Secure flag (HTTPS only in production) |
| **CSRF** | SameSite=Lax cookie attribute |
| **Token Signature** | HS256 with SECRET_KEY |
| **Token Payload** | Minimal (just user UUID + expiration) |
| **Session Tokens** | Hashed (SHA-256) in database |
| **Account Linking** | Safe upsert logic in UserManager |
| **Profile Sync** | Fetched from database on each request |

---

## Data Persisted in Database

After successful login:

**`users` table:**
```
id               | UUID
email            | user@gmail.com
display_name     | John Doe
avatar_url       | https://lh3.googleusercontent.com/...
is_active        | true
created_at       | 2026-04-08 10:00:00
updated_at       | 2026-04-08 10:00:00
```

**`google_accounts` table:**
```
id               | UUID
user_id          | (FK → users.id)
google_id        | 116984129058044359163
email            | user@gmail.com
last_login_at    | 2026-04-08 10:00:00
created_at       | 2026-04-08 10:00:00
```

**`user_sessions` table:**
```
id               | UUID
user_id          | (FK → users.id)
token_hash       | a1b2c3d4... (SHA-256)
ip_address       | NULL (can be captured)
user_agent       | NULL (can be captured)
expires_at       | 2026-04-15 10:00:00 (7 days)
created_at       | 2026-04-08 10:00:00
```

---

## Token Lifecycle

```
Login                                           Logout/Expiry
  ↓                                                  ↓
  └──────────────── JWT Token ────────────────────┘
     Valid for 1 day (24 hours)

After 24 hours:
  - JWT expires
  - Cookie becomes invalid
  - User must login again

On logout:
  - Cookie deleted from browser
  - Session record deleted from DB
  - Immediate logout (no waiting for expiry)
```

---

## Diagram: JWT vs Database Profile Sync

```
┌─────────────────────────────────────────────────┐
│           Each API Request Flow                 │
└─────────────────────────────────────────────────┘

Client Request:
  GET /auth/me
  Cookie: token=eyJ...

     ↓

FastAPI dependency (get_current_user):
  1. Extract JWT from cookie
  2. Verify signature
  3. Decode payload → {"sub": user_id}
  4. Query DB: SELECT * FROM users WHERE id = user_id
  
     ↓

Return fresh User object from database:
  - Always has latest profile info
  - Name, avatar synced on each login
  - Account status (is_active) checked
  - No stale data in JWT

     ↓

Endpoint receives User ORM object
  - Can safely use user.email, user.display_name, etc.
  - Data is always fresh (not cached in JWT)
```

---

## Environment Variables Used

```bash
GOOGLE_CLIENT_ID        # OAuth app ID from Google Cloud Console
GOOGLE_CLIENT_SECRET    # OAuth app secret
SECRET_KEY              # JWT signing key (must be kept secret)
FRONTEND_URL            # For CORS and redirects
BACKEND_URL             # For OAuth callback redirect_uri
DATABASE_URL            # PostgreSQL connection string
```
