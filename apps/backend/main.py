import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import psycopg2
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field, field_validator
from psycopg2 import errors as pg_errors
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


def read_env_value(key: str) -> str | None:
    try:
        with open(".env", mode="r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return None


def get_postgres_password() -> str | None:
    return read_env_value("POSTGRES_PASSWORD")


def get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET") or read_env_value("JWT_SECRET")
    if not secret:
        raise RuntimeError(
            "🛑 JWT_SECRET is not set. Define it in the environment or in .env next to main.py."
        )
    return secret


def _digest_bytes(digest_hex: str) -> bytes:
    """64-char SHA-256 hex encodes to 64 bytes (always under bcrypt's 72-byte input limit)."""
    return digest_hex.encode("utf-8")


def hash_password_digest(digest_hex: str) -> str:
    return bcrypt.hashpw(_digest_bytes(digest_hex), bcrypt.gensalt()).decode("utf-8")


def verify_password_digest(digest_hex: str, stored_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            _digest_bytes(digest_hex),
            stored_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


# Bcrypt compare when the user row is missing (timing - reduces email-enumeration signal).
_DUMMY_VERIFIER_HASH = bcrypt.hashpw(b"0" * 64, bcrypt.gensalt()).decode("utf-8")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(days=7)

password_db = get_postgres_password()
if not password_db:
    print("🛑 .env file not defined or POSTGRES_PASSWORD missing!")

connection = psycopg2.connect(
    database="textmessenger_db",
    user="app_user",
    password=password_db,
    host="localhost",
    port=5432,
)

jwt_secret = get_jwt_secret()


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    to_encode: dict = {"sub": subject}
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta is not None else ACCESS_TOKEN_EXPIRE
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, jwt_secret, algorithm=JWT_ALGORITHM)


app = FastAPI()

# Auth contract: clients send SHA-256 (UTF-8 password) as lowercase hex (64 chars). We bcrypt that digest.
# Confidentiality and replay protection for that digest require HTTPS in production—set ENFORCE_TLS=1
# and terminate TLS (uvicorn SSL, or reverse proxy with X-Forwarded-Proto: https).

DEV_ORIGINS = [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _enforce_tls_enabled() -> bool:
    return os.environ.get("ENFORCE_TLS") == "1" or read_env_value("ENFORCE_TLS") == "1"


class RequireTlsMiddleware(BaseHTTPMiddleware):
    """Reject requests when ENFORCE_TLS=1 unless the request is HTTPS (or X-Forwarded-Proto: https)."""

    async def dispatch(self, request: Request, call_next):
        if not _enforce_tls_enabled():
            return await call_next(request)
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        if proto != "https":
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "HTTPS is required. Terminate TLS at the proxy or run uvicorn with SSL_CERTFILE/SSL_KEYFILE."
                },
            )
        return await call_next(request)


app.add_middleware(RequireTlsMiddleware)


def _sha256_hex_digest(value: str) -> str:
    stripped = value.strip().lower()
    if len(stripped) != 64 or any(c not in "0123456789abcdef" for c in stripped):
        raise ValueError("password_digest must be SHA-256 of UTF-8 password as 64 lowercase hex characters")
    return stripped


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=1, max_length=255)
    password_digest: str = Field(
        min_length=64,
        max_length=64,
        description="SHA-256 digest of the user's UTF-8 password, lowercase hexadecimal (64 characters).",
    )

    @field_validator("password_digest")
    @classmethod
    def password_digest_hex(cls, v: str) -> str:
        return _sha256_hex_digest(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password_digest: str = Field(
        min_length=64,
        max_length=64,
        description="SHA-256 digest of the user's UTF-8 password, lowercase hexadecimal (64 characters).",
    )

    @field_validator("password_digest")
    @classmethod
    def password_digest_hex(cls, v: str) -> str:
        return _sha256_hex_digest(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    profile_id: str


class ProfileResponse(BaseModel):
    id: str
    account_id: str
    username: str
    display_name: str | None
    bio: str | None


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    bio: str | None = None


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_label: str
    content: str
    created_at: str


class ChatListItemResponse(BaseModel):
    id: str
    is_group: bool
    name: str
    last_message: str | None
    last_message_at: str | None


class ChatDetailResponse(BaseModel):
    id: str
    is_group: bool
    name: str
    messages: list[MessageResponse]


class CreateChatRequest(BaseModel):
    usernames: list[str] = Field(min_length=1, max_length=50)


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


def get_bearer_token(authorization: Annotated[str | None, Header()] = None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return authorization[7:]


def get_account_id(token: Annotated[str, Depends(get_bearer_token)]) -> str:
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(sub)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token") from None


def get_profile_id(account_id: str) -> str:
    cur = connection.cursor()
    try:
        cur.execute(
            "SELECT id FROM profiles WHERE account_id = %s",
            (account_id,),
        )
        row = cur.fetchone()
    finally:
        cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return str(row[0])


def profile_label(display_name: str | None, username: str) -> str:
    return display_name if display_name else username


def _iso(dt) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def build_chat_name(cur, chat_id: str, my_profile_id: str, is_group: bool) -> str:
    cur.execute(
        """
        SELECT p.display_name, a.username
        FROM chat_participants cp
        JOIN profiles p ON p.id = cp.profile_id
        JOIN accounts a ON a.id = p.account_id
        WHERE cp.chat_id = %s AND cp.profile_id != %s
        ORDER BY COALESCE(p.display_name, a.username)
        """,
        (chat_id, my_profile_id),
    )
    rows = cur.fetchall()
    labels = [profile_label(r[0], r[1]) for r in rows]
    if not is_group:
        return labels[0] if labels else "Unknown"
    return ", ".join(labels)


def assert_chat_member(cur, chat_id: str, profile_id: str) -> None:
    cur.execute(
        """
        SELECT 1 FROM chat_participants
        WHERE chat_id = %s AND profile_id = %s
        """,
        (chat_id, profile_id),
    )
    if not cur.fetchone():
        raise HTTPException(status_code=403, detail="Not a participant in this chat")


def find_existing_dm(cur, my_profile_id: str, other_profile_id: str) -> str | None:
    cur.execute(
        """
        SELECT c.id
        FROM chats c
        WHERE c.is_group = false
          AND EXISTS (
              SELECT 1 FROM chat_participants
              WHERE chat_id = c.id AND profile_id = %s
          )
          AND EXISTS (
              SELECT 1 FROM chat_participants
              WHERE chat_id = c.id AND profile_id = %s
          )
          AND (SELECT COUNT(*)::int FROM chat_participants WHERE chat_id = c.id) = 2
        LIMIT 1
        """,
        (my_profile_id, other_profile_id),
    )
    row = cur.fetchone()
    return str(row[0]) if row else None


def row_to_message(row) -> MessageResponse:
    return MessageResponse(
        id=str(row[0]),
        sender_id=str(row[1]),
        sender_label=row[2],
        content=row[3],
        created_at=_iso(row[4]),
    )


def load_chat_messages(cur, chat_id: str) -> list[MessageResponse]:
    cur.execute(
        """
        SELECT m.id, m.sender_id,
               COALESCE(p.display_name, a.username) AS sender_label,
               m.content, m.created_at
        FROM messages m
        JOIN profiles p ON p.id = m.sender_id
        JOIN accounts a ON a.id = p.account_id
        WHERE m.chat_id = %s
        ORDER BY m.created_at ASC
        """,
        (chat_id,),
    )
    return [row_to_message(r) for r in cur.fetchall()]


def chat_detail_response(cur, chat_id: str, my_profile_id: str) -> ChatDetailResponse:
    cur.execute(
        "SELECT is_group FROM chats WHERE id = %s",
        (chat_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Chat not found")
    is_group = row[0]
    return ChatDetailResponse(
        id=chat_id,
        is_group=is_group,
        name=build_chat_name(cur, chat_id, my_profile_id, is_group),
        messages=load_chat_messages(cur, chat_id),
    )


def resolve_usernames(cur, usernames: list[str], my_profile_id: str) -> list[str]:
    stripped = [u.strip() for u in usernames]
    if any(not u for u in stripped):
        raise HTTPException(status_code=400, detail="Usernames cannot be empty")
    if len(stripped) != len(set(stripped)):
        raise HTTPException(status_code=400, detail="Duplicate usernames")
    profile_ids: list[str] = []
    for username in stripped:
        cur.execute(
            """
            SELECT p.id
            FROM accounts a
            JOIN profiles p ON p.account_id = a.id
            WHERE a.username = %s
            """,
            (username,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"User not found: {username}")
        pid = str(row[0])
        if pid == my_profile_id:
            raise HTTPException(status_code=400, detail="Cannot include yourself")
        profile_ids.append(pid)
    return profile_ids


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/auth/register", response_model=TokenResponse)
def register(body: RegisterRequest):
    password_hash = hash_password_digest(body.password_digest)
    username = body.username.strip()
    cur = connection.cursor()
    try:
        cur.execute(
            """
            INSERT INTO accounts (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (username, str(body.email).lower(), password_hash),
        )
        account_row = cur.fetchone()
        account_id = account_row[0]
        cur.execute(
            """
            INSERT INTO profiles (account_id, display_name)
            VALUES (%s, %s)
            RETURNING id
            """,
            (account_id, username),
        )
        profile_row = cur.fetchone()
        connection.commit()
    except pg_errors.UniqueViolation as e:
        connection.rollback()
        detail = "Email or username already registered"
        if e.diag and e.diag.constraint_name:
            if "username" in (e.diag.constraint_name or "").lower():
                detail = "Username already taken"
            elif "email" in (e.diag.constraint_name or "").lower():
                detail = "Email already registered"
        raise HTTPException(status_code=409, detail=detail)
    except Exception:
        connection.rollback()
        raise
    finally:
        cur.close()

    account_id_str = str(account_id)
    profile_id_str = str(profile_row[0])
    token = create_access_token(account_id_str)
    return TokenResponse(
        access_token=token,
        user_id=account_id_str,
        profile_id=profile_id_str,
    )


@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    cur = connection.cursor()
    try:
        cur.execute(
            """
            SELECT a.id, a.password_hash, p.id
            FROM accounts a
            JOIN profiles p ON p.account_id = a.id
            WHERE a.email = %s
            """,
            (str(body.email).lower(),),
        )
        row = cur.fetchone()
    finally:
        cur.close()

    if not row:
        verify_password_digest(body.password_digest, _DUMMY_VERIFIER_HASH)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    account_id_db, stored_hash, profile_id_db = row
    if not verify_password_digest(body.password_digest, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    account_id = str(account_id_db)
    profile_id = str(profile_id_db)
    token = create_access_token(account_id)
    return TokenResponse(
        access_token=token,
        user_id=account_id,
        profile_id=profile_id,
    )


@app.get("/m", response_model=list[ChatListItemResponse])
def list_chats(account_id: Annotated[str, Depends(get_account_id)]):
    profile_id = get_profile_id(account_id)
    cur = connection.cursor()
    try:
        cur.execute(
            """
            SELECT c.id, c.is_group, lm.content, lm.created_at
            FROM chats c
            INNER JOIN chat_participants cp ON cp.chat_id = c.id AND cp.profile_id = %s
            LEFT JOIN LATERAL (
                SELECT content, created_at
                FROM messages
                WHERE chat_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) lm ON true
            ORDER BY COALESCE(lm.created_at, c.created_at) DESC
            """,
            (profile_id,),
        )
        rows = cur.fetchall()
        result: list[ChatListItemResponse] = []
        for row in rows:
            chat_id = str(row[0])
            is_group = row[1]
            result.append(
                ChatListItemResponse(
                    id=chat_id,
                    is_group=is_group,
                    name=build_chat_name(cur, chat_id, profile_id, is_group),
                    last_message=row[2],
                    last_message_at=_iso(row[3]) if row[3] else None,
                )
            )
        return result
    finally:
        cur.close()


@app.get("/m/{chat_id}", response_model=ChatDetailResponse)
def get_chat(
    chat_id: str,
    account_id: Annotated[str, Depends(get_account_id)],
):
    profile_id = get_profile_id(account_id)
    cur = connection.cursor()
    try:
        assert_chat_member(cur, chat_id, profile_id)
        return chat_detail_response(cur, chat_id, profile_id)
    finally:
        cur.close()


@app.post("/m", response_model=ChatDetailResponse)
def create_chat(
    body: CreateChatRequest,
    account_id: Annotated[str, Depends(get_account_id)],
):
    profile_id = get_profile_id(account_id)
    cur = connection.cursor()
    try:
        other_ids = resolve_usernames(cur, body.usernames, profile_id)

        if len(other_ids) == 1:
            existing = find_existing_dm(cur, profile_id, other_ids[0])
            if existing:
                assert_chat_member(cur, existing, profile_id)
                return chat_detail_response(cur, existing, profile_id)

            cur.execute(
                "INSERT INTO chats (is_group) VALUES (false) RETURNING id",
            )
            chat_id = str(cur.fetchone()[0])
            for pid in (profile_id, other_ids[0]):
                cur.execute(
                    "INSERT INTO chat_participants (chat_id, profile_id) VALUES (%s, %s)",
                    (chat_id, pid),
                )
        else:
            cur.execute(
                "INSERT INTO chats (is_group) VALUES (true) RETURNING id",
            )
            chat_id = str(cur.fetchone()[0])
            all_participants = [profile_id, *other_ids]
            for pid in all_participants:
                cur.execute(
                    "INSERT INTO chat_participants (chat_id, profile_id) VALUES (%s, %s)",
                    (chat_id, pid),
                )

        connection.commit()
        return chat_detail_response(cur, chat_id, profile_id)
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        cur.close()


@app.post("/m/{chat_id}/messages", response_model=MessageResponse)
def send_message(
    chat_id: str,
    body: SendMessageRequest,
    account_id: Annotated[str, Depends(get_account_id)],
):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    profile_id = get_profile_id(account_id)
    cur = connection.cursor()
    try:
        assert_chat_member(cur, chat_id, profile_id)
        cur.execute(
            """
            INSERT INTO messages (chat_id, sender_id, content)
            VALUES (%s, %s, %s)
            RETURNING id, created_at
            """,
            (chat_id, profile_id, content),
        )
        msg_id, created_at = cur.fetchone()
        cur.execute(
            """
            SELECT COALESCE(p.display_name, a.username)
            FROM profiles p
            JOIN accounts a ON a.id = p.account_id
            WHERE p.id = %s
            """,
            (profile_id,),
        )
        sender_label = cur.fetchone()[0]
        connection.commit()
        return MessageResponse(
            id=str(msg_id),
            sender_id=profile_id,
            sender_label=sender_label,
            content=content,
            created_at=_iso(created_at),
        )
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        cur.close()


@app.delete("/m")
async def delete_message():
    raise NotImplementedError


@app.get("/u", response_model=ProfileResponse)
def get_profile(account_id: Annotated[str, Depends(get_account_id)]):
    cur = connection.cursor()
    try:
        cur.execute(
            """
            SELECT p.id, p.account_id, a.username, p.display_name, p.bio
            FROM profiles p
            JOIN accounts a ON a.id = p.account_id
            WHERE p.account_id = %s
            """,
            (account_id,),
        )
        row = cur.fetchone()
    finally:
        cur.close()

    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileResponse(
        id=str(row[0]),
        account_id=str(row[1]),
        username=row[2],
        display_name=row[3],
        bio=row[4],
    )


@app.post("/u")
async def create_user():
    raise NotImplementedError


@app.put("/u", response_model=ProfileResponse)
def update_profile(
    body: UpdateProfileRequest,
    account_id: Annotated[str, Depends(get_account_id)],
):
    display_name = body.display_name.strip() if body.display_name and body.display_name.strip() else None
    bio = body.bio
    if bio is not None and not bio.strip():
        bio = None

    cur = connection.cursor()
    try:
        cur.execute(
            """
            UPDATE profiles
            SET display_name = %s, bio = %s, updated_at = now()
            WHERE account_id = %s
            """,
            (display_name, bio, account_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        connection.commit()
        cur.execute(
            """
            SELECT p.id, p.account_id, a.username, p.display_name, p.bio
            FROM profiles p
            JOIN accounts a ON a.id = p.account_id
            WHERE p.account_id = %s
            """,
            (account_id,),
        )
        row = cur.fetchone()
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        cur.close()

    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileResponse(
        id=str(row[0]),
        account_id=str(row[1]),
        username=row[2],
        display_name=row[3],
        bio=row[4],
    )


@app.delete("/u", status_code=204)
def delete_account(account_id: Annotated[str, Depends(get_account_id)]):
    cur = connection.cursor()
    try:
        cur.execute(
            "DELETE FROM accounts WHERE id = %s",
            (account_id,),
        )
        if cur.rowcount == 0:
            connection.rollback()
            raise HTTPException(status_code=404, detail="Account not found")
        connection.commit()
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        cur.close()


if __name__ == "__main__":
    import uvicorn

    ssl_key = os.environ.get("SSL_KEYFILE") or read_env_value("SSL_KEYFILE")
    ssl_cert = os.environ.get("SSL_CERTFILE") or read_env_value("SSL_CERTFILE")
    kwargs: dict = {"app": app, "host": "127.0.0.1", "port": 8000}
    if ssl_key and ssl_cert:
        kwargs["ssl_keyfile"] = ssl_key
        kwargs["ssl_certfile"] = ssl_cert
    uvicorn.run(**kwargs)
