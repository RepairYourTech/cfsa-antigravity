---
name: react-composition-patterns
description: "Comprehensive React composition and component design guide covering compound components, render props, custom hooks, explicit variants, lifting state, slot-based composition, polymorphic components, controlled vs uncontrolled patterns, provider pattern, state machines, form patterns, modal management, and list/item patterns. Use when designing component APIs, building reusable UI libraries, or structuring complex component hierarchies."
version: 1.0.0
---

# React Composition Patterns

## 1. Philosophy

Component composition is about **building complex UIs from simple, reusable pieces without tight coupling**. The goal is an API that is obvious to consumers, flexible enough for real-world use cases, and impossible to misuse.

**Key principles**:
- Composition over configuration. Prefer children and slots over giant prop objects.
- Explicit over implicit. A component with 5 clear variants beats one with 15 boolean props.
- Inversion of control. Let the consumer decide layout and behavior, not the component.
- Single responsibility. Each component does one thing. Compose them for complex behavior.
- Type safety. Component APIs must be fully typed so misuse is a compile error, not a runtime bug.

---

## 2. Compound Components

Compound components share implicit state through React Context. The parent manages the state; children read from it. This gives consumers full control over layout and ordering while keeping behavior centralized.

### Basic Pattern

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";

// 1. Create context for shared state
interface AccordionContextValue {
  openItems: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion.Item must be used within an Accordion");
  }
  return context;
}

// 2. Parent component manages state
function Accordion({
  children,
  multiple = false,
}: {
  children: ReactNode;
  multiple?: boolean;
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenItems((prev) => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div role="region">{children}</div>
    </AccordionContext.Provider>
  );
}

// 3. Child components read shared state
function AccordionItem({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.has(id);

  return (
    <div>
      <button
        onClick={() => toggle(id)}
        aria-expanded={isOpen}
        aria-controls={`accordion-panel-${id}`}
      >
        {title}
      </button>
      {isOpen && (
        <div id={`accordion-panel-${id}`} role="region">
          {children}
        </div>
      )}
    </div>
  );
}

// 4. Attach as static properties
Accordion.Item = AccordionItem;

// 5. Usage -- consumer controls layout and ordering
<Accordion multiple>
  <Accordion.Item id="faq-1" title="What is this?">
    <p>A compound component example.</p>
  </Accordion.Item>
  <Accordion.Item id="faq-2" title="Why use this pattern?">
    <p>Flexible layout with shared state.</p>
  </Accordion.Item>
</Accordion>
```

### When to Use Compound Components

| Use When | Do Not Use When |
|----------|-----------------|
| Multiple sub-components share state | A single component with a few props suffices |
| Consumer needs layout control | The layout is always the same |
| The parent-child relationship is semantic | Components are unrelated |
| You want to avoid prop drilling | A simple callback prop would work |

---

## 3. Render Props and Children-as-Function

Render props pass rendering control to the consumer via a function. Use this when the component owns behavior but the consumer owns the visual output.

```tsx
interface MouseTrackerProps {
  children: (position: { x: number; y: number }) => ReactNode;
}

function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={(e) => setPosition({ x: e.clientX, y: e.clientY })}>
      {children(position)}
    </div>
  );
}

// Usage -- consumer decides what to render
<MouseTracker>
  {({ x, y }) => (
    <div>
      Mouse is at ({x}, {y})
    </div>
  )}
</MouseTracker>
```

### Modern Alternative: Custom Hooks

Render props are largely replaced by custom hooks. Prefer hooks unless you need to inject behavior into the JSX tree itself.

```tsx
// Prefer this
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      setPosition({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return position;
}

// Usage
function Component() {
  const { x, y } = useMousePosition();
  return <div>Mouse at ({x}, {y})</div>;
}
```

---

## 4. Custom Hooks for Logic Extraction

Custom hooks extract reusable stateful logic from components. The component handles rendering; the hook handles behavior.

```tsx
// hooks/use-async.ts
import { useState, useCallback } from "react";

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useAsync<T>(asyncFunction: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(async () => {
    setState({ data: null, error: null, loading: true });
    try {
      const data = await asyncFunction();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ data: null, error: err, loading: false });
      throw err;
    }
  }, [asyncFunction]);

  return { ...state, execute };
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const fetchUser = useCallback(() => api.getUser(userId), [userId]);
  const { data: user, loading, error, execute } = useAsync(fetchUser);

  useEffect(() => { execute(); }, [execute]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={execute} />;
  if (!user) return null;
  return <ProfileCard user={user} />;
}
```

### Hook Composition

Hooks compose naturally. Build complex behavior from simple hooks.

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  const fetchResults = useCallback(
    () => api.search(debouncedQuery),
    [debouncedQuery]
  );
  return useAsync(fetchResults);
}
```

---

## 5. Explicit Variants Over Conditional Rendering

When a component has multiple visual modes, use explicit variant components instead of piling boolean props onto one component.

```tsx
// BAD: Boolean props create an exponential combination space
<Button
  primary
  outline
  small
  loading
  iconOnly
  disabled
/>
// How many combinations is this? 2^6 = 64. Are they all valid?

// GOOD: Explicit variants with a discriminated union
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(variantStyles[variant], sizeStyles[size])}
      disabled={disabled || loading}
    >
      {loading && <Spinner size={size} />}
      {children}
    </button>
  );
}
```

### Separate Components for Separate Concerns

```tsx
// BAD: One component with conditional rendering for every case
function Card({ type, ...props }: { type: "user" | "product" | "article" }) {
  if (type === "user") return <div>...</div>;
  if (type === "product") return <div>...</div>;
  if (type === "article") return <div>...</div>;
}

// GOOD: Separate components sharing a common base
function CardBase({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border p-4", className)}>{children}</div>;
}

function UserCard({ user }: { user: User }) {
  return (
    <CardBase>
      <Avatar src={user.avatar} />
      <h3>{user.name}</h3>
    </CardBase>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <CardBase>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
    </CardBase>
  );
}
```

---

## 6. Lifting State Up

When two sibling components need to share state, lift the state to their closest common parent.

```tsx
// Problem: FilterBar and ResultsList both need the filter state
// Solution: Lift state to the parent

function SearchPage() {
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    sortBy: "relevance",
    query: "",
  });

  return (
    <div className="grid grid-cols-[250px_1fr]">
      <FilterBar filters={filters} onFiltersChange={setFilters} />
      <ResultsList filters={filters} />
    </div>
  );
}

// FilterBar only knows about its own UI concerns
function FilterBar({
  filters,
  onFiltersChange,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}) {
  return (
    <aside>
      <select
        value={filters.category}
        onChange={(e) =>
          onFiltersChange({ ...filters, category: e.target.value })
        }
      >
        <option value="all">All</option>
        <option value="books">Books</option>
      </select>
    </aside>
  );
}

// ResultsList only knows about displaying results
function ResultsList({ filters }: { filters: Filters }) {
  const results = useFilteredResults(filters);
  return (
    <ul>
      {results.map((r) => (
        <li key={r.id}>{r.title}</li>
      ))}
    </ul>
  );
}
```

---

## 7. Slot-Based Composition

Slots let consumers inject content into specific positions within a component. Use named props for slots instead of relying on children ordering.

```tsx
interface PageLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

function PageLayout({ header, sidebar, children, footer }: PageLayoutProps) {
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto]">
      <header>{header}</header>
      <div className="grid grid-cols-[250px_1fr]">
        <aside>{sidebar}</aside>
        <main>{children}</main>
      </div>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}

// Usage -- consumer fills each slot
<PageLayout
  header={<NavBar />}
  sidebar={<SideMenu />}
  footer={<FooterLinks />}
>
  <DashboardContent />
</PageLayout>
```

### Slot Pattern with Default Content

```tsx
interface DialogProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

function Dialog({ title, description, actions, children }: DialogProps) {
  return (
    <div role="dialog" aria-labelledby="dialog-title">
      <div id="dialog-title">{title}</div>
      {description && <div>{description}</div>}
      <div>{children}</div>
      <div className="flex justify-end gap-2">
        {actions ?? <button>Close</button>}
      </div>
    </div>
  );
}
```

---

## 8. Polymorphic Components (as Prop)

Polymorphic components let consumers change the rendered HTML element while preserving the component's styling and behavior.

```tsx
import { type ElementType, type ComponentPropsWithoutRef } from "react";

type TextProps<T extends ElementType = "span"> = {
  as?: T;
  size?: "sm" | "md" | "lg";
  weight?: "normal" | "medium" | "bold";
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "size" | "weight" | "children">;

function Text<T extends ElementType = "span">({
  as,
  size = "md",
  weight = "normal",
  children,
  className,
  ...props
}: TextProps<T>) {
  const Component = as || "span";

  return (
    <Component
      className={cn(
        sizeMap[size],
        weightMap[weight],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Usage -- same styling, different elements
<Text as="h1" size="lg" weight="bold">Page Title</Text>
<Text as="p" size="md">Body paragraph</Text>
<Text as="label" size="sm" htmlFor="email">Email</Text>
<Text as="a" href="/about" size="sm">About</Text>
```

---

## 9. Controlled vs Uncontrolled Components

A component is **controlled** when the parent owns its state. It is **uncontrolled** when it manages its own state internally. Good APIs support both.

```tsx
interface ToggleProps {
  // Controlled mode
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  // Uncontrolled mode
  defaultChecked?: boolean;
  // Shared
  label: string;
  disabled?: boolean;
}

function Toggle({
  checked: controlledChecked,
  onChange,
  defaultChecked = false,
  label,
  disabled = false,
}: ToggleProps) {
  // Internal state for uncontrolled mode
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  // Determine which mode we are in
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  function handleChange() {
    if (disabled) return;

    const nextChecked = !isChecked;

    if (!isControlled) {
      setInternalChecked(nextChecked);
    }

    onChange?.(nextChecked);
  }

  return (
    <button
      role="switch"
      aria-checked={isChecked}
      aria-label={label}
      disabled={disabled}
      onClick={handleChange}
    >
      <span className={isChecked ? "translate-x-5" : "translate-x-0"} />
    </button>
  );
}

// Uncontrolled -- component manages its own state
<Toggle label="Dark mode" defaultChecked />

// Controlled -- parent owns the state
const [isDark, setIsDark] = useState(false);
<Toggle label="Dark mode" checked={isDark} onChange={setIsDark} />
```

---

## 10. Provider Pattern

The Provider pattern uses Context to inject dependencies (services, configuration, theme) deep into the component tree without prop drilling.

```tsx
// contexts/feature-flags.tsx
import { createContext, useContext, type ReactNode } from "react";

interface FeatureFlags {
  newDashboard: boolean;
  betaSearch: boolean;
  darkMode: boolean;
}

const FeatureFlagContext = createContext<FeatureFlags | null>(null);

export function FeatureFlagProvider({
  flags,
  children,
}: {
  flags: FeatureFlags;
  children: ReactNode;
}) {
  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlag must be used within FeatureFlagProvider");
  }
  return context[flag];
}

// Usage in a component
function Dashboard() {
  const showNewDashboard = useFeatureFlag("newDashboard");

  if (showNewDashboard) {
    return <NewDashboard />;
  }
  return <LegacyDashboard />;
}
```

### Avoid Overusing Context

Context triggers re-renders for all consumers when the value changes. Split contexts by update frequency.

```tsx
// BAD: One giant context that changes frequently
const AppContext = createContext({
  user: null,
  theme: "light",
  notifications: [],
  mousePosition: { x: 0, y: 0 }, // changes 60fps
});

// GOOD: Split by update frequency
const UserContext = createContext<User | null>(null);         // rarely changes
const ThemeContext = createContext<Theme>("light");           // rarely changes
const NotificationContext = createContext<Notification[]>([]); // sometimes changes
// mousePosition should be a hook, not context
```

---

## 11. State Machines for Complex UI

When a component has many states with specific transition rules, use a state machine instead of multiple booleans.

```tsx
// Without state machine -- boolean soup
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
const [isRetrying, setIsRetrying] = useState(false);
// What happens when isLoading AND isError are both true?

// With a state machine -- impossible states are impossible
type UploadState =
  | { status: "idle" }
  | { status: "selecting" }
  | { status: "uploading"; progress: number }
  | { status: "success"; url: string }
  | { status: "error"; message: string };

type UploadAction =
  | { type: "SELECT_FILE" }
  | { type: "START_UPLOAD" }
  | { type: "PROGRESS"; progress: number }
  | { type: "COMPLETE"; url: string }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (state.status) {
    case "idle":
      if (action.type === "SELECT_FILE") return { status: "selecting" };
      return state;
    case "selecting":
      if (action.type === "START_UPLOAD") return { status: "uploading", progress: 0 };
      if (action.type === "RESET") return { status: "idle" };
      return state;
    case "uploading":
      if (action.type === "PROGRESS") return { status: "uploading", progress: action.progress };
      if (action.type === "COMPLETE") return { status: "success", url: action.url };
      if (action.type === "FAIL") return { status: "error", message: action.message };
      return state;
    case "success":
      if (action.type === "RESET") return { status: "idle" };
      return state;
    case "error":
      if (action.type === "START_UPLOAD") return { status: "uploading", progress: 0 };
      if (action.type === "RESET") return { status: "idle" };
      return state;
    default:
      return state;
  }
}

function FileUploader() {
  const [state, dispatch] = useReducer(uploadReducer, { status: "idle" });

  // Each status has exactly one UI representation
  switch (state.status) {
    case "idle":
      return <button onClick={() => dispatch({ type: "SELECT_FILE" })}>Upload</button>;
    case "selecting":
      return <FileSelector onSelect={() => dispatch({ type: "START_UPLOAD" })} />;
    case "uploading":
      return <ProgressBar progress={state.progress} />;
    case "success":
      return <SuccessMessage url={state.url} onReset={() => dispatch({ type: "RESET" })} />;
    case "error":
      return <ErrorMessage message={state.message} onRetry={() => dispatch({ type: "START_UPLOAD" })} />;
  }
}
```

### XState for Complex Machines

For multi-step wizards, workflows, or anything with parallel states, use XState.

```tsx
import { createMachine, assign } from "xstate";
import { useMachine } from "@xstate/react";

const checkoutMachine = createMachine({
  id: "checkout",
  initial: "cart",
  context: { items: [], address: null, payment: null },
  states: {
    cart: { on: { PROCEED: "address" } },
    address: {
      on: {
        SET_ADDRESS: { actions: assign({ address: (_, event) => event.data }) },
        PROCEED: { target: "payment", guard: "hasAddress" },
        BACK: "cart",
      },
    },
    payment: {
      on: {
        SET_PAYMENT: { actions: assign({ payment: (_, event) => event.data }) },
        SUBMIT: "processing",
        BACK: "address",
      },
    },
    processing: {
      invoke: {
        src: "processOrder",
        onDone: "confirmation",
        onError: "error",
      },
    },
    confirmation: { type: "final" },
    error: { on: { RETRY: "processing" } },
  },
});
```

---

## 12. Form Component Patterns

### Field Component Pattern

Encapsulate label, input, error, and description into a reusable Field component.

```tsx
interface FieldProps {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}

function Field({ label, error, description, required, children }: FieldProps) {
  const id = useId();

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {cloneElement(children as React.ReactElement, {
        id,
        "aria-describedby": description ? `${id}-desc` : undefined,
        "aria-invalid": !!error,
      })}
      {description && (
        <p id={`${id}-desc`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

// Usage
<Field label="Email" error={errors.email} required>
  <input type="email" name="email" />
</Field>
```

### Multi-Step Form Pattern

```tsx
interface Step {
  id: string;
  title: string;
  component: React.ComponentType<StepProps>;
  validate: (data: FormData) => Record<string, string> | null;
}

function MultiStepForm({ steps }: { steps: Step[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const StepComponent = steps[currentStep].component;

  function handleNext(stepData: Record<string, unknown>) {
    const errors = steps[currentStep].validate(stepData);
    if (errors) return errors;

    setFormData((prev) => ({ ...prev, ...stepData }));
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
    return null;
  }

  return (
    <div>
      <StepIndicator steps={steps} current={currentStep} />
      <StepComponent
        data={formData}
        onNext={handleNext}
        onBack={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
      />
    </div>
  );
}
```

---

## 13. Modal and Dialog Management

### Portal-Based Modal

```tsx
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Trap focus inside modal
    } else {
      previousFocus.current?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative bg-white rounded-lg p-6">
        {children}
      </div>
    </div>,
    document.body
  );
}
```

### Declarative Modal Management

```tsx
// hooks/use-modal.ts
function useModal() {
  const [isOpen, setIsOpen] = useState(false);

  const modal = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((prev) => !prev),
      props: { open: isOpen, onClose: () => setIsOpen(false) },
    }),
    [isOpen]
  );

  return modal;
}

// Usage
function UserList() {
  const deleteModal = useModal();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  function handleDelete(user: User) {
    setSelectedUser(user);
    deleteModal.open();
  }

  return (
    <div>
      {users.map((user) => (
        <UserRow key={user.id} user={user} onDelete={() => handleDelete(user)} />
      ))}
      <ConfirmDialog
        {...deleteModal.props}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.name}?`}
        onConfirm={() => deleteUser(selectedUser!.id)}
      />
    </div>
  );
}
```

---

## 14. List and Item Patterns

### Consistent List API

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyState?: ReactNode;
  loading?: boolean;
  loadingSkeleton?: ReactNode;
}

function List<T>({
  items,
  renderItem,
  keyExtractor,
  emptyState,
  loading,
  loadingSkeleton,
}: ListProps<T>) {
  if (loading && loadingSkeleton) return <>{loadingSkeleton}</>;
  if (items.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <ul role="list">
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
<List
  items={users}
  keyExtractor={(user) => user.id}
  renderItem={(user) => <UserCard user={user} />}
  emptyState={<EmptyState message="No users found" />}
  loading={isLoading}
  loadingSkeleton={<UserListSkeleton count={5} />}
/>
```

### Selectable List Pattern

```tsx
function useSelection<T>(
  items: T[],
  keyExtractor: (item: T) => string
) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((item: T) => {
    const key = keyExtractor(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [keyExtractor]);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(items.map(keyExtractor)));
  }, [items, keyExtractor]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const isSelected = useCallback(
    (item: T) => selectedKeys.has(keyExtractor(item)),
    [selectedKeys, keyExtractor]
  );

  return {
    selectedKeys,
    selectedCount: selectedKeys.size,
    toggleItem,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected: selectedKeys.size === items.length && items.length > 0,
  };
}
```

---

## 15. Anti-Patterns

### NEVER

- Use boolean props for mutually exclusive states (`isPrimary` and `isSecondary` on the same component)
- Deeply nest context providers when a single provider with composed state would work
- Use `cloneElement` to inject props when composition or render props are clearer
- Build "God components" with 20+ props -- decompose into compound components
- Store UI state in global state management (Redux, Zustand) -- use local state or context
- Create wrapper components that just pass all props through to a child
- Use `children` for multiple unrelated slots -- use named props instead
- Couple component logic to a specific data fetching library

### ALWAYS

- Provide TypeScript types for all component props
- Include `children` in the type when the component accepts arbitrary content
- Use `ReactNode` for slot types (not `JSX.Element` or `React.ReactElement`)
- Make components work in both controlled and uncontrolled modes when sensible
- Throw descriptive errors when compound component children are used outside their parent
- Test components in isolation with different prop combinations
- Document which props are required vs optional with TypeScript
- Use discriminated unions for variant props instead of string unions when variants have different data shapes

---

## 16. Decision Guide

```
                    +----------------------------+
                    | Need shared implicit state |
                    | across siblings?           |
                    +-----------+----------------+
                        YES     |          NO
                    +-----------v---+  +---v-------------------+
                    | Compound      |  | Need layout control   |
                    | Components    |  | for consumer?         |
                    +---------------+  +---+-------------------+
                                       YES |          NO
                                   +-------v------+  +--v-----------------+
                                   | Slot-based   |  | Need to share     |
                                   | Composition  |  | logic, not UI?    |
                                   +--------------+  +--+-----------------+
                                                    YES |          NO
                                                +-------v------+  +--v-----------+
                                                | Custom Hook  |  | Simple Props |
                                                +--------------+  +--------------+
```
