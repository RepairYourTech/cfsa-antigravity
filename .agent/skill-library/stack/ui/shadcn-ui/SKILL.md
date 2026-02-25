---
name: shadcn-ui
description: "Comprehensive shadcn/ui guide covering component installation, customization, theming, forms, data tables, composition patterns, and accessibility. Use when building UIs with shadcn/ui, customizing components, implementing forms with react-hook-form + zod, or building data tables."
version: 1.0.0
---

# shadcn/ui

## 1. Philosophy

shadcn/ui is **not a component library**. It is a collection of reusable components that you copy into your project and own. You can modify them freely. There is no `node_modules` dependency to update -- the code is yours.

**Key implications**:
- Components live in your codebase (typically `src/components/ui/`)
- You can and should customize them to match your design system
- Updates are opt-in: re-run the CLI to pull new versions, then merge
- No version lock-in, no breaking upgrades forced on you

---

## 2. Installation and CLI

### Initial Setup

```bash
# Initialize shadcn/ui in your project (interactive)
npx shadcn@latest init

# Non-interactive with defaults
npx shadcn@latest init -d
```

The init command:
1. Creates `components.json` (configuration)
2. Sets up CSS variables for theming
3. Configures `cn()` utility (`lib/utils.ts`)
4. Sets up Tailwind CSS configuration

### Adding Components

```bash
# Add a single component
npx shadcn@latest add button

# Add multiple components at once
npx shadcn@latest add button card dialog input label

# Add all components
npx shadcn@latest add --all

# View available components
npx shadcn@latest add --list
```

### Configuration (components.json)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## 3. Theming with CSS Variables

### Theme Structure

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    /* ... override all variables for dark mode */
  }
}
```

### Custom Brand Colors

```css
:root {
  /* Override primary to your brand color */
  --primary: 221 83% 53%;           /* Blue */
  --primary-foreground: 0 0% 100%;

  /* Add custom semantic colors */
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 100%;
}
```

### Dark Mode Implementation

```tsx
// Using next-themes
// app/providers.tsx
'use client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}

// Theme toggle component
'use client';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

## 4. Component Composition Patterns

### Extending Components with Variants

```tsx
// components/ui/button.tsx -- the base component (installed by CLI)
// Add custom variants by editing the cva() call directly

import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Add your own variants:
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        // Custom size:
        xs: 'h-7 rounded px-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### Composing Higher-Level Components

Build domain-specific components from shadcn/ui primitives.

```tsx
// components/confirm-dialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 5. Forms with react-hook-form + Zod

This is the recommended pattern for forms in shadcn/ui.

```tsx
// Install dependencies: react-hook-form, @hookform/resolvers, zod

// 1. Define schema
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  role: z.enum(['user', 'admin', 'moderator'], { required_error: 'Please select a role' }),
  notifications: z.boolean().default(false),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// 2. Build the form
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      bio: '',
      notifications: false,
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    // values is fully typed and validated
    await updateProfile(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about yourself" className="resize-none" {...field} />
              </FormControl>
              <FormDescription>Max 500 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Notifications</FormLabel>
                <FormDescription>Receive email notifications.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 6. Data Table with TanStack Table

```tsx
// 1. Define columns
'use client';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type User = { id: string; name: string; email: string; role: string; active: boolean };

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('role')}</Badge>,
  },
  {
    accessorKey: 'active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.getValue('active') ? 'default' : 'secondary'}>
        {row.getValue('active') ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.id)}>
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

// 2. Use in a page (server component fetches data, client component renders table)
// app/users/page.tsx
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';

export default async function UsersPage() {
  const users = await db.query.users.findMany();
  return <DataTable columns={columns} data={users} />;
}
```

---

## 7. Toast / Sonner Notifications

```tsx
// Setup: add <Toaster /> to your root layout
import { Toaster } from '@/components/ui/sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

// Usage anywhere in client components
import { toast } from 'sonner';

function handleSave() {
  toast.promise(saveData(), {
    loading: 'Saving...',
    success: 'Changes saved successfully',
    error: 'Failed to save changes',
  });
}

// Variants
toast('Default notification');
toast.success('Operation completed');
toast.error('Something went wrong');
toast.warning('Check your input');
toast.info('New update available');

// With action
toast('File deleted', {
  action: { label: 'Undo', onClick: () => restoreFile() },
});
```

---

## 8. Common Patterns

### Command Palette (cmdk)

```tsx
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export function CommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => router.push('/dashboard')}>Dashboard</CommandItem>
          <CommandItem onSelect={() => router.push('/settings')}>Settings</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => setTheme('dark')}>Dark Mode</CommandItem>
          <CommandItem onSelect={() => setTheme('light')}>Light Mode</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

### Responsive Sheet/Dialog

Use `Dialog` on desktop, `Drawer` on mobile.

```tsx
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

export function ResponsiveModal({ open, onOpenChange, title, children }: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
        <div className="p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
```

---

## 9. Accessibility

shadcn/ui components are built on Radix UI primitives, which provide:

- Full keyboard navigation (Tab, Arrow keys, Enter, Escape)
- ARIA attributes automatically applied
- Focus management and focus trapping in modals
- Screen reader announcements

**Your responsibilities**:
- Always provide text content or `sr-only` labels for icon-only buttons
- Use `FormLabel` with form controls (linked via `htmlFor`)
- Set meaningful `aria-label` on `DialogTitle` and `AlertDialogTitle`
- Test with keyboard navigation (no mouse)
- Verify color contrast meets WCAG 2.1 AA (4.5:1 for text)

```tsx
// Icon-only button: always include sr-only text
<Button variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
  <span className="sr-only">Delete item</span>
</Button>

// Visually hidden dialog title (when using a custom header)
<DialogHeader>
  <DialogTitle className="sr-only">Edit Profile</DialogTitle>
  <div>Your custom header content</div>
</DialogHeader>
```

---

## 10. Extending Without Breaking

When you customize a shadcn/ui component, follow these patterns to keep future CLI updates mergeable:

```tsx
// GOOD: Add variants to the existing cva() config
// The CLI overwrites the file, but your additions are easy to re-apply

// GOOD: Wrap the base component in a domain-specific component
// components/app-button.tsx
import { Button, type ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

export function AppButton({ loading, children, disabled, ...props }: AppButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

// BAD: Modifying the base component in ways that are hard to merge
// If the CLI re-generates button.tsx, your changes are lost
```

---

## 11. Critical Reminders

### ALWAYS

- Use `cn()` for conditional class merging (never raw string concatenation)
- Provide `sr-only` text for icon-only buttons
- Use `FormField` + `FormItem` + `FormLabel` + `FormControl` + `FormMessage` for forms
- Set `asChild` on triggers when wrapping custom elements
- Test keyboard navigation on dialogs, dropdowns, and menus
- Use CSS variables for theming (not hardcoded colors)

### NEVER

- Install shadcn/ui as an npm package (it is a CLI copy tool, not a dependency)
- Override Radix UI accessibility attributes
- Remove `role`, `aria-*`, or `data-state` attributes from components
- Use `z-index` wars -- shadcn/ui manages stacking contexts via Radix portals
- Hardcode colors instead of using semantic CSS variables (`--primary`, `--destructive`, etc.)
- Skip the `<Toaster />` in the root layout when using toast notifications
