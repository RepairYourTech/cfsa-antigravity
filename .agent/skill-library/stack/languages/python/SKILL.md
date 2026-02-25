---
name: python
description: Python development patterns for modern, type-safe, production-grade code. Covers type hints (PEP 604+), dataclasses vs pydantic, async/await, virtual environments, pytest, packaging, and common pitfalls.
version: 1.0.0
---

# Python Development Patterns

Expert guidance for writing modern, type-safe, production-grade Python code. Covers typing, data modeling, async patterns, testing, packaging, and the most common pitfalls that trip up developers at every level.

## When to Use This Skill

- Starting a new Python project and need modern best practices
- Adding type hints to an existing codebase
- Choosing between dataclasses, pydantic, and attrs for data modeling
- Writing async code with asyncio
- Setting up pytest with fixtures and parameterization
- Packaging a library for distribution
- Debugging common Python gotchas (mutable defaults, GIL, import cycles)

## Core Concepts

### 1. Modern Type Hints (PEP 604+)

Python 3.10+ union syntax and modern typing patterns.

```python
# Modern union syntax (PEP 604) -- use this, not Union[]
def process(value: str | int | None) -> str:
    if value is None:
        return "empty"
    return str(value)

# Built-in generics (PEP 585) -- use this, not typing.List etc.
def filter_items(items: list[str], predicate: Callable[[str], bool]) -> list[str]:
    return [item for item in items if predicate(item)]

# TypeVar for generic functions
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T | None:
    return items[0] if items else None

# ParamSpec for decorator typing (PEP 612)
from typing import ParamSpec, TypeVar
from functools import wraps

P = ParamSpec("P")
R = TypeVar("R")

def retry(attempts: int = 3) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for i in range(attempts):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == attempts - 1:
                        raise
            raise RuntimeError("unreachable")
        return wrapper
    return decorator

# TypedDict for structured dictionaries
from typing import TypedDict, NotRequired

class UserConfig(TypedDict):
    name: str
    email: str
    theme: NotRequired[str]  # Optional key

# Literal types for constrained values
from typing import Literal

def set_log_level(level: Literal["debug", "info", "warning", "error"]) -> None:
    ...

# Self type (PEP 673, Python 3.11+)
from typing import Self

class Builder:
    def with_name(self, name: str) -> Self:
        self._name = name
        return self
```

### 2. Dataclasses vs Pydantic vs Attrs

Choose the right data modeling tool for your context.

```python
# --- dataclasses: stdlib, no dependencies, compile-time typing only ---
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class Point:
    x: float
    y: float
    label: str = "origin"

    def distance_to(self, other: "Point") -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5

# Use frozen=True for immutability
# Use slots=True for memory efficiency and faster attribute access

# --- pydantic: runtime validation, serialization, settings ---
from pydantic import BaseModel, Field, field_validator

class User(BaseModel):
    model_config = {"strict": True}

    name: str = Field(min_length=1, max_length=100)
    email: str
    age: int = Field(ge=13, le=150)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("invalid email format")
        return v.lower()

# Pydantic v2 uses model_config instead of class Config
# Use strict=True to prevent type coercion

# --- attrs: flexible, fast, no runtime validation by default ---
import attrs

@attrs.define(frozen=True)
class Config:
    host: str
    port: int = attrs.field(validator=attrs.validators.instance_of(int))
    debug: bool = False
```

**Decision matrix:**

| Need | Use |
|------|-----|
| Simple data container, no validation | `dataclass` |
| Runtime validation, API boundaries | `pydantic` |
| Complex validation, high performance | `attrs` |
| Config from env/files | `pydantic-settings` |
| Database ORM | `SQLAlchemy` or `pydantic` |

### 3. Async/Await with asyncio

```python
import asyncio
from typing import AsyncIterator

# Basic async function
async def fetch_data(url: str) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            return await response.json()

# Gather for concurrent execution
async def fetch_all(urls: list[str]) -> list[dict]:
    return await asyncio.gather(*(fetch_data(url) for url in urls))

# TaskGroup (Python 3.11+) -- preferred over gather
async def fetch_all_safe(urls: list[str]) -> list[dict]:
    results: list[dict] = []
    async with asyncio.TaskGroup() as tg:
        for url in urls:
            tg.create_task(fetch_and_append(url, results))
    return results

# Async generators
async def stream_lines(path: str) -> AsyncIterator[str]:
    async with aiofiles.open(path, "r") as f:
        async for line in f:
            yield line.strip()

# Semaphore for rate limiting
async def rate_limited_fetch(urls: list[str], max_concurrent: int = 10) -> list[dict]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(url: str) -> dict:
        async with semaphore:
            return await fetch_data(url)

    return await asyncio.gather(*(bounded_fetch(url) for url in urls))

# Timeout handling
async def fetch_with_timeout(url: str, timeout_seconds: float = 5.0) -> dict:
    async with asyncio.timeout(timeout_seconds):  # Python 3.11+
        return await fetch_data(url)
```

**Anti-pattern: mixing sync and async incorrectly.**

```python
# WRONG -- blocks the event loop
async def bad_example():
    import requests  # sync library in async context!
    return requests.get("https://example.com")

# RIGHT -- use async libraries
async def good_example():
    async with aiohttp.ClientSession() as session:
        async with session.get("https://example.com") as resp:
            return await resp.text()

# If you MUST call sync code from async:
async def call_sync_from_async():
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, sync_heavy_function)
    return result
```

### 4. Virtual Environments

```bash
# venv (stdlib) -- always works, no extra tools
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# uv (fast, modern) -- recommended for speed
uv venv
uv pip install -r requirements.txt
uv pip compile requirements.in -o requirements.txt

# poetry -- dependency resolution + packaging
poetry init
poetry add requests
poetry install
poetry build

# pip-tools -- lightweight lockfile approach
pip-compile requirements.in       # Generate lockfile
pip-sync requirements.txt         # Install exact versions
```

**Decision matrix:**

| Need | Use |
|------|-----|
| Quick scripts, CI | `uv` or `venv + pip` |
| Library packaging | `poetry` or `hatch` |
| Reproducible deployments | `uv pip compile` or `pip-tools` |
| Data science | `conda` or `mamba` |

### 5. Testing with pytest

```python
import pytest
from unittest.mock import AsyncMock, patch

# Basic test with descriptive naming
def test_user_creation_requires_valid_email():
    with pytest.raises(ValueError, match="invalid email"):
        User(name="test", email="not-an-email", age=25)

# Fixtures for shared setup
@pytest.fixture
def sample_user() -> User:
    return User(name="Alice", email="alice@example.com", age=30)

@pytest.fixture
async def db_session() -> AsyncIterator[Session]:
    session = await create_session()
    yield session
    await session.rollback()
    await session.close()

# Parametrize for table-driven tests
@pytest.mark.parametrize(
    "input_age, expected_valid",
    [
        (12, False),   # Under minimum
        (13, True),    # Minimum boundary
        (17, True),    # Junior upper bound
        (18, True),    # Adult boundary
        (150, True),   # Maximum boundary
        (151, False),  # Over maximum
    ],
    ids=["under-min", "min-boundary", "junior-upper", "adult-boundary", "max", "over-max"],
)
def test_age_validation(input_age: int, expected_valid: bool):
    if expected_valid:
        user = User(name="Test", email="t@t.com", age=input_age)
        assert user.age == input_age
    else:
        with pytest.raises(ValueError):
            User(name="Test", email="t@t.com", age=input_age)

# Async test
@pytest.mark.asyncio
async def test_fetch_returns_data():
    result = await fetch_data("https://api.example.com/data")
    assert "id" in result

# Mocking external services
async def test_fetch_handles_timeout():
    with patch("module.aiohttp.ClientSession") as mock_session:
        mock_session.return_value.__aenter__.return_value.get = AsyncMock(
            side_effect=asyncio.TimeoutError()
        )
        with pytest.raises(asyncio.TimeoutError):
            await fetch_data("https://slow.example.com")

# conftest.py for shared fixtures
# Place in tests/conftest.py -- pytest discovers it automatically
```

### 6. F-Strings and String Formatting

```python
# f-strings -- always preferred for interpolation
name = "world"
greeting = f"Hello, {name}!"

# Expressions inside f-strings
items = [1, 2, 3]
summary = f"Count: {len(items)}, Sum: {sum(items)}"

# Format specifiers
price = 49.99
formatted = f"Price: ${price:.2f}"
percentage = f"Rate: {0.156:.1%}"  # "Rate: 15.6%"

# Debug format (Python 3.8+)
x = 42
print(f"{x = }")  # prints "x = 42"

# Multiline f-strings
query = (
    f"SELECT * FROM users "
    f"WHERE age >= {min_age} "
    f"AND status = '{status}'"
)

# NEVER use f-strings for SQL -- use parameterized queries!
# This is for illustration only. See anti-patterns below.
```

### 7. Context Managers

```python
from contextlib import contextmanager, asynccontextmanager
from typing import Iterator, AsyncIterator

# Class-based context manager
class DatabaseConnection:
    def __init__(self, url: str) -> None:
        self.url = url
        self._conn: Connection | None = None

    def __enter__(self) -> Connection:
        self._conn = connect(self.url)
        return self._conn

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> bool:
        if self._conn:
            if exc_type:
                self._conn.rollback()
            else:
                self._conn.commit()
            self._conn.close()
        return False  # Do not suppress exceptions

# Generator-based context manager (simpler)
@contextmanager
def temp_directory() -> Iterator[Path]:
    path = Path(tempfile.mkdtemp())
    try:
        yield path
    finally:
        shutil.rmtree(path)

# Async context manager
@asynccontextmanager
async def managed_session() -> AsyncIterator[Session]:
    session = await create_session()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
```

### 8. Decorators

```python
from functools import wraps
import time
from typing import Callable, TypeVar, ParamSpec

P = ParamSpec("P")
R = TypeVar("R")

# Simple decorator with wraps
def log_calls(func: Callable[P, R]) -> Callable[P, R]:
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"Calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"{func.__name__} returned {result!r}")
        return result
    return wrapper

# Decorator with arguments
def rate_limit(max_calls: int, period: float) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        calls: list[float] = []

        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            now = time.monotonic()
            calls[:] = [t for t in calls if now - t < period]
            if len(calls) >= max_calls:
                raise RuntimeError(f"Rate limit exceeded: {max_calls} calls per {period}s")
            calls.append(now)
            return func(*args, **kwargs)
        return wrapper
    return decorator

@rate_limit(max_calls=5, period=60.0)
def api_call(endpoint: str) -> dict:
    ...

# Class decorator
def singleton(cls: type[T]) -> type[T]:
    instances: dict[type, T] = {}
    original_new = cls.__new__

    @wraps(cls.__new__)
    def new_instance(klass: type[T], *args, **kwargs) -> T:
        if klass not in instances:
            instances[klass] = original_new(klass)
        return instances[klass]

    cls.__new__ = new_instance  # type: ignore[assignment]
    return cls
```

### 9. Generators and Iterators

```python
from typing import Generator, Iterator

# Generator function
def fibonacci() -> Generator[int, None, None]:
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# Use itertools for composition
from itertools import islice, chain, groupby

first_10_fib = list(islice(fibonacci(), 10))

# Generator expression (lazy evaluation)
squares = (x ** 2 for x in range(1_000_000))  # No memory allocation

# Generator for processing large files
def read_large_file(path: str, chunk_size: int = 8192) -> Generator[str, None, None]:
    with open(path, "r") as f:
        while chunk := f.read(chunk_size):
            yield chunk

# Send values into generators
def running_average() -> Generator[float, float, None]:
    total = 0.0
    count = 0
    while True:
        value = yield total / count if count else 0.0
        total += value
        count += 1

avg = running_average()
next(avg)  # Prime the generator
avg.send(10.0)  # 10.0
avg.send(20.0)  # 15.0
```

### 10. pathlib Over os.path

```python
from pathlib import Path

# Path construction
config_dir = Path.home() / ".config" / "myapp"
config_file = config_dir / "settings.json"

# Common operations
config_dir.mkdir(parents=True, exist_ok=True)

if config_file.exists():
    data = config_file.read_text(encoding="utf-8")
    config = json.loads(data)

# Glob patterns
for py_file in Path("src").rglob("*.py"):
    print(py_file.stem)  # filename without extension

# File info
size = config_file.stat().st_size
suffix = config_file.suffix  # ".json"
parent = config_file.parent  # Path to directory

# Path manipulation
relative = config_file.relative_to(Path.home())
resolved = config_file.resolve()  # Absolute, symlinks resolved

# Writing files
output = Path("output.txt")
output.write_text("Hello, world!", encoding="utf-8")
output.write_bytes(b"\x00\x01\x02")
```

## Common Pitfalls

### Mutable Default Arguments

```python
# WRONG -- list is shared across all calls
def append_to(item: str, target: list[str] = []) -> list[str]:
    target.append(item)
    return target

# RIGHT -- use None sentinel
def append_to(item: str, target: list[str] | None = None) -> list[str]:
    if target is None:
        target = []
    target.append(item)
    return target
```

### Late Binding Closures

```python
# WRONG -- all lambdas capture the final value of i
funcs = [lambda: i for i in range(5)]
[f() for f in funcs]  # [4, 4, 4, 4, 4]

# RIGHT -- bind i as default argument
funcs = [lambda i=i: i for i in range(5)]
[f() for f in funcs]  # [0, 1, 2, 3, 4]
```

### The GIL (Global Interpreter Lock)

```python
# CPU-bound work: use multiprocessing, NOT threading
from concurrent.futures import ProcessPoolExecutor

def cpu_heavy(n: int) -> int:
    return sum(i * i for i in range(n))

with ProcessPoolExecutor() as executor:
    results = list(executor.map(cpu_heavy, [10**6] * 4))

# I/O-bound work: threading or asyncio is fine
from concurrent.futures import ThreadPoolExecutor

def io_bound(url: str) -> str:
    return requests.get(url).text

with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(io_bound, urls))
```

### Import Cycles

```python
# WRONG -- circular import at module level
# file_a.py
from file_b import B  # file_b tries to import from file_a

# RIGHT -- defer import or use TYPE_CHECKING
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from file_b import B

def process(b: "B") -> None:
    ...
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| `except Exception: pass` | Silences all errors | Catch specific exceptions, log, re-raise |
| `from module import *` | Pollutes namespace, hides dependencies | Import specific names |
| `isinstance(x, str)` chains | Violates open/closed principle | Use `match` statement or polymorphism |
| `os.path.join(a, b)` | Verbose, stringly typed | Use `Path(a) / b` |
| `global` keyword | Hidden state, untestable | Pass state explicitly or use classes |
| Bare `assert` in production | Stripped with `-O` flag | Use `if not x: raise ValueError(...)` |
| `eval()` / `exec()` | Code injection vector | Never use with user input |
| String formatting for SQL | SQL injection | Use parameterized queries |

## Project Structure

```
my-project/
  src/
    my_package/
      __init__.py
      core.py
      models.py
      utils.py
  tests/
    conftest.py
    test_core.py
    test_models.py
  pyproject.toml
  README.md
```

### pyproject.toml (Modern Standard)

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-package"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.0",
    "aiohttp>=3.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "mypy>=1.8",
    "ruff>=0.2",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.mypy]
strict = true
python_version = "3.11"

[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM", "TCH"]
```

## Resources

- **Python Typing Docs**: https://docs.python.org/3/library/typing.html
- **PEP 604 (Union X | Y)**: https://peps.python.org/pep-0604/
- **Pydantic v2 Docs**: https://docs.pydantic.dev/latest/
- **pytest Docs**: https://docs.pytest.org/
- **Real Python**: https://realpython.com/
- **mypy Docs**: https://mypy.readthedocs.io/
- **Ruff Linter**: https://docs.astral.sh/ruff/
