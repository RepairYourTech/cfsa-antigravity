---
name: kotlin
description: Kotlin development patterns for concise, safe, and expressive code. Covers null safety, data/sealed classes, coroutines, extension functions, scope functions, Flow, delegation, DSL builders, testing, and multiplatform patterns.
version: 1.0.0
---

# Kotlin Development Patterns

Expert guidance for writing idiomatic, production-grade Kotlin code. Covers null safety, data modeling with data and sealed classes, structured concurrency with coroutines, extension functions, scope functions, Kotlin Flow, DSL builders, testing, and multiplatform development.

## When to Use This Skill

- Building Android applications with modern architecture
- Writing backend services with Ktor or Spring Boot
- Creating multiplatform libraries (JVM, JS, Native)
- Migrating Java codebases to Kotlin
- Implementing reactive streams with Kotlin Flow
- Building type-safe DSLs for configuration or testing

## Core Concepts

### 1. Null Safety

Kotlin's type system distinguishes nullable and non-nullable types at compile time.

```kotlin
// Non-nullable -- cannot be null
val name: String = "Alice"

// Nullable -- can be null
val email: String? = findEmail(userId)

// Safe call operator
val length: Int? = email?.length

// Elvis operator -- provide default for null
val displayName: String = email ?: "unknown"

// Safe call chain
val city: String? = user?.address?.city

// Not-null assertion (avoid in production code)
val forcedLength: Int = email!!.length  // Throws NPE if null

// Smart casting after null check
fun process(value: String?) {
    if (value != null) {
        // value is automatically cast to String (non-nullable) here
        println(value.length)
    }
}

// let for nullable transformations
val upperEmail: String? = email?.let { it.uppercase() }

// require/check for preconditions
fun setAge(age: Int) {
    require(age in 0..150) { "Age must be between 0 and 150, got $age" }
}

fun processOrder(order: Order) {
    check(order.status == Status.PENDING) { "Order must be pending, was ${order.status}" }
}
```

**Null safety rules:**

| Rule | Explanation |
|------|-------------|
| Prefer non-nullable types | Make nullability explicit and intentional |
| Never use `!!` in production | It defeats the purpose of null safety |
| Use `?.let {}` for nullable chains | Cleaner than nested if-null checks |
| Use Elvis `?:` for defaults | Concise and readable |
| Use `requireNotNull()` at boundaries | Fail fast with clear messages |

### 2. Data Classes and Sealed Classes

```kotlin
// Data class -- immutable value object with generated equals/hashCode/toString/copy
data class User(
    val id: String,
    val name: String,
    val email: String,
    val age: Int
) {
    init {
        require(name.isNotBlank()) { "Name must not be blank" }
        require(age in 13..150) { "Age must be between 13 and 150" }
    }
}

// copy() for creating modified copies
val updated = user.copy(name = "Bob")

// Destructuring
val (id, name, email, age) = user

// Sealed class -- restricted hierarchy for exhaustive when
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}

// Exhaustive when -- compiler ensures all cases handled
fun <T> handleResult(result: Result<T>): String = when (result) {
    is Result.Success -> "Data: ${result.data}"
    is Result.Error -> "Error: ${result.message}"
    is Result.Loading -> "Loading..."
    // No else needed -- compiler knows all cases
}

// Sealed interface (Kotlin 1.5+) -- allows multiple inheritance
sealed interface UiState {
    data object Idle : UiState
    data object Loading : UiState
    data class Content(val items: List<Item>) : UiState
    data class Error(val message: String) : UiState
}

// Value class (Kotlin 1.5+) -- zero-overhead wrapper
@JvmInline
value class UserId(val value: String) {
    init {
        require(value.isNotBlank()) { "UserId must not be blank" }
    }
}

// Prevents mixing up String parameters
fun findUser(id: UserId): User? = TODO()
// findUser(UserId("abc"))  -- explicit, type-safe
```

### 3. Coroutines and Structured Concurrency

```kotlin
import kotlinx.coroutines.*

// Suspend function -- can be paused and resumed
suspend fun fetchUser(id: String): User {
    return httpClient.get("https://api.example.com/users/$id")
}

// Launching coroutines with structured concurrency
fun main() = runBlocking {
    // launch -- fire and forget (returns Job)
    val job = launch {
        delay(1000)
        println("World")
    }
    println("Hello")
    job.join()

    // async -- returns a value (returns Deferred<T>)
    val deferred = async {
        fetchUser("123")
    }
    val user = deferred.await()
}

// coroutineScope -- structured concurrency boundary
suspend fun fetchUserWithOrders(userId: String): UserWithOrders =
    coroutineScope {
        val userDeferred = async { fetchUser(userId) }
        val ordersDeferred = async { fetchOrders(userId) }

        UserWithOrders(
            user = userDeferred.await(),
            orders = ordersDeferred.await()
        )
        // If either fails, both are cancelled
    }

// supervisorScope -- children failures do not cancel siblings
suspend fun fetchAll(ids: List<String>): List<User?> =
    supervisorScope {
        ids.map { id ->
            async {
                try {
                    fetchUser(id)
                } catch (e: Exception) {
                    null  // Individual failure does not cancel others
                }
            }
        }.awaitAll()
    }

// Exception handling
suspend fun safeOperation() {
    val handler = CoroutineExceptionHandler { _, exception ->
        println("Caught: $exception")
    }

    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default + handler)
    scope.launch {
        throw RuntimeException("Something went wrong")
    }
}

// withTimeout
suspend fun fetchWithTimeout(id: String): User =
    withTimeout(5000) {
        fetchUser(id)
    }

// Dispatchers
// Dispatchers.Default  -- CPU-bound work
// Dispatchers.IO       -- I/O-bound work (network, disk)
// Dispatchers.Main     -- UI thread (Android)
// Dispatchers.Unconfined -- advanced, rarely needed
```

### 4. Extension Functions

```kotlin
// Add methods to existing types without inheritance
fun String.isValidEmail(): Boolean =
    contains("@") && contains(".") && length > 5

// Usage
"alice@example.com".isValidEmail()  // true

// Extension property
val String.wordCount: Int
    get() = split("\\s+".toRegex()).size

"hello world".wordCount  // 2

// Extension functions on nullable types
fun String?.orEmpty(): String = this ?: ""

// Generic extension functions
fun <T> List<T>.secondOrNull(): T? = if (size >= 2) this[1] else null

// Extension functions for fluent APIs
fun StringBuilder.appendLine(line: String): StringBuilder =
    append(line).append('\n')

// Scope-limiting extensions
fun <T : AutoCloseable, R> T.useAndReturn(block: (T) -> R): R =
    use { block(it) }
```

### 5. Scope Functions: let, run, with, apply, also

```kotlin
// let -- transform nullable, chain operations
// Context object: it | Returns: lambda result
val email = user?.email?.let { normalizeEmail(it) }

val numbers = mutableListOf(1, 2, 3)
val doubled = numbers.map { it * 2 }.let { println(it); it }

// run -- execute block with receiver, compute result
// Context object: this | Returns: lambda result
val greeting = user.run {
    "Hello, $name! You are $age years old."
}

// Null-safe run
val length = nullableString?.run { length } ?: 0

// with -- call multiple methods on same object (non-extension)
// Context object: this | Returns: lambda result
val description = with(user) {
    "Name: $name, Email: $email, Age: $age"
}

// apply -- configure an object, return the object itself
// Context object: this | Returns: context object
val user = User().apply {
    name = "Alice"
    email = "alice@example.com"
    age = 30
}

// also -- side effects, return the object unchanged
// Context object: it | Returns: context object
val user = createUser()
    .also { log.info("Created user: ${it.id}") }
    .also { analytics.trackUserCreation(it) }
```

**Scope function decision matrix:**

| Function | Object ref | Return value | Use case |
|----------|-----------|-------------|----------|
| `let` | `it` | Lambda result | Null check + transform |
| `run` | `this` | Lambda result | Object config + compute result |
| `with` | `this` | Lambda result | Grouping calls on an object |
| `apply` | `this` | Object itself | Object configuration |
| `also` | `it` | Object itself | Side effects (logging, validation) |

### 6. Kotlin Flow

```kotlin
import kotlinx.coroutines.flow.*

// Creating flows
fun numbersFlow(): Flow<Int> = flow {
    for (i in 1..10) {
        delay(100)
        emit(i)
    }
}

// Flow operators (similar to sequences but async)
val evenSquares = numbersFlow()
    .filter { it % 2 == 0 }
    .map { it * it }
    .take(3)

// Collecting flows
suspend fun main() {
    evenSquares.collect { value ->
        println(value)
    }
}

// StateFlow -- observable state holder
class UserViewModel {
    private val _state = MutableStateFlow<UiState>(UiState.Idle)
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun loadUsers() {
        _state.value = UiState.Loading
        viewModelScope.launch {
            try {
                val users = repository.getUsers()
                _state.value = UiState.Content(users)
            } catch (e: Exception) {
                _state.value = UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}

// SharedFlow -- event broadcasting
class EventBus {
    private val _events = MutableSharedFlow<Event>(replay = 0)
    val events: SharedFlow<Event> = _events.asSharedFlow()

    suspend fun emit(event: Event) {
        _events.emit(event)
    }
}

// Flow operators
val transformed = sourceFlow
    .debounce(300)                    // Wait for pause in emissions
    .distinctUntilChanged()           // Skip consecutive duplicates
    .flatMapLatest { query ->         // Cancel previous inner flow
        searchRepository.search(query)
    }
    .catch { e ->                     // Handle upstream errors
        emit(emptyList())
    }
    .onEach { results ->              // Side effect
        analytics.trackSearch(results.size)
    }
    .flowOn(Dispatchers.IO)           // Switch upstream dispatcher

// Combining flows
val combined = combine(flow1, flow2, flow3) { a, b, c ->
    Triple(a, b, c)
}
```

### 7. Companion Objects and Delegation

```kotlin
// Companion object -- static-like members
class User private constructor(
    val name: String,
    val email: String
) {
    companion object {
        fun create(name: String, email: String): User {
            require(name.isNotBlank())
            return User(name, email.lowercase())
        }

        // Can implement interfaces
        // companion object : Factory<User> { ... }
    }
}

// Property delegation
class PreferencesManager(private val prefs: SharedPreferences) {
    var theme: String by prefs.string(default = "system")
    var fontSize: Int by prefs.int(default = 14)
    var isDarkMode: Boolean by prefs.boolean(default = false)
}

// Built-in delegates
val lazyValue: String by lazy {
    println("Computing...")
    "Hello"
}

var observed: String by Delegates.observable("initial") { _, old, new ->
    println("Changed from $old to $new")
}

// Custom delegate
class LoggingDelegate<T>(private var value: T) {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        println("Reading ${property.name}: $value")
        return value
    }

    operator fun setValue(thisRef: Any?, property: KProperty<*>, newValue: T) {
        println("Writing ${property.name}: $value -> $newValue")
        value = newValue
    }
}

var debuggable: String by LoggingDelegate("initial")

// Class delegation
interface Repository {
    fun findAll(): List<Item>
    fun findById(id: String): Item?
}

class CachingRepository(
    private val delegate: Repository
) : Repository by delegate {
    // Override only what you need -- everything else delegates automatically
    private val cache = mutableMapOf<String, Item>()

    override fun findById(id: String): Item? =
        cache.getOrPut(id) { delegate.findById(id) ?: return null }
}
```

### 8. DSL Builders

```kotlin
// Type-safe builder using receiver lambdas
class HtmlBuilder {
    private val elements = mutableListOf<String>()

    fun head(block: HeadBuilder.() -> Unit) {
        val builder = HeadBuilder().apply(block)
        elements.add("<head>${builder.build()}</head>")
    }

    fun body(block: BodyBuilder.() -> Unit) {
        val builder = BodyBuilder().apply(block)
        elements.add("<body>${builder.build()}</body>")
    }

    fun build(): String = "<html>${elements.joinToString("")}</html>"
}

class BodyBuilder {
    private val elements = mutableListOf<String>()

    fun h1(text: String) { elements.add("<h1>$text</h1>") }
    fun p(text: String) { elements.add("<p>$text</p>") }
    fun div(block: BodyBuilder.() -> Unit) {
        val inner = BodyBuilder().apply(block)
        elements.add("<div>${inner.build()}</div>")
    }

    fun build(): String = elements.joinToString("")
}

fun html(block: HtmlBuilder.() -> Unit): String =
    HtmlBuilder().apply(block).build()

// Usage
val page = html {
    body {
        h1("Welcome")
        div {
            p("Hello, world!")
            p("This is a DSL.")
        }
    }
}

// Route DSL example (Ktor-style)
fun Application.configureRouting() {
    routing {
        route("/api") {
            get("/users") {
                val users = userService.findAll()
                call.respond(users)
            }
            post("/users") {
                val request = call.receive<CreateUserRequest>()
                val created = userService.create(request)
                call.respond(HttpStatusCode.Created, created)
            }
        }
    }
}
```

### 9. Testing with Kotest and JUnit 5

```kotlin
// JUnit 5 style (works with Spring, familiar to Java devs)
class UserServiceTest {

    private val repository = mockk<UserRepository>()
    private val service = UserService(repository)

    @Test
    fun `findById returns user when exists`() {
        val user = User("1", "Alice", "alice@example.com")
        every { repository.findById("1") } returns user

        val result = service.findById("1")

        assertThat(result).isNotNull()
        assertThat(result?.name).isEqualTo("Alice")
        verify { repository.findById("1") }
    }

    @Test
    fun `create throws on duplicate email`() {
        every { repository.existsByEmail("alice@example.com") } returns true

        assertThrows<IllegalArgumentException> {
            service.create(CreateUserRequest("Alice", "alice@example.com", 30))
        }
    }
}

// Kotest style (BDD, property-based, more Kotlin-native)
class UserSpec : FunSpec({

    val repository = mockk<UserRepository>()
    val service = UserService(repository)

    test("findById returns user when exists") {
        val user = User("1", "Alice", "alice@example.com")
        every { repository.findById("1") } returns user

        service.findById("1") shouldNotBe null
        service.findById("1")?.name shouldBe "Alice"
    }

    test("findById returns null when not exists") {
        every { repository.findById("999") } returns null

        service.findById("999") shouldBe null
    }

    context("create") {
        test("succeeds with valid input") {
            every { repository.existsByEmail(any()) } returns false
            every { repository.save(any()) } answers { firstArg() }

            val result = service.create(CreateUserRequest("Bob", "bob@example.com", 25))
            result.name shouldBe "Bob"
        }

        test("fails on duplicate email") {
            every { repository.existsByEmail("alice@example.com") } returns true

            shouldThrow<IllegalArgumentException> {
                service.create(CreateUserRequest("Alice", "alice@example.com", 30))
            }
        }
    }
})

// Coroutine testing
class CoroutineTest {
    @Test
    fun `concurrent fetch completes`() = runTest {
        val result = fetchUserWithOrders("123")
        assertThat(result.user).isNotNull()
        assertThat(result.orders).isNotEmpty()
    }
}
```

### 10. Multiplatform Patterns

```kotlin
// Common module -- shared across all platforms
// commonMain/kotlin/com/example/
expect fun platformName(): String

class Greeting {
    fun greet(): String = "Hello from ${platformName()}"
}

// JVM implementation
// jvmMain/kotlin/com/example/
actual fun platformName(): String = "JVM"

// JS implementation
// jsMain/kotlin/com/example/
actual fun platformName(): String = "JavaScript"

// Native implementation
// nativeMain/kotlin/com/example/
actual fun platformName(): String = "Native"

// Shared data models work everywhere
data class User(val id: String, val name: String, val email: String)

// Use expect/actual for platform-specific implementations
expect class HttpClient() {
    suspend fun get(url: String): String
}
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| `!!` (not-null assertion) | Defeats null safety, crashes at runtime | Use safe calls, Elvis, or `requireNotNull` |
| `var` everywhere | Mutable state is error-prone | Prefer `val` (immutable) |
| Java-style getters/setters | Verbose, un-Kotlin | Use properties with custom get/set |
| `companion object` for utility functions | Unnecessary wrapper | Use top-level functions |
| `GlobalScope.launch` | Unstructured, leaks coroutines | Use structured scope (viewModelScope, etc.) |
| Catching `Exception` without rethrowing `CancellationException` | Breaks coroutine cancellation | Always rethrow `CancellationException` |
| `runBlocking` in production code | Blocks the thread | Use `suspend` functions and proper scopes |
| Ignoring Flow backpressure | Memory issues | Use `conflate()`, `buffer()`, or `collectLatest` |

## Project Structure

```
src/
  main/kotlin/com/example/
    Application.kt
    config/
    controller/
    service/
    repository/
    model/
  test/kotlin/com/example/
    service/
    repository/
build.gradle.kts
```

## Common Commands

```bash
# Gradle (Kotlin projects use Gradle almost exclusively)
./gradlew build                    # Build and test
./gradlew test                     # Run tests only
./gradlew run                      # Run application
./gradlew ktlintCheck              # Lint check
./gradlew ktlintFormat             # Auto-format
./gradlew detekt                   # Static analysis
```

## Resources

- **Kotlin Docs**: https://kotlinlang.org/docs/home.html
- **Kotlin Coroutines Guide**: https://kotlinlang.org/docs/coroutines-guide.html
- **Kotlin Flow Guide**: https://kotlinlang.org/docs/flow.html
- **Ktor Documentation**: https://ktor.io/docs/welcome.html
- **Kotest**: https://kotest.io/
- **MockK**: https://mockk.io/
- **Kotlin Multiplatform**: https://kotlinlang.org/docs/multiplatform.html
