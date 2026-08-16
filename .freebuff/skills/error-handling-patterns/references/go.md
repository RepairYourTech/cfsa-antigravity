# Go Error Handling Patterns

Language-specific patterns for the `error-handling-patterns` skill. Read `SKILL.md` first for universal methodology.

---

## Explicit Error Returns

```go
// Basic error handling
func getUser(id string) (*User, error) {
    user, err := db.QueryUser(id)
    if err != nil {
        return nil, fmt.Errorf("failed to query user: %w", err)
    }
    if user == nil {
        return nil, errors.New("user not found")
    }
    return user, nil
}

// Custom error types
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for %s: %s", e.Field, e.Message)
}

// Sentinel errors for comparison
var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)
```

## Error Checking and Wrapping

```go
// Error checking with errors.Is
user, err := getUser("123")
if err != nil {
    if errors.Is(err, ErrNotFound) {
        // Handle not found
    } else {
        // Handle other errors
    }
}

// Error wrapping preserves the chain
func processUser(id string) error {
    user, err := getUser(id)
    if err != nil {
        return fmt.Errorf("process user failed: %w", err)
    }
    // Process user
    return nil
}

// Unwrap to specific error types
err := processUser("123")
if err != nil {
    var valErr *ValidationError
    if errors.As(err, &valErr) {
        fmt.Printf("Validation error: %s\n", valErr.Field)
    }
}
```

## Defer for Cleanup

```go
func readFile(path string) (string, error) {
    f, err := os.Open(path)
    if err != nil {
        return "", fmt.Errorf("open file: %w", err)
    }
    defer f.Close() // Always runs, even on error

    data, err := io.ReadAll(f)
    if err != nil {
        return "", fmt.Errorf("read file: %w", err)
    }
    return string(data), nil
}

// Defer with error handling
func writeData(path string, data []byte) (err error) {
    f, err := os.Create(path)
    if err != nil {
        return fmt.Errorf("create file: %w", err)
    }
    defer func() {
        closeErr := f.Close()
        if err == nil {
            err = closeErr
        }
    }()

    _, err = f.Write(data)
    return err
}
```

## Panic and Recover

```go
// Panic for unrecoverable errors (programming bugs)
func mustParseConfig(path string) Config {
    cfg, err := parseConfig(path)
    if err != nil {
        panic(fmt.Sprintf("config parse failed: %v", err))
    }
    return cfg
}

// Recover in middleware/handlers to prevent crashes
func recoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic recovered: %v\n%s", err, debug.Stack())
                http.Error(w, "Internal Server Error", 500)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

## Error Groups for Concurrent Operations

```go
import "golang.org/x/sync/errgroup"

func fetchAllData(ctx context.Context) (*AllData, error) {
    g, ctx := errgroup.WithContext(ctx)
    var users []User
    var orders []Order

    g.Go(func() error {
        var err error
        users, err = fetchUsers(ctx)
        return err
    })

    g.Go(func() error {
        var err error
        orders, err = fetchOrders(ctx)
        return err
    })

    if err := g.Wait(); err != nil {
        return nil, fmt.Errorf("fetch all data: %w", err)
    }

    return &AllData{Users: users, Orders: orders}, nil
}
```
