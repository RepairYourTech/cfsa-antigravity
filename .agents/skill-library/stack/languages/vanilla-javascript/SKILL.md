---
name: vanilla-javascript
description: Modern vanilla JavaScript patterns (ES2022+) without frameworks. Covers modules, async/await, Web APIs, DOM manipulation, event delegation, web components, Proxy/Reflect, iterators/generators, and no-framework application architecture.
version: 1.0.0
---

# Vanilla JavaScript Patterns (ES2022+)

Expert guidance for writing modern, production-grade JavaScript without frameworks. Covers ES modules, async patterns, Web APIs (IntersectionObserver, AbortController), DOM manipulation best practices, event delegation, Web Components, and the architectural patterns that make framework-free code maintainable.

## When to Use This Skill

- Building lightweight websites that do not need a framework
- Creating Web Components for use across any framework
- Adding interactive behavior to server-rendered pages
- Writing browser extensions or bookmarklets
- Building progressive enhancements for static sites
- Understanding core JavaScript before adopting a framework
- Creating embeddable widgets for third-party sites

## Core Concepts

### 1. Modules (import/export)

```javascript
// Named exports
// utils.js
export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

export function throttle(fn, ms) {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= ms) {
            lastCall = now;
            return fn(...args);
        }
    };
}

// Default export
// logger.js
export default class Logger {
    constructor(prefix) {
        this.prefix = prefix;
    }

    info(msg) {
        console.log(`[${this.prefix}] ${msg}`);
    }
}

// Importing
import Logger from "./logger.js";
import { debounce, throttle } from "./utils.js";
import * as utils from "./utils.js";

// Dynamic import (code splitting)
async function loadChart() {
    const { Chart } = await import("./chart.js");
    return new Chart(canvas);
}

// Import in HTML
// <script type="module" src="./app.js"></script>
```

### 2. Destructuring, Optional Chaining, Nullish Coalescing

```javascript
// Object destructuring with defaults
function createUser({ name, email, age = 0, role = "user" } = {}) {
    return { name, email, age, role };
}

// Nested destructuring
const {
    data: { users = [] },
    meta: { total = 0 }
} = apiResponse;

// Array destructuring
const [first, second, ...rest] = items;
const [, , third] = items; // Skip first two

// Optional chaining (?.)
const city = user?.address?.city;
const firstItem = list?.[0];
const result = obj?.method?.();

// Nullish coalescing (??) -- only null/undefined, NOT 0 or ""
const port = config.port ?? 3000;    // 0 is kept, null becomes 3000
const name = input ?? "anonymous";

// Nullish assignment (??=)
user.nickname ??= user.name;  // Only assigns if null/undefined

// Logical assignment (&&=, ||=)
config.debug &&= process.env.NODE_ENV !== "production";
options.timeout ||= 5000;

// IMPORTANT: ?? vs ||
const count = data.count ?? 0;  // Keeps 0, replaces null/undefined
const count2 = data.count || 0; // Replaces 0, "", false, null, undefined
// Use ?? when 0, "", or false are valid values
```

### 3. Promises and async/await

```javascript
// async/await -- preferred syntax for promises
async function fetchUser(id) {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
}

// Error handling with try/catch
async function loadData() {
    try {
        const user = await fetchUser("123");
        const orders = await fetchOrders(user.id);
        return { user, orders };
    } catch (error) {
        console.error("Failed to load data:", error.message);
        return null;
    }
}

// Concurrent execution with Promise.all
async function fetchAll(ids) {
    const promises = ids.map((id) => fetchUser(id));
    return Promise.all(promises); // Fails fast if any reject
}

// Promise.allSettled -- get all results regardless of failures
async function fetchAllSafe(ids) {
    const results = await Promise.allSettled(ids.map((id) => fetchUser(id)));
    return results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
}

// Promise.any -- first to resolve wins
async function fetchFromFastestMirror(urls) {
    return Promise.any(urls.map((url) => fetch(url).then((r) => r.json())));
}

// Timeout pattern
function withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
}

// Sequential async iteration
async function processSequentially(items) {
    const results = [];
    for (const item of items) {
        const result = await processItem(item);
        results.push(result);
    }
    return results;
}
```

### 4. Fetch API and AbortController

```javascript
// Basic fetch with error handling
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        try {
            error.data = await response.json();
        } catch {
            error.data = null;
        }
        throw error;
    }

    return response.json();
}

// POST request
async function createUser(userData) {
    return apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(userData),
    });
}

// AbortController for cancellation
function fetchWithAbort(url) {
    const controller = new AbortController();

    const promise = fetch(url, { signal: controller.signal })
        .then((r) => r.json());

    return { promise, abort: () => controller.abort() };
}

// Timeout with AbortController
async function fetchWithTimeout(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { signal: controller.signal });
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

// Abort previous request (search-as-you-type)
let currentController = null;

async function search(query) {
    // Cancel previous request
    currentController?.abort();
    currentController = new AbortController();

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            signal: currentController.signal,
        });
        return await response.json();
    } catch (error) {
        if (error.name === "AbortError") {
            return null; // Intentional cancellation, not an error
        }
        throw error;
    }
}
```

### 5. Web APIs

```javascript
// IntersectionObserver -- lazy loading, infinite scroll, animations
const observer = new IntersectionObserver(
    (entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target); // One-time observation
            }
        }
    },
    { threshold: 0.1, rootMargin: "50px" }
);

document.querySelectorAll(".lazy").forEach((el) => observer.observe(el));

// ResizeObserver -- respond to element size changes
const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const { width, height } = entry.contentRect;
        entry.target.dataset.size = width > 600 ? "large" : "small";
    }
});

resizeObserver.observe(document.querySelector(".responsive-container"));

// MutationObserver -- watch DOM changes
const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            console.log("Children changed:", mutation.addedNodes, mutation.removedNodes);
        }
    }
});

mutationObserver.observe(container, { childList: true, subtree: true });

// Broadcast Channel -- communicate between tabs
const channel = new BroadcastChannel("app-events");
channel.postMessage({ type: "logout" });
channel.addEventListener("message", (event) => {
    if (event.data.type === "logout") {
        window.location.href = "/login";
    }
});

// structuredClone -- deep copy (no functions or DOM nodes)
const original = { nested: { array: [1, 2, 3], date: new Date() } };
const cloned = structuredClone(original);
cloned.nested.array.push(4); // Does not affect original

// Clipboard API
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
```

### 6. DOM Manipulation Best Practices

```javascript
// Query elements
const element = document.querySelector(".my-class");
const elements = document.querySelectorAll("[data-action]");

// Create elements efficiently
function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === "class") {
            el.className = value;
        } else if (key === "style" && typeof value === "object") {
            Object.assign(el.style, value);
        } else if (key.startsWith("data-")) {
            el.dataset[key.slice(5)] = value;
        } else {
            el.setAttribute(key, value);
        }
    }
    for (const child of children) {
        if (typeof child === "string") {
            el.append(document.createTextNode(child));
        } else {
            el.append(child);
        }
    }
    return el;
}

// Batch DOM updates with DocumentFragment
function renderList(items, container) {
    const fragment = document.createDocumentFragment();
    for (const item of items) {
        fragment.append(
            createElement("li", { class: "item" }, [item.name])
        );
    }
    container.replaceChildren(fragment);
}

// Template element for complex HTML
function renderCard(data) {
    const template = document.querySelector("#card-template");
    const clone = template.content.cloneNode(true);
    clone.querySelector(".title").textContent = data.title;
    clone.querySelector(".body").textContent = data.body;
    return clone;
}

// Avoid layout thrashing -- batch reads and writes
function resizeElements(elements) {
    // Read all dimensions first
    const measurements = elements.map((el) => ({
        el,
        width: el.offsetWidth,
        height: el.offsetHeight,
    }));

    // Then write all changes
    for (const { el, width, height } of measurements) {
        el.style.width = `${width * 2}px`;
        el.style.height = `${height * 2}px`;
    }
}
```

### 7. Event Delegation

```javascript
// Event delegation -- one listener handles many elements
document.querySelector(".todo-list").addEventListener("click", (event) => {
    const target = event.target;

    if (target.matches(".delete-btn")) {
        const todoItem = target.closest(".todo-item");
        todoItem.remove();
        return;
    }

    if (target.matches(".toggle-btn")) {
        const todoItem = target.closest(".todo-item");
        todoItem.classList.toggle("completed");
        return;
    }

    if (target.matches(".edit-btn")) {
        const todoItem = target.closest(".todo-item");
        startEditing(todoItem);
        return;
    }
});

// Custom event system
class EventEmitter {
    #listeners = new Map();

    on(event, callback) {
        if (!this.#listeners.has(event)) {
            this.#listeners.set(event, new Set());
        }
        this.#listeners.get(event).add(callback);
        return () => this.off(event, callback); // Return unsubscribe function
    }

    off(event, callback) {
        this.#listeners.get(event)?.delete(callback);
    }

    emit(event, data) {
        for (const callback of this.#listeners.get(event) ?? []) {
            callback(data);
        }
    }
}

// CustomEvent for DOM events
function dispatchCustomEvent(element, name, detail) {
    element.dispatchEvent(
        new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
}
```

### 8. WeakMap, WeakSet, and Private State

```javascript
// WeakMap for private data (no memory leak)
const _private = new WeakMap();

class SecureStore {
    constructor(secret) {
        _private.set(this, { secret, cache: new Map() });
    }

    getSecret() {
        return _private.get(this).secret;
    }
}

// Private class fields (ES2022) -- preferred modern approach
class ModernStore {
    #secret;
    #cache = new Map();

    constructor(secret) {
        this.#secret = secret;
    }

    get secret() {
        return this.#secret;
    }

    #internalMethod() {
        // Truly private
    }
}

// WeakSet for tracking objects without preventing GC
const processed = new WeakSet();

function processOnce(obj) {
    if (processed.has(obj)) return;
    processed.add(obj);
    // Process object...
}

// WeakRef for caches (ES2021)
class ObjectCache {
    #cache = new Map();

    get(key) {
        const ref = this.#cache.get(key);
        if (!ref) return undefined;
        const value = ref.deref();
        if (value === undefined) {
            this.#cache.delete(key);
        }
        return value;
    }

    set(key, value) {
        this.#cache.set(key, new WeakRef(value));
    }
}
```

### 9. Proxy and Reflect

```javascript
// Validation proxy
function createValidated(schema) {
    return new Proxy(
        {},
        {
            set(target, prop, value) {
                const validator = schema[prop];
                if (validator && !validator(value)) {
                    throw new TypeError(
                        `Invalid value for ${String(prop)}: ${value}`
                    );
                }
                return Reflect.set(target, prop, value);
            },
        }
    );
}

const user = createValidated({
    name: (v) => typeof v === "string" && v.length > 0,
    age: (v) => typeof v === "number" && v >= 0 && v <= 150,
    email: (v) => typeof v === "string" && v.includes("@"),
});

user.name = "Alice"; // OK
// user.age = -1;    // Throws TypeError

// Observable proxy (reactive data)
function observable(target, onChange) {
    return new Proxy(target, {
        set(obj, prop, value) {
            const oldValue = obj[prop];
            const result = Reflect.set(obj, prop, value);
            if (oldValue !== value) {
                onChange(prop, value, oldValue);
            }
            return result;
        },
        deleteProperty(obj, prop) {
            const oldValue = obj[prop];
            const result = Reflect.deleteProperty(obj, prop);
            onChange(prop, undefined, oldValue);
            return result;
        },
    });
}

const state = observable({ count: 0 }, (prop, newVal) => {
    console.log(`${String(prop)} changed to ${newVal}`);
    render(); // Re-render on state change
});

state.count++; // Logs: "count changed to 1"
```

### 10. Web Components and Custom Elements

```javascript
// Custom element with Shadow DOM
class AppCounter extends HTMLElement {
    #count = 0;
    #shadow;

    static get observedAttributes() {
        return ["initial"];
    }

    constructor() {
        super();
        this.#shadow = this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.#render();
        this.#shadow
            .querySelector(".increment")
            .addEventListener("click", () => this.#increment());
        this.#shadow
            .querySelector(".decrement")
            .addEventListener("click", () => this.#decrement());
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "initial") {
            this.#count = parseInt(newValue, 10) || 0;
            this.#render();
        }
    }

    #increment() {
        this.#count++;
        this.#update();
        this.dispatchEvent(
            new CustomEvent("change", { detail: { count: this.#count } })
        );
    }

    #decrement() {
        this.#count--;
        this.#update();
        this.dispatchEvent(
            new CustomEvent("change", { detail: { count: this.#count } })
        );
    }

    #update() {
        const display = this.#shadow.querySelector(".count");
        if (display) display.textContent = this.#count;
    }

    #render() {
        this.#shadow.innerHTML = `
            <style>
                :host { display: inline-flex; gap: 8px; align-items: center; }
                button { padding: 4px 12px; cursor: pointer; }
                .count { font-weight: bold; min-width: 2ch; text-align: center; }
            </style>
            <button class="decrement">-</button>
            <span class="count">${this.#count}</span>
            <button class="increment">+</button>
        `;
    }
}

customElements.define("app-counter", AppCounter);

// Usage in HTML:
// <app-counter initial="5"></app-counter>
```

### 11. Iterators and Generators

```javascript
// Custom iterable
class Range {
    #start;
    #end;
    #step;

    constructor(start, end, step = 1) {
        this.#start = start;
        this.#end = end;
        this.#step = step;
    }

    [Symbol.iterator]() {
        let current = this.#start;
        const end = this.#end;
        const step = this.#step;

        return {
            next() {
                if (current < end) {
                    const value = current;
                    current += step;
                    return { value, done: false };
                }
                return { done: true };
            },
        };
    }
}

for (const n of new Range(0, 10, 2)) {
    console.log(n); // 0, 2, 4, 6, 8
}

// Generator function
function* fibonacci() {
    let a = 0;
    let b = 1;
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}

// Take first N from infinite generator
function* take(iterable, n) {
    let count = 0;
    for (const item of iterable) {
        if (count >= n) return;
        yield item;
        count++;
    }
}

const first10 = [...take(fibonacci(), 10)];

// Async generator
async function* streamEvents(url) {
    const response = await fetch(url);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
    }
}

// Consuming async generator
for await (const chunk of streamEvents("/api/stream")) {
    processChunk(chunk);
}
```

## Anti-Patterns

| Anti-Pattern | Why It Is Bad | Do This Instead |
|-------------|--------------|----------------|
| `var` declarations | Function-scoped, hoisting bugs | Use `const` by default, `let` when needed |
| `==` comparison | Type coercion surprises | Always use `===` and `!==` |
| `innerHTML` with user data | XSS vulnerability | Use `textContent` or sanitize |
| `document.write()` | Blocks parsing, breaks streaming | Use DOM APIs |
| Nested callbacks | Callback hell, hard to debug | Use async/await |
| `for...in` on arrays | Iterates prototype properties | Use `for...of` or array methods |
| `.then().catch()` chains | Harder to read and debug | Use async/await with try/catch |
| Modifying built-in prototypes | Breaks other code, conflicts | Use utility functions or subclassing |

## No-Framework Application Architecture

```javascript
// Simple state management
class Store {
    #state;
    #listeners = new Set();

    constructor(initialState) {
        this.#state = structuredClone(initialState);
    }

    getState() {
        return this.#state;
    }

    setState(updater) {
        const newState =
            typeof updater === "function" ? updater(this.#state) : updater;
        this.#state = { ...this.#state, ...newState };
        this.#notify();
    }

    subscribe(listener) {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    #notify() {
        for (const listener of this.#listeners) {
            listener(this.#state);
        }
    }
}

// Router
class Router {
    #routes = new Map();

    addRoute(path, handler) {
        this.#routes.set(path, handler);
    }

    start() {
        window.addEventListener("popstate", () => this.#resolve());
        document.addEventListener("click", (e) => {
            const link = e.target.closest("a[data-route]");
            if (link) {
                e.preventDefault();
                history.pushState(null, "", link.href);
                this.#resolve();
            }
        });
        this.#resolve();
    }

    #resolve() {
        const path = location.pathname;
        const handler = this.#routes.get(path);
        if (handler) handler();
    }
}
```

## Resources

- **MDN Web Docs**: https://developer.mozilla.org/
- **JavaScript.info**: https://javascript.info/
- **Web Components MDN**: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
- **Can I Use**: https://caniuse.com/
- **TC39 Proposals**: https://github.com/tc39/proposals
- **Web Platform Tests**: https://web-platform-tests.org/
