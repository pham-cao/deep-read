# Google OAuth2 — Best Practice Lưu Trữ User ở Backend

> **Phạm vi:** Tài liệu này áp dụng cho hệ thống chỉ dùng **Google OAuth2** làm provider xác thực duy nhất.

---

## 1. Thiết kế Database

### Bảng `users` — Thông tin cơ bản

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  display_name  VARCHAR(255),
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

> **Lưu ý:** Không có cột `password_hash` — đây là user SSO thuần, không hỗ trợ đăng nhập bằng mật khẩu.

---

### Bảng `google_accounts` — Thông tin từ Google

```sql
CREATE TABLE google_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_id        VARCHAR(255) UNIQUE NOT NULL,  -- "sub" từ Google id_token
  email            VARCHAR(255) NOT NULL,          -- email Google (lưu để audit)
  refresh_token    TEXT,                           -- encrypt trước khi lưu (chỉ cần nếu gọi Google API)
  token_expires_at TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

> **Tại sao tách bảng?** Tách `google_accounts` khỏi `users` giúp dễ dàng mở rộng sau này (thêm provider mới, revoke Google riêng lẻ mà không ảnh hưởng account chính).

---

### Bảng `user_sessions` — Quản lý phiên đăng nhập

```sql
CREATE TABLE user_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 của refresh token hệ thống
  ip_address   INET,
  user_agent   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

> Bỏ qua bảng này nếu dùng **stateless JWT** — chỉ cần blacklist token khi logout.

---

## 2. Thông tin lấy từ Google và cách xử lý

Khi Google trả về `id_token`, payload có dạng:

```json
{
  "sub": "1234567890",
  "email": "user@gmail.com",
  "email_verified": true,
  "name": "Nguyen Van A",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

| Field Google | Lưu vào đâu | Ghi chú |
|---|---|---|
| `sub` | `google_accounts.google_id` | **Định danh bất biến**, không bao giờ thay đổi |
| `email` | `users.email` + `google_accounts.email` | Verify `email_verified: true` trước khi lưu |
| `name` | `users.display_name` | Sync lại mỗi lần login |
| `picture` | `users.avatar_url` | Sync lại mỗi lần login |
| `email_verified` | Không lưu | Chỉ dùng để validate, từ chối nếu `false` |
| `iss`, `aud`, `exp`, `iat` | Không lưu | Chỉ dùng để verify token, không cần persist |

---

## 3. Có nên lưu Access Token / Refresh Token của Google không?

| Tình huống | Quyết định | Lý do |
|---|---|---|
| Chỉ dùng Google để **đăng nhập** | ❌ Không cần lưu | `google_id` là đủ để định danh |
| Cần gọi **Google API** (Gmail, Drive, Calendar...) | ✅ Lưu `refresh_token` | Phải encrypt bằng AES-256 trước khi lưu |

---

## 4. Luồng xử lý Callback từ Google

```
Google redirect → /auth/google/callback?code=xxx
        │
        ▼
Exchange code → access_token + id_token
        │
        ▼
Verify id_token (chữ ký, iss, aud, exp)
Lấy payload: sub, email, email_verified, name, picture
        │
        ├── email_verified === false → Từ chối, trả về lỗi
        │
        ▼
Tìm google_accounts WHERE google_id = sub
        │
   Tìm thấy ──────────────────────────────────────────────┐
        │                                                  │
   Không thấy                                         UPDATE:
        │                                               - last_login_at = NOW()
        ▼                                               - display_name (sync)
Tìm users WHERE email = email từ Google                - avatar_url (sync)
        │                                                  │
   Có user ──► INSERT google_accounts, link vào user cũ   │
        │                                                  │
   Không có ──► INSERT users mới + INSERT google_accounts │
        │                                                  │
        └──────────────────────────────────────────────────┘
        │
        ▼
Tạo JWT nội bộ (access_token ngắn hạn + refresh_token dài hạn)
Lưu hash(refresh_token) vào user_sessions
Trả về token cho client
```

---

## 5. Các điểm bảo mật quan trọng

### 5.1 Bắt buộc kiểm tra `email_verified`

```typescript
if (!payload.email_verified) {
  throw new Error('Email chưa được xác minh bởi Google');
}
```

### 5.2 Encrypt token Google trước khi lưu

```typescript
// Dùng AES-256-GCM
import { createCipheriv, randomBytes } from 'crypto';

function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}
```

### 5.3 Chỉ lưu hash của session token

```typescript
import { createHash } from 'crypto';

// Lưu vào DB
const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

// KHÔNG lưu refreshToken gốc vào DB
await db.userSessions.create({ token_hash: tokenHash, ... });
```

### 5.4 Xử lý Account Linking an toàn

Khi `email` từ Google đã tồn tại trong `users` nhưng chưa có `google_accounts`:

- **Tự động link** nếu hệ thống chỉ có Google OAuth (không có local login).
- **Yêu cầu xác nhận** nếu hệ thống hybrid (có cả local login) để tránh account takeover.

---

## 6. Tóm tắt — Sơ đồ quan hệ

```
users
├── id (PK)
├── email (UNIQUE)
├── display_name
├── avatar_url
└── is_active

        │ 1
        │
        ▼ N
google_accounts
├── id (PK)
├── user_id (FK → users.id)
├── google_id (UNIQUE)  ← "sub" từ Google
├── email
├── refresh_token (encrypted, nullable)
└── last_login_at

        │ 1
        │
        ▼ N
user_sessions
├── id (PK)
├── user_id (FK → users.id)
├── token_hash (SHA-256)
└── expires_at
```

---

## 7. Checklist triển khai

- [ ] Verify `email_verified: true` trước khi xử lý
- [ ] Dùng `google_id` (sub) làm định danh, không dùng email
- [ ] Encrypt `refresh_token` Google nếu có lưu
- [ ] Lưu `hash(token)` trong session, không lưu token gốc
- [ ] Sync `display_name` và `avatar_url` mỗi lần login
- [ ] Xử lý edge case: email đã tồn tại nhưng chưa có google_accounts
- [ ] Revoke session khi user đăng xuất
- [ ] Đặt TTL hợp lý cho JWT nội bộ (access: 15 phút, refresh: 7–30 ngày)
