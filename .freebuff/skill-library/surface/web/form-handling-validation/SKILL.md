---
name: form-handling-validation
description: "Comprehensive form patterns including client+server validation with shared Zod schemas, react-hook-form integration, multi-step wizards, file uploads, accessible error handling, and dirty state tracking. Use when building forms, validation flows, or form UX."
version: 1.0.0
---

# Form Handling & Validation

Build forms that validate correctly on both client and server, communicate errors clearly, and handle edge cases like file uploads, multi-step flows, and unsaved changes.

## Core Principle: Single Schema, Shared Validation

Define the validation schema once in Zod. Derive TypeScript types from it. Use the same schema on client and server.

```typescript
// src/schemas/contact.schema.ts
import { z } from 'zod';

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.enum(['support', 'sales', 'feedback'], {
    errorMap: () => ({ message: 'Please select a subject' }),
  }),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be under 2000 characters'),
  attachments: z.array(z.instanceof(File)).max(3, 'Maximum 3 files allowed').optional(),
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;
```

**Server-side validation (API route):**
```typescript
// src/pages/api/contact.ts
import { ContactFormSchema } from '@/schemas/contact.schema';

export async function POST({ request }: APIContext) {
  const body = await request.json();
  const result = ContactFormSchema.safeParse(body);

  if (!result.success) {
    return new Response(JSON.stringify({
      error: 'Validation failed',
      fields: result.error.flatten().fieldErrors,
    }), { status: 422 });
  }

  // result.data is typed as ContactFormData
  await sendContactEmail(result.data);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
```

---

## react-hook-form Patterns

### Basic Form with Zod Resolver

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContactFormSchema, type ContactFormData } from '@/schemas/contact.schema';

function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
    reset,
    setError,
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: undefined,
      message: '',
    },
    mode: 'onBlur', // Validate on blur, not on every keystroke
  });

  const onSubmit = async (data: ContactFormData) => {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.json();
      // Map server errors back to fields
      if (body.fields) {
        for (const [field, messages] of Object.entries(body.fields)) {
          setError(field as keyof ContactFormData, {
            message: (messages as string[])[0],
          });
        }
      } else {
        setError('root', { message: body.error ?? 'Submission failed' });
      }
      return;
    }

    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {errors.root && (
        <div role="alert" className="form-error-banner">
          {errors.root.message}
        </div>
      )}

      <div className="field-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" className="field-error" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

### Controller for Custom Components

Use `Controller` for components that do not expose a standard `ref` (selects, date pickers, rich text editors).

```tsx
import { Controller, useForm } from 'react-hook-form';

function FormWithCustomSelect() {
  const { control, handleSubmit } = useForm<ContactFormData>({
    resolver: zodResolver(ContactFormSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="subject"
        control={control}
        render={({ field, fieldState }) => (
          <div className="field-group">
            <label htmlFor="subject">Subject</label>
            <CustomSelect
              id="subject"
              options={subjectOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? 'subject-error' : undefined}
            />
            {fieldState.error && (
              <p id="subject-error" className="field-error" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />
    </form>
  );
}
```

---

## Error Messaging UX

### Timing

| Strategy | When to Validate | Best For |
|----------|-----------------|----------|
| `onBlur` | When field loses focus | Most forms --- gives user time to finish typing |
| `onChange` | Every keystroke after first blur | Password strength, character counters |
| `onSubmit` | Only on submit | Simple forms, less noise |
| `onTouched` | After first blur, then onChange | Recommended default for complex forms |

### Inline Errors

```tsx
// Reusable field error component
function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;

  return (
    <p id={id} className="field-error" role="alert">
      <svg aria-hidden="true" className="error-icon">{/* icon */}</svg>
      {error}
    </p>
  );
}
```

### Error Summary

Show an error summary at the top of the form on submit. Focus it so screen readers announce it.

```tsx
function ErrorSummary({ errors }: { errors: Record<string, { message?: string }> }) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const errorEntries = Object.entries(errors).filter(([, e]) => e.message);

  useEffect(() => {
    if (errorEntries.length > 0) {
      summaryRef.current?.focus();
    }
  }, [errorEntries.length]);

  if (errorEntries.length === 0) return null;

  return (
    <div ref={summaryRef} role="alert" tabIndex={-1} className="error-summary">
      <h2>There {errorEntries.length === 1 ? 'is 1 error' : `are ${errorEntries.length} errors`}</h2>
      <ul>
        {errorEntries.map(([field, error]) => (
          <li key={field}>
            <a href={`#${field}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Multi-Step Forms (Wizard Pattern)

### Schema Per Step

```typescript
// Step schemas
export const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
});

export const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().regex(/^\d{5}$/, 'Enter a valid 5-digit postal code'),
});

export const PreferencesSchema = z.object({
  newsletter: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
});

// Combined schema for final submission
export const RegistrationSchema = PersonalInfoSchema
  .merge(AddressSchema)
  .merge(PreferencesSchema);
```

### Multi-Step State Management

```tsx
type WizardState = z.infer<typeof RegistrationSchema>;

function RegistrationWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<WizardState>>({});

  const steps = [
    { schema: PersonalInfoSchema, title: 'Personal Info', component: PersonalInfoStep },
    { schema: AddressSchema, title: 'Address', component: AddressStep },
    { schema: PreferencesSchema, title: 'Preferences', component: PreferencesStep },
  ];

  const currentStep = steps[step];

  function handleStepComplete(stepData: Record<string, unknown>) {
    const merged = { ...formData, ...stepData };
    setFormData(merged);

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Final submission
      const result = RegistrationSchema.safeParse(merged);
      if (result.success) {
        submitRegistration(result.data);
      }
    }
  }

  return (
    <div>
      {/* Progress indicator */}
      <nav aria-label="Registration progress">
        <ol>
          {steps.map((s, i) => (
            <li key={s.title} aria-current={i === step ? 'step' : undefined}>
              <span className={i < step ? 'completed' : i === step ? 'current' : 'upcoming'}>
                {s.title}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <h2>{currentStep.title}</h2>
      <currentStep.component
        defaultValues={formData}
        schema={currentStep.schema}
        onComplete={handleStepComplete}
        onBack={step > 0 ? () => setStep(step - 1) : undefined}
      />
    </div>
  );
}
```

### Persist State Across Page Reloads

```typescript
function useFormPersistence<T>(key: string, defaultValues: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValues;
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValues;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  function clear() {
    sessionStorage.removeItem(key);
    setState(defaultValues);
  }

  return [state, setState, clear] as const;
}
```

---

## File Upload Handling

### Zod Schema for Files

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const FileUploadSchema = z.object({
  files: z
    .array(
      z.instanceof(File)
        .refine((file) => file.size <= MAX_FILE_SIZE, 'File must be under 5MB')
        .refine((file) => ACCEPTED_TYPES.includes(file.type), 'Unsupported file type')
    )
    .min(1, 'At least one file is required')
    .max(5, 'Maximum 5 files'),
});
```

### Drag-and-Drop Upload Component

```tsx
function FileDropzone({ onFiles, maxFiles = 5 }: { onFiles: (files: File[]) => void; maxFiles?: number }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files).slice(0, maxFiles);
    onFiles(files);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Upload files. Click or drag and drop."
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
        className="visually-hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <p>{isDragging ? 'Drop files here' : 'Drag files here or click to browse'}</p>
      <p className="hint">Max {maxFiles} files, up to 5MB each. JPEG, PNG, WebP, or PDF.</p>
    </div>
  );
}
```

### Upload Progress

```typescript
async function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (percent: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      resolve(new Response(xhr.response, { status: xhr.status }));
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}
```

---

## Autofill and Autocomplete

Use correct `autocomplete` attributes so browsers and password managers can assist users.

```html
<!-- Login form -->
<input type="email" autocomplete="username" />
<input type="password" autocomplete="current-password" />

<!-- Registration form -->
<input type="text" autocomplete="given-name" />
<input type="text" autocomplete="family-name" />
<input type="email" autocomplete="email" />
<input type="password" autocomplete="new-password" />

<!-- Address form -->
<input type="text" autocomplete="street-address" />
<input type="text" autocomplete="address-level2" /> <!-- city -->
<input type="text" autocomplete="postal-code" />
<select autocomplete="country">...</select>

<!-- Payment form -->
<input type="text" autocomplete="cc-name" />
<input type="text" autocomplete="cc-number" inputmode="numeric" />
<input type="text" autocomplete="cc-exp" />
<input type="text" autocomplete="cc-csc" />

<!-- One-time codes (MFA) -->
<input type="text" autocomplete="one-time-code" inputmode="numeric" />
```

---

## Double-Submission Prevention

```tsx
function SubmitButton({ isSubmitting, label = 'Submit' }: { isSubmitting: boolean; label?: string }) {
  return (
    <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
      {isSubmitting ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>Submitting...</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
```

**Server-side idempotency:**
```typescript
// Include an idempotency key in the form
const idempotencyKey = crypto.randomUUID();

// Server checks: if this key was already processed, return the cached response
```

---

## Dirty State and Unsaved Changes Warning

```tsx
function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Modern browsers ignore custom messages but still show the prompt
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}

// Usage in form component
function EditProfileForm() {
  const { formState: { isDirty }, handleSubmit, reset } = useForm(/* ... */);

  useUnsavedChangesWarning(isDirty);

  // For SPA navigation, also intercept route changes:
  // - React Router: useBlocker() or <Prompt />
  // - Next.js: router.events.on('routeChangeStart', handler)
}
```

---

## Dynamic Form Fields

### Field Arrays

```tsx
import { useFieldArray, useForm } from 'react-hook-form';

const InvoiceSchema = z.object({
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description required'),
    quantity: z.number().min(1, 'Minimum 1'),
    unitPrice: z.number().min(0, 'Price cannot be negative'),
  })).min(1, 'At least one line item is required'),
});

function InvoiceForm() {
  const { control, register, handleSubmit } = useForm({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: { lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset>
        <legend>Line Items</legend>
        {fields.map((field, index) => (
          <div key={field.id} className="line-item-row">
            <input {...register(`lineItems.${index}.description`)}
                   aria-label={`Item ${index + 1} description`} />
            <input {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                   type="number" aria-label={`Item ${index + 1} quantity`} />
            <input {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                   type="number" step="0.01" aria-label={`Item ${index + 1} unit price`} />
            <button type="button" onClick={() => remove(index)}
                    aria-label={`Remove item ${index + 1}`}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
          Add line item
        </button>
      </fieldset>
    </form>
  );
}
```

### Conditional Fields

```typescript
// Schema with conditional validation
const EventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('in-person'),
    venue: z.string().min(1, 'Venue is required for in-person events'),
    capacity: z.number().min(1),
  }),
  z.object({
    type: z.literal('virtual'),
    meetingUrl: z.string().url('Please enter a valid URL'),
  }),
]);
```

```tsx
function EventForm() {
  const { watch, register } = useForm({ resolver: zodResolver(EventSchema) });
  const eventType = watch('type');

  return (
    <form>
      <select {...register('type')}>
        <option value="in-person">In-Person</option>
        <option value="virtual">Virtual</option>
      </select>

      {eventType === 'in-person' && (
        <>
          <input {...register('venue')} placeholder="Venue name" />
          <input {...register('capacity', { valueAsNumber: true })} type="number" />
        </>
      )}

      {eventType === 'virtual' && (
        <input {...register('meetingUrl')} placeholder="https://meet.example.com/..." />
      )}
    </form>
  );
}
```

---

## Common Anti-Patterns

| Anti-Pattern | Why It Is Wrong | Correct Approach |
|-------------|-----------------|------------------|
| Validate only on client | Server receives unvalidated data | Use the same Zod schema on both client and server |
| Validate only on submit | User discovers all errors at once | Validate on blur, show errors inline |
| `placeholder` as label | Disappears on input, fails a11y | Use `<label>`, placeholder is a hint only |
| Alert on every keystroke | Noisy, especially for screen readers | Debounce validation, validate on blur |
| Reset form on error | User loses all input | Keep values, highlight errors |
| Disable submit until valid | User cannot discover what is wrong | Keep button enabled, show errors on submit |
| Generic "Something went wrong" | User cannot fix the problem | Show field-level errors with corrective guidance |
| No loading state on submit | User clicks multiple times | Disable button + show spinner during submission |
| Custom validation before Zod | Two sources of truth | Put all validation in the Zod schema |
| `required` without `aria-required` | Screen readers may not announce | Use both `required` and `aria-required="true"` |

## References

- [react-hook-form docs](https://react-hook-form.com/)
- [Zod docs](https://zod.dev/)
- [@hookform/resolvers](https://github.com/react-hook-form/resolvers)
- [WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [GOV.UK Form Design Patterns](https://design-system.service.gov.uk/patterns/)
