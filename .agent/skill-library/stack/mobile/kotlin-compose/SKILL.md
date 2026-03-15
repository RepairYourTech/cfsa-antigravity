---
name: kotlin-compose
description: "Jetpack Compose patterns covering UI composition, state management, navigation, theming, lists, animations, and architecture integration. Use when building Android UI with Jetpack Compose."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Jetpack Compose (Kotlin)

Declarative UI toolkit for Android. Build UIs with composable functions, state-driven rendering, Material 3 theming, and integrated navigation.

## When to Use

- Building native Android UI
- Want modern declarative UI (replacing XML layouts)
- Building with Material 3 design system
- Need tight integration with Android lifecycle and ViewModels

## When NOT to Use

- Building cross-platform (use Flutter, React Native, or KMP+Compose Multiplatform)
- Maintaining a legacy XML-based UI (gradual migration is possible)
- Building for iOS only (use SwiftUI)

## Setup

```kotlin
// build.gradle.kts (app module)
android {
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.14" }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
```

## Composables

```kotlin
@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello, $name!",
        modifier = modifier.padding(16.dp),
        style = MaterialTheme.typography.headlineMedium,
    )
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    MyAppTheme { Greeting("World") }
}
```

## State Management

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableIntStateOf(0) }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Count: $count", style = MaterialTheme.typography.displayMedium)
        Button(onClick = { count++ }) { Text("Increment") }
    }
}
```

### ViewModel Integration

```kotlin
class TasksViewModel : ViewModel() {
    private val _tasks = MutableStateFlow<List<Task>>(emptyList())
    val tasks: StateFlow<List<Task>> = _tasks.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadTasks() {
        viewModelScope.launch {
            _isLoading.value = true
            _tasks.value = repository.getTasks()
            _isLoading.value = false
        }
    }
}

@Composable
fun TasksScreen(viewModel: TasksViewModel = viewModel()) {
    val tasks by viewModel.tasks.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()

    if (isLoading) CircularProgressIndicator()
    else TaskList(tasks)
}
```

## Lists

```kotlin
@Composable
fun TaskList(tasks: List<Task>) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(tasks, key = { it.id }) { task ->
            TaskCard(task)
        }
    }
}

@Composable
fun TaskCard(task: Task) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(task.title, style = MaterialTheme.typography.titleMedium)
            Text(task.description, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
```

## Navigation

```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController, startDestination = "home") {
        composable("home") { HomeScreen(navController) }
        composable("details/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { backStackEntry ->
            DetailsScreen(id = backStackEntry.arguments?.getString("id") ?: "")
        }
    }
}

// Navigate
navController.navigate("details/123")
navController.popBackStack()
```

## Theming (Material 3)

```kotlin
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) darkColorScheme(
        primary = Color(0xFF6750A4),
        secondary = Color(0xFF625B71),
    ) else lightColorScheme(
        primary = Color(0xFF6750A4),
        secondary = Color(0xFF625B71),
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content,
    )
}
```

## Common Patterns

### Form Input

```kotlin
@Composable
fun EmailInput() {
    var email by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = email,
        onValueChange = { email = it; isError = !it.contains("@") },
        label = { Text("Email") },
        isError = isError,
        supportingText = { if (isError) Text("Invalid email") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
}
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use `mutableStateOf` in ViewModel | Use `MutableStateFlow` in ViewModel, `collectAsStateWithLifecycle` in composables |
| Skip `key` parameter in `items()` | Always provide stable keys for efficient recomposition |
| Perform side effects directly in composables | Use `LaunchedEffect`, `SideEffect`, or `DisposableEffect` |
| Create new objects in composable scope | Use `remember` to cache expensive objects across recompositions |
| Pass ViewModel to child composables | Pass data and callbacks down, not ViewModels |
| Use `Column` for long scrollable lists | Use `LazyColumn` for efficient recycling |
| Hardcode colors and text styles | Use `MaterialTheme.colorScheme` and `MaterialTheme.typography` |
| Skip `@Preview` annotations | Add previews for visual development and review |
