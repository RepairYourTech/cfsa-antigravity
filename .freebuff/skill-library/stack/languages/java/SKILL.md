---
name: java
description: Modern Java development patterns (17+). Covers records, sealed classes, pattern matching, Spring Boot, streams, Optional, JUnit 5, Maven/Gradle, JPA, design patterns, exception handling, logging, and concurrent utilities.
version: 1.0.0
---

# Java Development Patterns

Expert guidance for writing modern, production-grade Java code. Covers Java 17+ features (records, sealed classes, pattern matching), Spring Boot patterns, the streams API, testing with JUnit 5, build tools, and the design patterns that make Java codebases maintainable at enterprise scale.

## When to Use This Skill

- Building enterprise applications with Spring Boot
- Writing microservices with REST or gRPC APIs
- Implementing domain-driven design with rich domain models
- Creating libraries with strong API contracts
- Building concurrent systems with Java's concurrency utilities
- Migrating legacy Java code to modern patterns

## Core Concepts

### 1. Modern Java Features (17+)

#### Records (Java 16+)

Immutable data carriers that eliminate boilerplate.

```java
// Record -- generates constructor, getters, equals, hashCode, toString
public record User(String name, String email, int age) {

    // Compact constructor for validation
    public User {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name must not be blank");
        }
        if (age < 0 || age > 150) {
            throw new IllegalArgumentException("Age must be between 0 and 150");
        }
        email = email.toLowerCase();
    }

    // Custom factory method
    public static User of(String name, String email) {
        return new User(name, email, 0);
    }
}

// Usage
var user = new User("Alice", "Alice@Example.com", 30);
System.out.println(user.name());  // "Alice"
System.out.println(user.email()); // "alice@example.com" (normalized)

// Records work well with pattern matching
if (obj instanceof User(String name, String email, int age)) {
    System.out.println(name + " is " + age + " years old");
}
```

#### Sealed Classes (Java 17+)

Restricted class hierarchies for exhaustive pattern matching.

```java
public sealed interface Shape
    permits Circle, Rectangle, Triangle {

    double area();
}

public record Circle(double radius) implements Shape {
    public double area() { return Math.PI * radius * radius; }
}

public record Rectangle(double width, double height) implements Shape {
    public double area() { return width * height; }
}

public record Triangle(double base, double height) implements Shape {
    public double area() { return 0.5 * base * height; }
}

// Exhaustive switch -- compiler verifies all cases handled
public static String describe(Shape shape) {
    return switch (shape) {
        case Circle c -> String.format("Circle with radius %.2f", c.radius());
        case Rectangle r -> String.format("Rectangle %sx%s", r.width(), r.height());
        case Triangle t -> String.format("Triangle with base %.2f", t.base());
    };
}
```

#### Pattern Matching (Java 21+)

```java
// Pattern matching for instanceof (Java 16+)
public static double getArea(Object obj) {
    if (obj instanceof Circle c) {
        return c.area();
    } else if (obj instanceof Rectangle r) {
        return r.area();
    }
    throw new IllegalArgumentException("Unknown shape: " + obj.getClass());
}

// Switch pattern matching with guards (Java 21+)
public static String classify(Object obj) {
    return switch (obj) {
        case Integer i when i < 0 -> "negative integer";
        case Integer i when i == 0 -> "zero";
        case Integer i -> "positive integer: " + i;
        case String s when s.isBlank() -> "blank string";
        case String s -> "string: " + s;
        case null -> "null";
        default -> "unknown: " + obj.getClass().getSimpleName();
    };
}

// Record patterns (Java 21+)
public static String formatPoint(Object obj) {
    return switch (obj) {
        case Point(int x, int y) when x == 0 && y == 0 -> "origin";
        case Point(int x, int y) -> String.format("(%d, %d)", x, y);
        default -> "not a point";
    };
}
```

#### Text Blocks (Java 15+)

```java
// Multi-line strings with proper indentation
String json = """
        {
            "name": "%s",
            "email": "%s",
            "age": %d
        }
        """.formatted(user.name(), user.email(), user.age());

String sql = """
        SELECT u.id, u.name, u.email
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE o.status = 'active'
        ORDER BY u.name
        """;
```

### 2. Spring Boot Patterns

```java
// Controller -- thin, delegates to service
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable String id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        UserResponse created = userService.create(request);
        URI location = URI.create("/api/users/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(e.getMessage()));
    }
}

// Service -- business logic
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    public Optional<UserResponse> findById(String id) {
        return userRepository.findById(id)
                .map(userMapper::toResponse);
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = userMapper.toEntity(request);
        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }
}

// Request/Response DTOs as records
public record CreateUserRequest(
        @NotBlank String name,
        @Email String email,
        @Min(13) @Max(150) int age
) {}

public record UserResponse(String id, String name, String email, int age) {}

public record ErrorResponse(String message) {}
```

### 3. Streams API

```java
// Basic stream operations
List<String> activeUserNames = users.stream()
        .filter(u -> u.isActive())
        .map(User::name)
        .sorted()
        .toList();  // Java 16+, prefer over .collect(Collectors.toList())

// Grouping
Map<String, List<User>> usersByCity = users.stream()
        .collect(Collectors.groupingBy(User::city));

// Reducing
int totalAge = users.stream()
        .mapToInt(User::age)
        .sum();

// FlatMap for nested structures
List<String> allTags = articles.stream()
        .flatMap(article -> article.tags().stream())
        .distinct()
        .sorted()
        .toList();

// Collectors
Map<Boolean, List<User>> partitioned = users.stream()
        .collect(Collectors.partitioningBy(u -> u.age() >= 18));

String csv = users.stream()
        .map(User::name)
        .collect(Collectors.joining(", "));

// Stream.of, Stream.concat
Stream<String> combined = Stream.concat(
        Stream.of("header"),
        dataLines.stream()
);

// Parallel streams -- use only for CPU-bound work on large datasets
long count = hugeList.parallelStream()
        .filter(this::expensiveCheck)
        .count();

// Avoid streams for:
// - Simple iterations (use enhanced for loop)
// - Side effects (use forEach loop, not stream.forEach)
// - Small collections (overhead not worth it)
```

### 4. Optional

```java
// Creating Optional
Optional<User> user = Optional.of(knownUser);        // Throws if null
Optional<User> maybe = Optional.ofNullable(nullable); // Empty if null
Optional<User> empty = Optional.empty();

// Consuming Optional -- prefer functional style
String name = findUser(id)
        .map(User::name)
        .orElse("Unknown");

User user = findUser(id)
        .orElseThrow(() -> new NotFoundException("User " + id + " not found"));

// Chaining
String city = findUser(id)
        .flatMap(User::address)
        .map(Address::city)
        .orElse("Unknown");

// Conditional execution
findUser(id).ifPresentOrElse(
        user -> sendWelcomeEmail(user),
        () -> log.warn("User {} not found", id)
);

// Stream integration (Java 9+)
List<String> presentNames = userIds.stream()
        .map(this::findUser)
        .flatMap(Optional::stream)  // Filters empty Optionals
        .map(User::name)
        .toList();
```

**Optional rules:**

| Rule | Explanation |
|------|-------------|
| Never use Optional as a field | Use nullable fields with null checks |
| Never use Optional as a method parameter | Use overloading or nullable parameter |
| Use as return type for "might not exist" | The intended use case |
| Never call `.get()` without `.isPresent()` | Use `.orElse()`, `.orElseThrow()`, or `.map()` |

### 5. JUnit 5 Testing

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class UserServiceTest {

    private UserService userService;
    private UserRepository mockRepo;

    @BeforeEach
    void setUp() {
        mockRepo = mock(UserRepository.class);
        userService = new UserService(mockRepo, new UserMapper());
    }

    @Test
    @DisplayName("findById returns user when exists")
    void findById_existingUser_returnsUser() {
        // Arrange
        var user = new User("1", "Alice", "alice@example.com", 30);
        when(mockRepo.findById("1")).thenReturn(Optional.of(user));

        // Act
        var result = userService.findById("1");

        // Assert
        assertThat(result).isPresent();
        assertThat(result.get().name()).isEqualTo("Alice");
    }

    @Test
    @DisplayName("create throws when email already registered")
    void create_duplicateEmail_throws() {
        var request = new CreateUserRequest("Bob", "bob@example.com", 25);
        when(mockRepo.existsByEmail("bob@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email already registered");
    }

    // Parameterized tests
    @ParameterizedTest(name = "age {0} should be {1}")
    @CsvSource({
            "12, false",
            "13, true",
            "17, true",
            "18, true",
            "150, true",
            "151, false"
    })
    void validateAge(int age, boolean expected) {
        if (expected) {
            assertThatNoException().isThrownBy(
                    () -> new User("Test", "t@t.com", age));
        } else {
            assertThatThrownBy(() -> new User("Test", "t@t.com", age))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @ParameterizedTest
    @MethodSource("invalidEmails")
    void create_invalidEmail_throws(String email) {
        assertThatThrownBy(() -> new User("Test", email, 25))
                .isInstanceOf(IllegalArgumentException.class);
    }

    static Stream<String> invalidEmails() {
        return Stream.of("", " ", "no-at-sign", "@no-local", "no-domain@");
    }

    // Nested tests for organization
    @Nested
    @DisplayName("when user exists")
    class WhenUserExists {

        private User existingUser;

        @BeforeEach
        void setUp() {
            existingUser = new User("1", "Alice", "alice@example.com", 30);
            when(mockRepo.findById("1")).thenReturn(Optional.of(existingUser));
        }

        @Test
        void findById_returnsUser() {
            assertThat(userService.findById("1")).isPresent();
        }

        @Test
        void delete_removesUser() {
            userService.delete("1");
            verify(mockRepo).deleteById("1");
        }
    }
}
```

### 6. Maven and Gradle

```xml
<!-- pom.xml (Maven) -->
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>my-service</artifactId>
    <version>1.0.0</version>

    <properties>
        <java.version>21</java.version>
        <maven.compiler.source>${java.version}</maven.compiler.source>
        <maven.compiler.target>${java.version}</maven.compiler.target>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.assertj</groupId>
            <artifactId>assertj-core</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

```kotlin
// build.gradle.kts (Gradle Kotlin DSL)
plugins {
    java
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.assertj:assertj-core")
}

tasks.test {
    useJUnitPlatform()
}
```

### 7. Design Patterns

```java
// Builder -- for objects with many optional parameters
public class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final Duration timeout;

    private HttpRequest(Builder builder) {
        this.url = builder.url;
        this.method = builder.method;
        this.headers = Map.copyOf(builder.headers);
        this.body = builder.body;
        this.timeout = builder.timeout;
    }

    public static Builder builder(String url) {
        return new Builder(url);
    }

    public static class Builder {
        private final String url;
        private String method = "GET";
        private final Map<String, String> headers = new HashMap<>();
        private String body;
        private Duration timeout = Duration.ofSeconds(30);

        private Builder(String url) {
            this.url = Objects.requireNonNull(url);
        }

        public Builder method(String method) { this.method = method; return this; }
        public Builder header(String key, String value) { headers.put(key, value); return this; }
        public Builder body(String body) { this.body = body; return this; }
        public Builder timeout(Duration timeout) { this.timeout = timeout; return this; }

        public HttpRequest build() { return new HttpRequest(this); }
    }
}

// Usage
var request = HttpRequest.builder("https://api.example.com/users")
        .method("POST")
        .header("Content-Type", "application/json")
        .body("{\"name\": \"Alice\"}")
        .timeout(Duration.ofSeconds(10))
        .build();

// Strategy -- pluggable algorithms
public interface PricingStrategy {
    BigDecimal calculatePrice(Order order);
}

public class RegularPricing implements PricingStrategy {
    public BigDecimal calculatePrice(Order order) {
        return order.subtotal();
    }
}

public class DiscountPricing implements PricingStrategy {
    private final BigDecimal discountRate;

    public DiscountPricing(BigDecimal discountRate) {
        this.discountRate = discountRate;
    }

    public BigDecimal calculatePrice(Order order) {
        return order.subtotal().multiply(BigDecimal.ONE.subtract(discountRate));
    }
}

// Factory
public class PricingFactory {
    public static PricingStrategy forCustomer(Customer customer) {
        return switch (customer.tier()) {
            case STANDARD -> new RegularPricing();
            case PREMIUM -> new DiscountPricing(new BigDecimal("0.10"));
            case VIP -> new DiscountPricing(new BigDecimal("0.20"));
        };
    }
}
```

### 8. Exception Handling

```java
// Custom exception hierarchy
public class AppException extends RuntimeException {
    private final String errorCode;

    public AppException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public AppException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String errorCode() { return errorCode; }
}

public class NotFoundException extends AppException {
    public NotFoundException(String resource, String id) {
        super("NOT_FOUND", resource + " with id " + id + " not found");
    }
}

public class ConflictException extends AppException {
    public ConflictException(String message) {
        super("CONFLICT", message);
    }
}

// Global exception handler (Spring)
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(e.errorCode(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("VALIDATION_ERROR", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.internalServerError()
                .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}
```

### 9. Logging with SLF4J

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    public Order processOrder(OrderRequest request) {
        log.info("Processing order for customer={}", request.customerId());

        try {
            Order order = createOrder(request);
            log.debug("Order created: id={}, items={}", order.id(), order.items().size());
            return order;
        } catch (InsufficientStockException e) {
            log.warn("Insufficient stock for order: customer={}, item={}",
                    request.customerId(), e.itemId());
            throw e;
        } catch (Exception e) {
            log.error("Failed to process order for customer={}", request.customerId(), e);
            throw new AppException("ORDER_FAILED", "Order processing failed", e);
        }
    }
}

// Logging rules:
// - Use parameterized messages: log.info("User {}", id) -- NOT log.info("User " + id)
// - ERROR: system is broken, needs immediate attention
// - WARN: something unexpected but recoverable
// - INFO: significant business events
// - DEBUG: diagnostic information for developers
// - Never log sensitive data (passwords, tokens, PII)
```

### 10. Concurrent Utilities

```java
import java.util.concurrent.*;

// ExecutorService for thread pool management
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor(); // Java 21+

// CompletableFuture for async composition
CompletableFuture<UserProfile> profileFuture = CompletableFuture
        .supplyAsync(() -> fetchUser(userId), executor)
        .thenCombine(
                CompletableFuture.supplyAsync(() -> fetchPreferences(userId), executor),
                (user, prefs) -> new UserProfile(user, prefs)
        )
        .exceptionally(ex -> {
            log.error("Failed to build profile for user={}", userId, ex);
            return UserProfile.DEFAULT;
        });

// Virtual threads (Java 21+) -- lightweight, ideal for I/O-bound tasks
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = urls.stream()
            .map(url -> executor.submit(() -> fetch(url)))
            .toList();

    List<String> results = new ArrayList<>();
    for (var future : futures) {
        results.add(future.get());
    }
}

// Structured concurrency (Java 21+ preview)
// try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
//     Subtask<User> userTask = scope.fork(() -> fetchUser(id));
//     Subtask<Order> orderTask = scope.fork(() -> fetchOrder(id));
//     scope.join().throwIfFailed();
//     return new UserOrder(userTask.get(), orderTask.get());
// }

// Thread-safe collections
ConcurrentHashMap<String, AtomicInteger> counters = new ConcurrentHashMap<>();
counters.computeIfAbsent("key", k -> new AtomicInteger()).incrementAndGet();

// BlockingQueue for producer-consumer
BlockingQueue<Task> taskQueue = new LinkedBlockingQueue<>(100);
// Producer: taskQueue.put(task);
// Consumer: Task task = taskQueue.take();
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| `catch (Exception e) {}` | Silences errors | Log and re-throw, or handle specifically |
| Returning `null` from methods | NullPointerException risk | Return `Optional` or throw |
| `Optional.get()` without check | Throws NoSuchElementException | Use `orElse`, `orElseThrow`, `map` |
| Mutable DTOs with setters | Thread-unsafe, no validation | Use records or immutable objects |
| `static` mutable state | Hidden coupling, thread-unsafe | Inject dependencies via constructor |
| String concatenation in loops | O(n^2) performance | Use `StringBuilder` |
| Checked exceptions for control flow | Verbose, slow | Use unchecked exceptions or Optional |
| Field injection (`@Autowired` on fields) | Hides dependencies, hard to test | Constructor injection |

## Project Structure

```
src/
  main/
    java/com/example/myservice/
      MyServiceApplication.java
      controller/
      service/
      repository/
      model/
      config/
      exception/
    resources/
      application.yml
  test/
    java/com/example/myservice/
      controller/
      service/
      repository/
pom.xml / build.gradle.kts
```

## Common Commands

```bash
# Maven
mvn clean install                    # Build and test
mvn test                             # Run tests only
mvn spring-boot:run                  # Start Spring Boot app
mvn dependency:tree                  # Show dependency tree

# Gradle
./gradlew build                      # Build and test
./gradlew test                       # Run tests only
./gradlew bootRun                    # Start Spring Boot app
./gradlew dependencies               # Show dependency tree
```

## Resources

- **Java Language Updates**: https://docs.oracle.com/en/java/javase/21/language/
- **Spring Boot Reference**: https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/
- **Effective Java (Bloch)**: Definitive Java best practices book
- **JUnit 5 User Guide**: https://junit.org/junit5/docs/current/user-guide/
- **AssertJ**: https://assertj.github.io/doc/
- **Baeldung**: https://www.baeldung.com/
