import os
from datetime import datetime, timedelta, timezone

import bcrypt
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
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


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/auth/register", response_model=TokenResponse)
def register(body: RegisterRequest):
    password_hash = hash_password_digest(body.password_digest)
    cur = connection.cursor()
    try:
        cur.execute(
            """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (body.username.strip(), str(body.email).lower(), password_hash),
        )
        row = cur.fetchone()
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

    user_id = str(row[0])
    token = create_access_token(user_id)
    return TokenResponse(access_token=token, user_id=user_id)


@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    cur = connection.cursor()
    try:
        cur.execute(
            """
            SELECT id, password_hash FROM users WHERE email = %s
            """,
            (str(body.email).lower(),),
        )
        row = cur.fetchone()
    finally:
        cur.close()

    if not row:
        verify_password_digest(body.password_digest, _DUMMY_VERIFIER_HASH)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id_db, stored_hash = row
    if not verify_password_digest(body.password_digest, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user_id_db)
    token = create_access_token(user_id)
    return TokenResponse(access_token=token, user_id=user_id)


@app.get("/m")
async def get_messages():
    raise NotImplementedError


@app.post("/m")
async def create_chat():
    raise NotImplementedError


@app.put("/m")
async def create_message(id: int):
    raise NotImplementedError


@app.delete("/m")
async def delete_message(id: int):
    raise NotImplementedError


@app.get("/u")
async def get_profile():
    raise NotImplementedError


@app.post("/u")
async def create_user():
    raise NotImplementedError


@app.put("/u")
async def update_profile(id: int):
    raise NotImplementedError


@app.delete("/u")
async def delete_user(id: int):
    raise NotImplementedError


if __name__ == "__main__":
    import uvicorn

    ssl_key = os.environ.get("SSL_KEYFILE") or read_env_value("SSL_KEYFILE")
    ssl_cert = os.environ.get("SSL_CERTFILE") or read_env_value("SSL_CERTFILE")
    kwargs: dict = {"app": app, "host": "127.0.0.1", "port": 8000}
    if ssl_key and ssl_cert:
        kwargs["ssl_keyfile"] = ssl_key
        kwargs["ssl_certfile"] = ssl_cert
    uvicorn.run(**kwargs)
