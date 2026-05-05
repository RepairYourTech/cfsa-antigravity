---
name: go
description: Go development patterns for building reliable, scalable services. Covers error handling idioms, goroutines/channels, interfaces, context.Context, testing, go modules, HTTP handlers, middleware, and generics.
version: 1.0.0
---

# Go Development Patterns

Expert guidance for writing idiomatic, production-grade Go code. Covers error handling, concurrency with goroutines and channels, interface design, context propagation, table-driven tests, and the conventions that make Go codebases maintainable at scale.

## When to Use This Skill

- Building HTTP services, APIs, and microservices
- Writing CLI tools and system utilities
- Implementing concurrent data pipelines
- Creating libraries with clean, idiomatic APIs
- Building networked applications (gRPC, WebSocket, TCP)
- Developing cloud-native applications (Kubernetes operators, cloud functions)

## Core Concepts

### 1. Error Handling Idioms

Go uses explicit error returns instead of exceptions.

```go
// Basic error handling -- always check errors
func readFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("reading %s: %w", path, err)
    }
    return data, nil
}

// Wrapping errors with context (use %w for wrapping)
func loadConfig(path string) (*Config, error) {
    data, err := readFile(path)
    if err != nil {
        return nil, fmt.Errorf("loadConfig: %w", err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("loadConfig: parsing JSON: %w", err)
    }
    return &cfg, nil
}

// Custom error types
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s %q not found", e.Resource, e.ID)
}

// Checking error types with errors.Is and errors.As
func handleError(err error) {
    var notFound *NotFoundError
    if errors.As(err, &notFound) {
        // Handle not found specifically
        log.Printf("Not found: %s %s", notFound.Resource, notFound.ID)
        return
    }
    if errors.Is(err, os.ErrPermission) {
        log.Printf("Permission denied")
        return
    }
    // Generic error handling
    log.Printf("Unexpected error: %v", err)
}

// Sentinel errors for known conditions
var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrConflict     = errors.New("conflict")
)
```

**Rules:**

| Rule | Explanation |
|------|-------------|
| Always check `err != nil` | Never ignore returned errors |
| Wrap with `fmt.Errorf("context: %w", err)` | Add context while preserving the error chain |
| Use `errors.Is` for sentinel errors | Works through wrapped error chains |
| Use `errors.As` for typed errors | Extracts the specific error type |
| Return errors, do not panic | Panics are for programmer bugs, not runtime conditions |

### 2. Goroutines and Channels

```go
// Basic goroutine
func processItems(items []string) {
    var wg sync.WaitGroup
    for _, item := range items {
        wg.Add(1)
        go func(item string) {
            defer wg.Done()
            process(item)
        }(item)
    }
    wg.Wait()
}

// Channels for communication
func pipeline(input <-chan int) <-chan int {
    output := make(chan int)
    go func() {
        defer close(output)
        for v := range input {
            output <- v * 2
        }
    }()
    return output
}

// Fan-out, fan-in pattern
func fanOut(input <-chan int, workers int) []<-chan int {
    channels := make([]<-chan int, workers)
    for i := 0; i < workers; i++ {
        channels[i] = pipeline(input)
    }
    return channels
}

func fanIn(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    merged := make(chan int)

    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                merged <- v
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}

// Select for multiplexing channels
func withTimeout(ch <-chan string, timeout time.Duration) (string, error) {
    select {
    case msg := <-ch:
        return msg, nil
    case <-time.After(timeout):
        return "", fmt.Errorf("timed out after %v", timeout)
    }
}

// Buffered channels for rate limiting
func rateLimiter(requests <-chan Request, rps int) <-chan Request {
    throttled := make(chan Request, rps)
    ticker := time.NewTicker(time.Second / time.Duration(rps))

    go func() {
        defer close(throttled)
        for req := range requests {
            <-ticker.C
            throttled <- req
        }
        ticker.Stop()
    }()

    return throttled
}
```

**Concurrency rules:**

| Rule | Explanation |
|------|-------------|
| Do not communicate by sharing memory | Share memory by communicating (channels) |
| Always close channels from the sender | Never close from the receiver |
| Use `sync.WaitGroup` for goroutine coordination | Prevents goroutine leaks |
| Use `context.Context` for cancellation | Propagates cancellation through call chains |
| Never start a goroutine without knowing how it stops | Every goroutine needs an exit strategy |

### 3. Interfaces

```go
// Small interfaces -- the Go way
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// Compose interfaces
type ReadWriter interface {
    Reader
    Writer
}

// Accept interfaces, return structs
type UserStore interface {
    GetUser(ctx context.Context, id string) (*User, error)
    CreateUser(ctx context.Context, user *User) error
}

type postgresUserStore struct {
    db *sql.DB
}

func NewUserStore(db *sql.DB) UserStore {
    return &postgresUserStore{db: db}
}

func (s *postgresUserStore) GetUser(ctx context.Context, id string) (*User, error) {
    var user User
    err := s.db.QueryRowContext(ctx,
        "SELECT id, name, email FROM users WHERE id = $1", id,
    ).Scan(&user.ID, &user.Name, &user.Email)
    if err == sql.ErrNoRows {
        return nil, &NotFoundError{Resource: "user", ID: id}
    }
    if err != nil {
        return nil, fmt.Errorf("getting user %s: %w", id, err)
    }
    return &user, nil
}

// Interface satisfaction is implicit -- no "implements" keyword
// This is checked at compile time when you use the interface
var _ UserStore = (*postgresUserStore)(nil) // Compile-time check
```

**Interface guidelines:**

| Guideline | Explanation |
|-----------|-------------|
| Keep interfaces small (1-3 methods) | Large interfaces are hard to implement and mock |
| Define interfaces where they are used | Not where the implementation lives |
| Accept interfaces, return concrete types | Maximizes flexibility for callers |
| Use `var _ Interface = (*Type)(nil)` | Compile-time interface satisfaction check |

### 4. context.Context

```go
// Always pass context as the first parameter
func GetUser(ctx context.Context, id string) (*User, error) {
    // Check for cancellation
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }

    return store.GetUser(ctx, id)
}

// Adding values to context (use sparingly)
type contextKey string

const requestIDKey contextKey = "requestID"

func WithRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey, id)
}

func RequestIDFrom(ctx context.Context) string {
    if id, ok := ctx.Value(requestIDKey).(string); ok {
        return id
    }
    return ""
}

// Timeouts and deadlines
func fetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel() // Always defer cancel

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

**Context rules:**

| Rule | Explanation |
|------|-------------|
| First parameter, named `ctx` | Convention: `func Foo(ctx context.Context, ...)` |
| Never store in a struct | Pass explicitly through function calls |
| `defer cancel()` always | Prevents context leak |
| Use `context.WithValue` sparingly | For request-scoped data only (request ID, auth token) |
| Never pass `nil` context | Use `context.Background()` or `context.TODO()` |

### 5. Testing

```go
// Basic test
func TestAdd(t *testing.T) {
    got := Add(2, 3)
    want := 5
    if got != want {
        t.Errorf("Add(2, 3) = %d, want %d", got, want)
    }
}

// Table-driven tests -- the Go standard
func TestParseAge(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int
        wantErr bool
    }{
        {name: "valid age", input: "25", want: 25, wantErr: false},
        {name: "zero", input: "0", want: 0, wantErr: false},
        {name: "negative", input: "-1", want: 0, wantErr: true},
        {name: "too large", input: "200", want: 0, wantErr: true},
        {name: "non-numeric", input: "abc", want: 0, wantErr: true},
        {name: "empty", input: "", want: 0, wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAge(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("ParseAge(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
                return
            }
            if got != tt.want {
                t.Errorf("ParseAge(%q) = %d, want %d", tt.input, got, tt.want)
            }
        })
    }
}

// Subtests for shared setup
func TestUserStore(t *testing.T) {
    db := setupTestDB(t)
    store := NewUserStore(db)

    t.Run("create", func(t *testing.T) {
        user := &User{Name: "Alice", Email: "alice@example.com"}
        err := store.CreateUser(context.Background(), user)
        if err != nil {
            t.Fatalf("CreateUser: %v", err)
        }
    })

    t.Run("get", func(t *testing.T) {
        user, err := store.GetUser(context.Background(), "1")
        if err != nil {
            t.Fatalf("GetUser: %v", err)
        }
        if user.Name != "Alice" {
            t.Errorf("Name = %q, want %q", user.Name, "Alice")
        }
    })
}

// Test helpers
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("opening test db: %v", err)
    }
    t.Cleanup(func() { db.Close() })
    return db
}

// Benchmarks
func BenchmarkProcess(b *testing.B) {
    data := generateTestData()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        Process(data)
    }
}
```

### 6. HTTP Handlers and Middleware

```go
// Handler function
func handleGetUser(store UserStore) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id") // Go 1.22+ routing

        user, err := store.GetUser(r.Context(), id)
        if err != nil {
            var notFound *NotFoundError
            if errors.As(err, &notFound) {
                http.Error(w, notFound.Error(), http.StatusNotFound)
                return
            }
            http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(user)
    }
}

// Middleware pattern
type Middleware func(http.Handler) http.Handler

func LoggingMiddleware(logger *slog.Logger) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

            next.ServeHTTP(wrapped, r)

            logger.Info("request",
                "method", r.Method,
                "path", r.URL.Path,
                "status", wrapped.statusCode,
                "duration", time.Since(start),
            )
        })
    }
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (w *responseWriter) WriteHeader(code int) {
    w.statusCode = code
    w.ResponseWriter.WriteHeader(code)
}

// Chaining middleware
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}

// Router setup (Go 1.22+)
func NewRouter(store UserStore, logger *slog.Logger) http.Handler {
    mux := http.NewServeMux()

    mux.HandleFunc("GET /api/users/{id}", handleGetUser(store))
    mux.HandleFunc("POST /api/users", handleCreateUser(store))

    return Chain(mux,
        LoggingMiddleware(logger),
        RecoveryMiddleware(),
        CORSMiddleware(),
    )
}
```

### 7. Generics (Go 1.18+)

```go
// Generic function
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

// Generic function with constraints
func Max[T constraints.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// Custom constraint
type Number interface {
    ~int | ~int32 | ~int64 | ~float32 | ~float64
}

func Sum[T Number](values []T) T {
    var total T
    for _, v := range values {
        total += v
    }
    return total
}

// Generic data structure
type Set[T comparable] struct {
    items map[T]struct{}
}

func NewSet[T comparable]() *Set[T] {
    return &Set[T]{items: make(map[T]struct{})}
}

func (s *Set[T]) Add(item T) {
    s.items[item] = struct{}{}
}

func (s *Set[T]) Contains(item T) bool {
    _, ok := s.items[item]
    return ok
}

func (s *Set[T]) Len() int {
    return len(s.items)
}
```

### 8. Struct Embedding and Composition

```go
// Embedding for composition (not inheritance)
type BaseModel struct {
    ID        string    `json:"id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type User struct {
    BaseModel           // Embedded -- User "has" BaseModel fields
    Name      string    `json:"name"`
    Email     string    `json:"email"`
}

// User now has ID, CreatedAt, UpdatedAt promoted to top level
user := User{
    BaseModel: BaseModel{ID: "123"},
    Name:      "Alice",
    Email:     "alice@example.com",
}
fmt.Println(user.ID) // "123" -- promoted field

// Embedding interfaces
type ReadCloser struct {
    io.Reader
    io.Closer
}
```

### 9. defer, panic, recover

```go
// defer for cleanup -- executes in LIFO order
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // Always runs when function returns

    // Process file...
    return nil
}

// Defer with named returns for error handling
func doWork() (err error) {
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer func() {
        if err != nil {
            tx.Rollback()
        } else {
            err = tx.Commit()
        }
    }()

    // Do work within transaction...
    return nil
}

// panic and recover -- use only for truly unrecoverable situations
func safeDiv(a, b float64) (result float64, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic in division: %v", r)
        }
    }()

    if b == 0 {
        panic("division by zero") // In practice, return an error instead
    }
    return a / b, nil
}
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| `_ = someFunc()` (ignoring errors) | Hides failures silently | Handle the error or log it |
| Goroutine without exit strategy | Goroutine leak | Use context cancellation or done channel |
| `interface{}` / `any` everywhere | Loses type safety | Use generics or specific types |
| Package-level `init()` abuse | Hidden side effects, hard to test | Explicit initialization in `main()` |
| Large interfaces (10+ methods) | Hard to mock, violates ISP | Break into small, focused interfaces |
| Naked returns in long functions | Confusing, error-prone | Only use naked returns in short functions |
| `sync.Mutex` for channel-shaped problems | Over-complication | Use channels for communication |

## Project Structure

```
my-service/
  cmd/
    server/
      main.go           # Entry point
  internal/
    handler/             # HTTP handlers
    service/             # Business logic
    store/               # Database access
    model/               # Domain types
  pkg/                   # Public library code (if any)
  go.mod
  go.sum
  Makefile
```

## Common Commands

```bash
go build ./...              # Build all packages
go test ./...               # Test all packages
go test -race ./...         # Test with race detector
go test -cover ./...        # Test with coverage
go vet ./...                # Static analysis
golangci-lint run           # Comprehensive linting
go mod tidy                 # Clean up go.mod and go.sum
go mod vendor               # Vendor dependencies
go generate ./...           # Run code generators
```

## Resources

- **Effective Go**: https://go.dev/doc/effective_go
- **Go Blog**: https://go.dev/blog/
- **Go by Example**: https://gobyexample.com/
- **Standard Library**: https://pkg.go.dev/std
- **Go Proverbs**: https://go-proverbs.github.io/
- **uber-go/guide**: https://github.com/uber-go/guide/blob/master/style.md
- **golangci-lint**: https://golangci-lint.run/
