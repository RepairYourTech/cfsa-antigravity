---
name: c-cpp
description: C and C++ development patterns for systems programming. Covers memory management (RAII, smart pointers), header organization, build systems (CMake), modern C++ features (17/20/23), templates, move semantics, const correctness, sanitizers, and safe interop.
version: 1.0.0
---

# C/C++ Development Patterns

Expert guidance for writing safe, performant C and C++ code. Covers memory management with RAII and smart pointers, modern C++ features, build system organization, undefined behavior avoidance, sanitizer usage, and the discipline required for production systems programming.

## When to Use This Skill

- Building performance-critical systems (game engines, databases, compilers)
- Writing operating system components, drivers, or embedded firmware
- Creating libraries with C ABI for cross-language interop
- Implementing real-time systems with deterministic performance
- Developing scientific computing or numerical analysis code
- Building WebAssembly modules from C/C++ source

## Core Concepts

### 1. Memory Management: RAII and Smart Pointers

Resource Acquisition Is Initialization -- the foundation of safe C++.

```cpp
// RAII: constructor acquires, destructor releases
class FileHandle {
public:
    explicit FileHandle(const std::string& path)
        : handle_(std::fopen(path.c_str(), "r")) {
        if (!handle_) {
            throw std::runtime_error("Failed to open: " + path);
        }
    }

    ~FileHandle() {
        if (handle_) {
            std::fclose(handle_);
        }
    }

    // Delete copy (prevent double-free)
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;

    // Allow move
    FileHandle(FileHandle&& other) noexcept : handle_(other.handle_) {
        other.handle_ = nullptr;
    }

    FileHandle& operator=(FileHandle&& other) noexcept {
        if (this != &other) {
            if (handle_) std::fclose(handle_);
            handle_ = other.handle_;
            other.handle_ = nullptr;
        }
        return *this;
    }

    FILE* get() const { return handle_; }

private:
    FILE* handle_;
};

// Smart pointers -- prefer these over raw new/delete
#include <memory>

// unique_ptr: single ownership (default choice)
auto widget = std::make_unique<Widget>(42);
// widget automatically freed when it goes out of scope

// shared_ptr: shared ownership (use when truly needed)
auto shared = std::make_shared<Config>();
auto copy = shared; // Reference count incremented
// Freed when last shared_ptr is destroyed

// weak_ptr: non-owning observer (breaks reference cycles)
std::weak_ptr<Config> observer = shared;
if (auto locked = observer.lock()) {
    // Use locked -- it is a valid shared_ptr
}

// NEVER use raw new/delete in modern C++
// WRONG:
Widget* w = new Widget(42);
delete w;

// RIGHT:
auto w = std::make_unique<Widget>(42);
```

**Smart pointer decision matrix:**

| Situation | Use |
|-----------|-----|
| Single owner, clear lifetime | `std::unique_ptr` |
| Shared ownership needed | `std::shared_ptr` |
| Observer without ownership | `std::weak_ptr` |
| C API interop | Raw pointer (but wrap in RAII at boundary) |
| Stack allocation works | No pointer at all -- use value semantics |

### 2. Header Organization

```
project/
  include/
    mylib/
      mylib.h           # Public C API header
      config.hpp         # Public C++ header
  src/
    internal.hpp         # Private headers
    config.cpp
    parser.cpp
  tests/
    test_config.cpp
  CMakeLists.txt
```

```cpp
// include/mylib/config.hpp -- public header
#pragma once  // Preferred over include guards for modern compilers

#include <string>
#include <vector>
#include <optional>

namespace mylib {

struct Config {
    std::string host;
    int port = 8080;
    bool debug = false;
};

// Forward declare implementation details
class ConfigLoader;

[[nodiscard]] std::optional<Config> load_config(const std::string& path);

}  // namespace mylib

// src/internal.hpp -- private header (not installed/exported)
#pragma once

#include "mylib/config.hpp"
#include <fstream>

namespace mylib::detail {

Config parse_toml(std::istream& stream);
void validate(const Config& cfg);

}  // namespace mylib::detail
```

**Header rules:**

| Rule | Explanation |
|------|-------------|
| Use `#pragma once` | Simpler than traditional include guards |
| Forward declare when possible | Reduces compile time, breaks dependency cycles |
| Keep headers minimal | Only include what is needed for the declaration |
| Separate public and private headers | `include/` for public API, `src/` for internal |
| Use namespaces | Prevent name collisions across libraries |

### 3. Build Systems: CMake

```cmake
# CMakeLists.txt -- modern CMake (3.14+)
cmake_minimum_required(VERSION 3.14)
project(mylib VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Library target
add_library(mylib
    src/config.cpp
    src/parser.cpp
)

target_include_directories(mylib
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Compiler warnings (treat as errors in CI)
target_compile_options(mylib PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic -Werror>
    $<$<CXX_COMPILER_ID:MSVC>:/W4 /WX>
)

# Testing
option(MYLIB_BUILD_TESTS "Build tests" ON)
if(MYLIB_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Sanitizers (debug builds)
option(MYLIB_SANITIZERS "Enable sanitizers" OFF)
if(MYLIB_SANITIZERS)
    target_compile_options(mylib PUBLIC -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(mylib PUBLIC -fsanitize=address,undefined)
endif()
```

```cmake
# tests/CMakeLists.txt
find_package(Catch2 3 REQUIRED)

add_executable(tests
    test_config.cpp
    test_parser.cpp
)

target_link_libraries(tests PRIVATE mylib Catch2::Catch2WithMain)

include(Catch)
catch_discover_tests(tests)
```

### 4. Modern C++ Features

#### C++17

```cpp
// Structured bindings
auto [name, age] = get_user();  // Decompose pair/tuple/struct

std::map<std::string, int> scores = {{"Alice", 95}, {"Bob", 87}};
for (const auto& [name, score] : scores) {
    std::cout << name << ": " << score << "\n";
}

// std::optional
std::optional<User> find_user(int id) {
    if (auto it = users.find(id); it != users.end()) {
        return it->second;
    }
    return std::nullopt;
}

// Usage
if (auto user = find_user(42)) {
    std::cout << user->name << "\n";
}

// std::variant -- type-safe union
using Value = std::variant<int, double, std::string>;

void print_value(const Value& v) {
    std::visit([](const auto& val) {
        std::cout << val << "\n";
    }, v);
}

// std::string_view -- non-owning string reference
void process(std::string_view sv) {
    // No allocation, works with string, char*, string_view
    std::cout << sv.substr(0, 10) << "\n";
}

// if constexpr -- compile-time branching
template <typename T>
auto convert(T value) {
    if constexpr (std::is_integral_v<T>) {
        return static_cast<double>(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return static_cast<int>(value);
    } else {
        static_assert(false, "Unsupported type");
    }
}

// Fold expressions
template <typename... Args>
auto sum(Args... args) {
    return (args + ...);
}
```

#### C++20

```cpp
// Concepts -- constrain templates with readable syntax
template <typename T>
concept Arithmetic = std::is_arithmetic_v<T>;

template <typename T>
concept Printable = requires(T t) {
    { std::cout << t } -> std::same_as<std::ostream&>;
};

template <Arithmetic T>
T add(T a, T b) {
    return a + b;
}

// Ranges
#include <ranges>

auto even_squares = std::views::iota(1, 100)
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; })
    | std::views::take(10);

for (int val : even_squares) {
    std::cout << val << " ";
}

// Three-way comparison (spaceship operator)
struct Point {
    int x, y;
    auto operator<=>(const Point&) const = default;
};

// std::format (type-safe formatting)
#include <format>
std::string msg = std::format("Hello, {}! You are {} years old.", name, age);

// Coroutines (generator example)
#include <coroutine>

generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield a;
        auto temp = a;
        a = b;
        b = temp + b;
    }
}
```

#### C++23

```cpp
// std::expected -- Result type (like Rust's Result)
#include <expected>

std::expected<Config, std::string> load_config(const std::string& path) {
    auto data = read_file(path);
    if (!data) {
        return std::unexpected("File not found: " + path);
    }
    return parse(*data);
}

// Usage
auto config = load_config("settings.toml");
if (config) {
    use(*config);
} else {
    std::cerr << config.error() << "\n";
}

// std::print (replacing cout for formatted output)
#include <print>
std::println("Hello, {}!", name);

// Deducing this (explicit object parameter)
struct Widget {
    template <typename Self>
    auto&& get_name(this Self&& self) {
        return std::forward<Self>(self).name_;
    }
private:
    std::string name_;
};

// Multidimensional subscript operator
struct Matrix {
    double& operator[](size_t row, size_t col) {
        return data_[row * cols_ + col];
    }
};
```

### 5. Templates

```cpp
// Function template
template <typename T>
T clamp(T value, T low, T high) {
    if (value < low) return low;
    if (value > high) return high;
    return value;
}

// Class template
template <typename T, size_t N>
class FixedArray {
public:
    T& operator[](size_t i) {
        if (i >= N) throw std::out_of_range("Index out of bounds");
        return data_[i];
    }

    const T& operator[](size_t i) const {
        if (i >= N) throw std::out_of_range("Index out of bounds");
        return data_[i];
    }

    constexpr size_t size() const { return N; }

private:
    T data_[N]{};
};

// SFINAE replaced by concepts in C++20
// Old way (avoid):
template <typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
T old_way(T x) { return x * 2; }

// New way (prefer):
template <std::integral T>
T new_way(T x) { return x * 2; }

// Variadic templates
template <typename... Args>
void log(const std::string& fmt, Args&&... args) {
    std::cout << std::vformat(fmt, std::make_format_args(args...));
}

// CRTP (Curiously Recurring Template Pattern)
template <typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !(static_cast<const Derived&>(*this) == other);
    }
    bool operator>(const Derived& other) const {
        return other < static_cast<const Derived&>(*this);
    }
};

class Temperature : public Comparable<Temperature> {
public:
    explicit Temperature(double celsius) : celsius_(celsius) {}
    bool operator==(const Temperature& other) const { return celsius_ == other.celsius_; }
    bool operator<(const Temperature& other) const { return celsius_ < other.celsius_; }
private:
    double celsius_;
};
```

### 6. Move Semantics

```cpp
class Buffer {
public:
    explicit Buffer(size_t size) : size_(size), data_(new char[size]) {}

    // Copy constructor (expensive)
    Buffer(const Buffer& other) : size_(other.size_), data_(new char[other.size_]) {
        std::memcpy(data_, other.data_, size_);
    }

    // Move constructor (cheap -- steals resources)
    Buffer(Buffer&& other) noexcept : size_(other.size_), data_(other.data_) {
        other.size_ = 0;
        other.data_ = nullptr;
    }

    // Copy assignment
    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            Buffer temp(other);
            swap(temp);
        }
        return *this;
    }

    // Move assignment
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            other.data_ = nullptr;
            other.size_ = 0;
        }
        return *this;
    }

    ~Buffer() { delete[] data_; }

    void swap(Buffer& other) noexcept {
        std::swap(size_, other.size_);
        std::swap(data_, other.data_);
    }

private:
    size_t size_;
    char* data_;
};

// Perfect forwarding
template <typename T, typename... Args>
std::unique_ptr<T> make_unique_wrapper(Args&&... args) {
    return std::make_unique<T>(std::forward<Args>(args)...);
}

// Rule of Five: if you define any of destructor, copy/move constructor,
// copy/move assignment, you should define ALL of them (or = delete them).
// Rule of Zero: prefer classes that need NONE of them (use smart pointers).
```

### 7. Const Correctness

```cpp
class Database {
public:
    // const member function -- does not modify the object
    [[nodiscard]] size_t count() const { return records_.size(); }

    // const reference return -- prevents modification of internal data
    [[nodiscard]] const Record& get(size_t id) const {
        return records_.at(id);
    }

    // Non-const version for modification
    Record& get(size_t id) {
        return records_.at(id);
    }

    // const parameter -- function will not modify the argument
    void insert(const Record& record) {
        records_.push_back(record);
    }

    // Move overload -- takes ownership efficiently
    void insert(Record&& record) {
        records_.push_back(std::move(record));
    }

private:
    std::vector<Record> records_;
};

// constexpr -- evaluated at compile time
constexpr int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

static_assert(factorial(5) == 120, "Factorial computation failed");

// consteval (C++20) -- MUST be evaluated at compile time
consteval int compile_time_only(int x) {
    return x * x;
}
```

### 8. Undefined Behavior and Sanitizers

Common sources of undefined behavior:

| UB Source | Example | Safe Alternative |
|-----------|---------|-----------------|
| Null pointer dereference | `*nullptr` | Check before dereferencing, use `std::optional` |
| Buffer overflow | `arr[out_of_bounds]` | Use `std::vector::at()`, `std::span` |
| Signed integer overflow | `INT_MAX + 1` | Check before arithmetic, use unsigned |
| Use after free | `delete p; *p;` | Use smart pointers |
| Data race | Unsynchronized concurrent access | Use `std::mutex`, `std::atomic` |
| Uninitialized variable | `int x; use(x);` | Always initialize: `int x = 0;` |

```bash
# Compile with sanitizers during development and CI

# AddressSanitizer -- buffer overflows, use-after-free, leaks
g++ -fsanitize=address -fno-omit-frame-pointer -g main.cpp

# UndefinedBehaviorSanitizer -- signed overflow, null deref, etc.
g++ -fsanitize=undefined -g main.cpp

# MemorySanitizer (Clang only) -- uninitialized reads
clang++ -fsanitize=memory -fno-omit-frame-pointer -g main.cpp

# ThreadSanitizer -- data races
g++ -fsanitize=thread -g main.cpp

# Combine sanitizers (ASan + UBSan)
g++ -fsanitize=address,undefined -fno-omit-frame-pointer -g main.cpp
```

### 9. C Interop

```cpp
// C-compatible header (include from both C and C++)
#ifdef __cplusplus
extern "C" {
#endif

typedef struct MyHandle MyHandle;

MyHandle* mylib_create(const char* name);
void mylib_destroy(MyHandle* handle);
int mylib_process(MyHandle* handle, const char* input, char* output, size_t output_size);
const char* mylib_error(const MyHandle* handle);

#ifdef __cplusplus
}
#endif

// C++ implementation
extern "C" {

MyHandle* mylib_create(const char* name) {
    try {
        return reinterpret_cast<MyHandle*>(new MyLibImpl(name));
    } catch (...) {
        return nullptr;
    }
}

void mylib_destroy(MyHandle* handle) {
    delete reinterpret_cast<MyLibImpl*>(handle);
}

}  // extern "C"

// C++ wrapper for C library
class CLibWrapper {
public:
    CLibWrapper(const std::string& name)
        : handle_(mylib_create(name.c_str()), &mylib_destroy) {
        if (!handle_) {
            throw std::runtime_error("Failed to create handle");
        }
    }

    // RAII -- destructor calls mylib_destroy via unique_ptr deleter

private:
    std::unique_ptr<MyHandle, decltype(&mylib_destroy)> handle_;
};
```

### 10. STL Containers

| Container | Use Case | Lookup | Insert | Notes |
|-----------|----------|--------|--------|-------|
| `std::vector` | Default choice | O(n) | O(1) amortized | Cache-friendly, contiguous memory |
| `std::array` | Fixed size, stack | O(n) | N/A | No heap allocation |
| `std::unordered_map` | Key-value lookup | O(1) avg | O(1) avg | Hash table |
| `std::map` | Ordered key-value | O(log n) | O(log n) | Red-black tree |
| `std::string` | Text | O(n) | O(1) amortized | SSO for short strings |
| `std::span` (C++20) | Non-owning view | O(n) | N/A | Like string_view for arrays |
| `std::deque` | Front/back insert | O(n) | O(1) both ends | Not contiguous |
| `std::flat_map` (C++23) | Small ordered maps | O(log n) | O(n) | Sorted vector, cache-friendly |

```cpp
// Prefer vector unless you have a specific reason not to
std::vector<int> data;
data.reserve(1000);  // Pre-allocate to avoid reallocations

// Use emplace_back to construct in-place
std::vector<std::string> names;
names.emplace_back("Alice");  // Constructs string directly in vector

// Range-based erase (C++20)
std::erase_if(data, [](int x) { return x < 0; });
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| Raw `new`/`delete` | Memory leaks, double-free | `std::make_unique`, `std::make_shared` |
| C-style casts `(int)x` | Hides dangerous conversions | `static_cast`, `dynamic_cast` |
| `#define` for constants | No type safety, no scope | `constexpr` variables |
| `using namespace std;` in headers | Pollutes all includers | Use qualified names or targeted `using` |
| Macro functions | No type checking, surprising behavior | `constexpr` functions or templates |
| `std::endl` everywhere | Flushes buffer unnecessarily | Use `"\n"` for newlines |
| Catching exceptions by value | Object slicing | Catch by `const&` |

## Common Commands

```bash
# CMake build
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
ctest --test-dir build

# With sanitizers
cmake -B build-san -DCMAKE_BUILD_TYPE=Debug -DMYLIB_SANITIZERS=ON
cmake --build build-san
ctest --test-dir build-san

# Clang-tidy static analysis
clang-tidy src/*.cpp -- -std=c++20 -Iinclude

# Clang-format
clang-format -i src/*.cpp include/**/*.hpp
```

## Resources

- **C++ Core Guidelines**: https://isocpp.github.io/CppCoreGuidelines/
- **cppreference.com**: https://en.cppreference.com/
- **Compiler Explorer (Godbolt)**: https://godbolt.org/
- **C++ Weekly (Jason Turner)**: https://www.youtube.com/c/lefticus
- **Modern CMake**: https://cliutils.gitlab.io/modern-cmake/
- **Sanitizer Docs**: https://clang.llvm.org/docs/AddressSanitizer.html
