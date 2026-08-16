---
name: flutter
description: "Expert Flutter guide covering widget composition, state management (Riverpod, BLoC), navigation (GoRouter), Dart best practices (null safety, freezed, sealed classes), platform channels, performance (const widgets, RepaintBoundary, DevTools), testing (widget tests, golden tests, integration), and deployment (Fastlane, Codemagic). Use when building cross-platform apps with Flutter."
version: 1.0.0
---

# Flutter Expert Guide

> Use this skill when building iOS/Android/Web/Desktop apps with Flutter. Targets Flutter 3.x with Dart 3.x.

## When to Use This Skill

- Building cross-platform apps (iOS, Android, Web, Desktop)
- Designing widget hierarchies and custom UI
- Implementing state management patterns
- Optimizing Flutter rendering performance
- Writing widget and integration tests

## When NOT to Use This Skill

- React Native projects → use React Native skill
- Native iOS only → use SwiftUI
- Web-only → use a frontend framework
- Game development → use Flame engine or Godot

---

## 1. Project Structure (CRITICAL)

```
lib/
├── main.dart              # Entry point
├── app/                   # App-level config
│   ├── app.dart           # MaterialApp / GoRouter setup
│   └── theme.dart         # ThemeData
├── features/              # Feature-first organization
│   ├── auth/
│   │   ├── data/          # Repositories, data sources
│   │   ├── domain/        # Models, use cases
│   │   └── presentation/  # Screens, widgets, controllers
│   └── home/
│       ├── data/
│       ├── domain/
│       └── presentation/
├── shared/                # Cross-feature code
│   ├── widgets/           # Reusable UI components
│   ├── extensions/        # Dart extensions
│   └── utils/             # Helpers
└── l10n/                  # Localization
```

---

## 2. Widget Composition (CRITICAL)

### Composition Over Inheritance

```dart
// ✅ Small, focused widgets
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.imageUrl,
    this.size = 40,
  });

  final String imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(size / 2),
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        placeholder: (_, __) => const CircularProgressIndicator(),
        errorWidget: (_, __, ___) => const Icon(Icons.person),
      ),
    );
  }
}
```

### Use `const` Constructors

```dart
// ✅ const prevents unnecessary rebuilds
const SizedBox(height: 16);
const Divider();
const Text('Static text');

// ✅ const constructor in custom widgets
class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(child: child);
}
```

---

## 3. State Management

### Riverpod (Recommended)

```dart
// Provider definition
final userProvider = FutureProvider.autoDispose<User>((ref) async {
  final repository = ref.watch(userRepositoryProvider);
  return repository.getCurrentUser();
});

// Notifier for mutable state
@riverpod
class Counter extends _$Counter {
  @override
  int build() => 0;

  void increment() => state++;
  void decrement() => state--;
}

// Consuming in a widget
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userProvider);

    return userAsync.when(
      data: (user) => Text('Hello, ${user.name}'),
      loading: () => const CircularProgressIndicator(),
      error: (err, stack) => Text('Error: $err'),
    );
  }
}
```

### BLoC Pattern

```dart
// Events
sealed class AuthEvent {}
class LoginRequested extends AuthEvent {
  final String email;
  final String password;
  LoginRequested({required this.email, required this.password});
}

// States
sealed class AuthState {}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthSuccess extends AuthState {
  final User user;
  AuthSuccess(this.user);
}
class AuthFailure extends AuthState {
  final String message;
  AuthFailure(this.message);
}

// Bloc
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._authRepository) : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
  }

  final AuthRepository _authRepository;

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final user = await _authRepository.login(event.email, event.password);
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }
}
```

---

## 4. Navigation (GoRouter)

```dart
final router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final isLoggedIn = /* check auth */;
    if (!isLoggedIn && !state.matchedLocation.startsWith('/auth')) {
      return '/auth/login';
    }
    return null;
  },
  routes: [
    ShellRoute(
      builder: (context, state, child) => ScaffoldWithNavBar(child: child),
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/profile/:userId',
          builder: (context, state) {
            final userId = state.pathParameters['userId']!;
            return ProfileScreen(userId: userId);
          },
        ),
      ],
    ),
  ],
);
```

---

## 5. Dart Best Practices

### Null Safety & Pattern Matching

```dart
// ✅ Exhaustive pattern matching (Dart 3)
String describeStatus(AuthState state) => switch (state) {
  AuthInitial() => 'Not started',
  AuthLoading() => 'Loading...',
  AuthSuccess(:final user) => 'Welcome, ${user.name}',
  AuthFailure(:final message) => 'Error: $message',
};

// ✅ Null-aware operators
final name = user?.name ?? 'Anonymous';
final items = list?.where((i) => i.isActive).toList() ?? [];
```

### Freezed (Immutable Models)

```dart
@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    required String email,
    @Default(false) bool isVerified,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

---

## 6. Performance

| Rule | Detail |
|------|--------|
| Use `const` constructors | Prevents widget rebuild when parent rebuilds |
| `RepaintBoundary` | Isolates expensive painting operations |
| `ListView.builder` | Lazy builds only visible items |
| Avoid `setState` at top level | Rebuilds entire subtree; use granular state |
| Profile with DevTools | Use Flutter DevTools timeline to find jank |
| `compute()` for heavy work | Isolate heavy computation to background |

---

## 7. Testing

```dart
// Widget test
testWidgets('displays user name', (tester) async {
  await tester.pumpWidget(
    const MaterialApp(home: UserCard(name: 'Alice')),
  );
  expect(find.text('Alice'), findsOneWidget);
});

// Golden test
testWidgets('matches golden', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: AppButton(text: 'OK')));
  await expectLater(find.byType(AppButton), matchesGoldenFile('button.png'));
});
```

---

## 8. Common Anti-Patterns

1. **God widgets** — split into small, focused widgets (one job each)
2. **Business logic in widgets** — extract to repositories / use cases
3. **Not using `const`** — every static widget should be `const`
4. **setState for complex state** — use Riverpod or BLoC
5. **Hardcoded strings** — use `l10n` / ARB files for localization
6. **Ignoring platform conventions** — use `Cupertino` widgets on iOS, `Material` on Android
7. **No error boundaries** — always handle `.error` state in async providers

---

## References

- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Language](https://dart.dev/language)
- [Riverpod](https://riverpod.dev/)
- [GoRouter](https://pub.dev/packages/go_router)
- [Flutter Performance](https://docs.flutter.dev/perf)
