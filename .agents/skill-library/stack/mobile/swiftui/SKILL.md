---
name: swiftui
description: "SwiftUI patterns covering views, state management, navigation, lists, networking, data persistence, and app architecture. Use when building iOS/macOS UI with SwiftUI."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# SwiftUI

Declarative UI framework for Apple platforms (iOS, macOS, watchOS, tvOS, visionOS). Build UIs with structs, property wrappers for state, and a composable view hierarchy.

## When to Use

- Building native iOS/macOS applications
- Want declarative UI with Swift's type system
- Building for Apple Watch, Apple TV, or visionOS
- Need tight integration with iOS frameworks (CoreData, CloudKit, HealthKit)

## When NOT to Use

- Building cross-platform (use Flutter, React Native, or KMP)
- Targeting Android (use Jetpack Compose)
- Need to support iOS < 15 (SwiftUI maturity is iOS 16+)

## Views

```swift
struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Hello, World!")
                .font(.largeTitle)
                .fontWeight(.bold)
            Text("SwiftUI is great")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview { ContentView() }
```

## State Management

### @State (Local State)

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
                .font(.title)
            Button("Increment") { count += 1 }
                .buttonStyle(.borderedProminent)
        }
    }
}
```

### @Binding (Child ↔ Parent)

```swift
struct ToggleRow: View {
    let label: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(label, isOn: $isOn)
    }
}

struct SettingsView: View {
    @State private var darkMode = false
    var body: some View {
        ToggleRow(label: "Dark Mode", isOn: $darkMode)
    }
}
```

### @Observable (iOS 17+)

```swift
@Observable
class TaskStore {
    var tasks: [Task] = []
    var isLoading = false

    func loadTasks() async {
        isLoading = true
        tasks = await api.fetchTasks()
        isLoading = false
    }
}

struct TaskListView: View {
    @State private var store = TaskStore()

    var body: some View {
        List(store.tasks) { task in
            TaskRow(task: task)
        }
        .overlay { if store.isLoading { ProgressView() } }
        .task { await store.loadTasks() }
    }
}
```

### @Environment

```swift
struct DetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack {
            Text(colorScheme == .dark ? "Dark Mode" : "Light Mode")
            Button("Close") { dismiss() }
        }
    }
}
```

## Navigation

### NavigationStack (iOS 16+)

```swift
struct AppView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List(items) { item in
                NavigationLink(value: item) {
                    Text(item.title)
                }
            }
            .navigationTitle("Items")
            .navigationDestination(for: Item.self) { item in
                ItemDetailView(item: item)
            }
        }
    }
}
```

### TabView

```swift
struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house") }
            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }
            ProfileView()
                .tabItem { Label("Profile", systemImage: "person") }
        }
    }
}
```

## Lists and Data

```swift
struct TaskListView: View {
    @State private var tasks: [Task] = Task.samples

    var body: some View {
        List {
            ForEach(tasks) { task in
                HStack {
                    Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(task.isDone ? .green : .gray)
                    VStack(alignment: .leading) {
                        Text(task.title).font(.headline)
                        Text(task.dueDate, style: .date).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            .onDelete { indices in tasks.remove(atOffsets: indices) }
            .onMove { from, to in tasks.move(fromOffsets: from, toOffset: to) }
        }
        .toolbar { EditButton() }
    }
}
```

## Networking

```swift
struct APIClient {
    static func fetchItems() async throws -> [Item] {
        let (data, response) = try await URLSession.shared.data(
            from: URL(string: "https://api.example.com/items")!
        )
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode([Item].self, from: data)
    }
}

// Usage in view
.task {
    do {
        items = try await APIClient.fetchItems()
    } catch {
        errorMessage = error.localizedDescription
    }
}
```

## Forms

```swift
struct SettingsForm: View {
    @State private var name = ""
    @State private var email = ""
    @State private var notificationsEnabled = true
    @State private var fontSize: Double = 14

    var body: some View {
        Form {
            Section("Profile") {
                TextField("Name", text: $name)
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
            }
            Section("Preferences") {
                Toggle("Notifications", isOn: $notificationsEnabled)
                Slider(value: $fontSize, in: 10...24, step: 1) {
                    Text("Font Size: \(Int(fontSize))")
                }
            }
        }
    }
}
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use `@ObservedObject` for owned state | Use `@State` for owned state, `@ObservedObject` only for injected objects |
| Perform networking directly in views | Use `.task` modifier or `@Observable` model with async methods |
| Force unwrap optionals in views | Use `if let` or nil-coalescing for safe unwrapping |
| Create complex view hierarchies in one struct | Extract sub-views into separate structs |
| Use `@StateObject` on iOS 17+ | Use `@State` with `@Observable` class (iOS 17+) |
| Skip `#Preview` macros | Add previews for every view for rapid iteration |
| Use `NavigationView` in new projects | Use `NavigationStack` (iOS 16+) — NavigationView is deprecated |
| Mutate state during view body evaluation | Use `onAppear`, `.task`, or user-triggered actions for mutations |
