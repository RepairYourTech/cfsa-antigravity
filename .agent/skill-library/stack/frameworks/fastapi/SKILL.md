---
name: fastapi
description: Comprehensive FastAPI skill covering route definition, path/query/body parameters, Pydantic models, dependency injection, middleware, authentication (OAuth2, JWT), async endpoints, background tasks, WebSocket support, CORS, testing, OpenAPI generation, and deployment. Use when building Python APIs with FastAPI.
version: 1.0.0
---

# FastAPI

High-performance Python web framework for building APIs with automatic OpenAPI documentation, type validation via Pydantic, and native async support.

## Project Setup

### Installation

```bash
pip install fastapi uvicorn[standard] pydantic[email] python-multipart
# Or with all extras
pip install "fastapi[all]"
```

### Application Structure

```
project/
  app/
    __init__.py
    main.py              # FastAPI app instance, root router
    config.py            # Settings via pydantic-settings
    dependencies.py      # Shared dependencies
    models/              # Pydantic models (request/response)
      __init__.py
      user.py
    routers/             # Route modules
      __init__.py
      users.py
      items.py
    services/            # Business logic
      __init__.py
      user_service.py
    db/                  # Database layer
      __init__.py
      session.py
      models.py          # SQLAlchemy/ORM models
  tests/
    __init__.py
    conftest.py
    test_users.py
  requirements.txt
```

### Main Application

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import users, items
from app.db.session import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables, warm caches, etc.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: close connections, flush buffers
    await engine.dispose()

app = FastAPI(
    title="My API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(items.router, prefix="/api/items", tags=["items"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Pydantic Models

### Request and Response Models

```python
# app/models/user.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from uuid import UUID

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=50)

class UserUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=50)
    bio: str | None = Field(None, max_length=500)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str
    bio: str | None = None
    created_at: datetime

class UserList(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    per_page: int
```

### Model Validation

```python
from pydantic import BaseModel, field_validator, model_validator
from typing import Self

class OrderCreate(BaseModel):
    quantity: int = Field(gt=0, le=1000)
    price: float = Field(gt=0)
    discount: float = Field(ge=0, le=1, default=0)

    @field_validator("price")
    @classmethod
    def price_must_have_two_decimals(cls, v: float) -> float:
        if round(v, 2) != v:
            raise ValueError("Price must have at most 2 decimal places")
        return v

    @model_validator(mode="after")
    def check_total_positive(self) -> Self:
        total = self.quantity * self.price * (1 - self.discount)
        if total <= 0:
            raise ValueError("Order total must be positive")
        return self
```

## Route Definition

### Path, Query, and Body Parameters

```python
# app/routers/users.py
from fastapi import APIRouter, Query, Path, Body, HTTPException, status
from app.models.user import UserCreate, UserResponse, UserList, UserUpdate

router = APIRouter()

@router.get("/", response_model=UserList)
async def list_users(
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, description="Items per page"),
    search: str | None = Query(default=None, max_length=100),
):
    # Query parameters with validation and documentation
    offset = (page - 1) * per_page
    users = await user_service.list_users(offset=offset, limit=per_page, search=search)
    total = await user_service.count_users(search=search)
    return UserList(users=users, total=total, page=page, per_page=per_page)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID = Path(description="The user's unique identifier"),
):
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate):
    # Body parameter automatically parsed from JSON
    existing = await user_service.get_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    return await user_service.create_user(user_data)

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID = Path(),
    user_data: UserUpdate = Body(),
):
    updated = await user_service.update_user(user_id, user_data)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: UUID = Path()):
    deleted = await user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
```

### Response Models and Status Codes

```python
from fastapi.responses import JSONResponse

@router.post(
    "/",
    response_model=UserResponse,
    status_code=201,
    responses={
        409: {"description": "Email already exists"},
        422: {"description": "Validation error"},
    },
)
async def create_user(user_data: UserCreate):
    ...
```

## Dependency Injection

### Basic Dependencies

```python
# app/dependencies.py
from fastapi import Depends, Header, HTTPException
from app.db.session import AsyncSession, get_session

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_session() as session:
        yield session

async def get_api_key(x_api_key: str = Header()):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

# Use in routes
@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()
```

### Dependency Classes

```python
class Pagination:
    def __init__(
        self,
        page: int = Query(default=1, ge=1),
        per_page: int = Query(default=20, ge=1, le=100),
    ):
        self.offset = (page - 1) * per_page
        self.limit = per_page
        self.page = page
        self.per_page = per_page

@router.get("/items")
async def list_items(pagination: Pagination = Depends()):
    items = await service.list_items(offset=pagination.offset, limit=pagination.limit)
    return items
```

### Nested Dependencies

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await auth_service.verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    ...
```

## Authentication

### OAuth2 with JWT

```python
# app/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

SECRET_KEY = settings.jwt_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await user_service.get_user(user_id)
    if user is None:
        raise credentials_exception
    return user

# Token endpoint
@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await user_service.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}
```

## Middleware

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        response.headers["X-Process-Time"] = f"{duration:.4f}"
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration:.4f}s")
        return response

app.add_middleware(TimingMiddleware)
```

### Rate Limiting (with slowapi)

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    ...
```

## Background Tasks

```python
from fastapi import BackgroundTasks

async def send_welcome_email(email: str, name: str):
    # Long-running operation
    await email_service.send(to=email, template="welcome", context={"name": name})

@router.post("/users", status_code=201)
async def create_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
):
    user = await user_service.create_user(user_data)
    background_tasks.add_task(send_welcome_email, user.email, user.display_name)
    return user
```

## WebSocket Support

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def broadcast(self, message: dict):
        for ws in self.active_connections.values():
            await ws.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast({"user": user_id, "message": data})
    except WebSocketDisconnect:
        manager.disconnect(user_id)
```

## File Uploads

```python
from fastapi import UploadFile, File

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(description="File to upload"),
):
    if file.size and file.size > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="File too large")

    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=422, detail="Invalid file type")

    contents = await file.read()
    path = await storage_service.save(file.filename, contents)
    return {"path": path, "size": len(contents)}

@router.post("/upload-multiple")
async def upload_multiple(files: list[UploadFile] = File()):
    results = []
    for f in files:
        contents = await f.read()
        path = await storage_service.save(f.filename, contents)
        results.append({"filename": f.filename, "path": path})
    return results
```

## Error Handling

```python
from fastapi import Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    def __init__(self, status_code: int, detail: str, error_code: str):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "detail": exc.detail,
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "detail": "An unexpected error occurred"},
    )
```

## Testing

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def authenticated_client(client: AsyncClient):
    response = await client.post("/api/auth/token", data={
        "username": "test@example.com",
        "password": "testpassword",
    })
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client

# tests/test_users.py
import pytest
from httpx import AsyncClient

@pytest.mark.anyio
async def test_create_user(client: AsyncClient):
    response = await client.post("/api/users", json={
        "email": "new@example.com",
        "password": "securepass123",
        "display_name": "New User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert "id" in data
    assert "password" not in data  # never expose password

@pytest.mark.anyio
async def test_create_user_duplicate_email(client: AsyncClient):
    # First creation succeeds
    await client.post("/api/users", json={
        "email": "dup@example.com",
        "password": "securepass123",
        "display_name": "User 1",
    })
    # Second creation fails
    response = await client.post("/api/users", json={
        "email": "dup@example.com",
        "password": "securepass123",
        "display_name": "User 2",
    })
    assert response.status_code == 409

@pytest.mark.anyio
async def test_list_users_requires_auth(client: AsyncClient):
    response = await client.get("/api/users")
    assert response.status_code == 401

@pytest.mark.anyio
async def test_list_users(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/users?page=1&per_page=10")
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "total" in data
```

## Configuration with pydantic-settings

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    app_name: str = "My API"
    debug: bool = False
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    cors_origins: list[str] = ["http://localhost:3000"]
    redis_url: str = "redis://localhost:6379"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

## Deployment

### Uvicorn (Production)

```bash
# Direct
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# With Gunicorn (recommended for production)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/

EXPOSE 8000
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Using `def` for I/O-bound routes | Use `async def` for database calls, HTTP requests, file I/O |
| Putting business logic in route handlers | Extract to service layer, keep routes thin |
| Not using `response_model` | Always declare response models for automatic serialization and docs |
| Catching broad `Exception` in routes | Use specific exception types, let global handler catch the rest |
| Using `@app.on_event("startup")` | Use the `lifespan` context manager (on_event is deprecated) |
| Hardcoding secrets in source | Use pydantic-settings with `.env` files or environment variables |
| Returning dict instead of Pydantic model | Always use Pydantic models for type safety and validation |
| Not validating file uploads | Check size, content type, and filename before processing |
| Blocking the event loop with sync code | Use `run_in_executor` for CPU-bound work or sync libraries |
| Mutable default arguments in dependencies | Use `Depends()` or `Query(default=...)` instead of mutable defaults |
