---
name: authentication-ui-flows
description: "Design and implement authentication user interfaces including login, registration, password reset, MFA, OAuth consent, session expiry, and account linking flows. Use when building auth pages, login forms, or user onboarding."
version: 1.0.0
---

# Authentication UI Flows

Authentication is the front door of your application. These patterns ensure a secure, accessible, and user-friendly auth experience.

## Login Page

### Standard Email + Password

```tsx
function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(LoginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    const result = await signIn(data.email, data.password);
    if (!result.success) {
      // SECURITY: Never reveal whether email exists or password is wrong
      setError('root', { message: 'Invalid email or password' });
      return;
    }
    // Redirect to intended destination or dashboard
    window.location.href = result.redirectTo ?? '/dashboard';
  };

  return (
    <main className="auth-layout">
      <div className="auth-card">
        <h1>Sign in</h1>

        {errors.root && (
          <div role="alert" className="auth-error">{errors.root.message}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field-group">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="username"
                   aria-invalid={!!errors.email}
                   aria-describedby={errors.email ? 'email-error' : undefined}
                   {...register('email')} />
            {errors.email && <p id="email-error" className="field-error">{errors.email.message}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password"
                   aria-invalid={!!errors.password}
                   {...register('password')} />
            <a href="/forgot-password" className="field-link">Forgot password?</a>
          </div>

          <label className="checkbox-label">
            <input type="checkbox" {...register('rememberMe')} />
            Remember me for 30 days
          </label>

          <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider" role="separator">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">
          <button type="button" onClick={() => signInWithProvider('google')}>
            <GoogleIcon aria-hidden="true" /> Sign in with Google
          </button>
          <button type="button" onClick={() => signInWithProvider('github')}>
            <GitHubIcon aria-hidden="true" /> Sign in with GitHub
          </button>
        </div>

        <p className="auth-footer">
          Don't have an account? <a href="/register">Create one</a>
        </p>
      </div>
    </main>
  );
}
```

### Security Rules for Login UI

| Rule | Implementation |
|------|---------------|
| No username enumeration | Always say "Invalid email or password" regardless of which is wrong |
| Timing-safe feedback | Server response time must not differ between valid/invalid email |
| Rate limit feedback | After N failures: "Too many attempts. Try again in X minutes." |
| CAPTCHA placement | Show CAPTCHA after 3 failed attempts, not on first visit |
| No password in URL | Use POST, never GET with password in query string |
| HTTPS only | Redirect HTTP to HTTPS, set HSTS header |

---

## Registration Flow

### Progressive Profiling

Collect only what you need upfront. Ask for details later.

**Step 1: Essentials only**
```typescript
const RegistrationStep1Schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one number'),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

**Password strength indicator:**
```tsx
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const strength = checks.filter((c) => c.met).length;
  const strengthLabel = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  return (
    <div aria-label={`Password strength: ${strengthLabel}`} role="status">
      <div className="strength-bar">
        <div className="strength-fill" style={{ width: `${(strength / 4) * 100}%` }}
             data-strength={strengthLabel.toLowerCase()} />
      </div>
      <ul className="strength-checks" aria-label="Password requirements">
        {checks.map((check) => (
          <li key={check.label} aria-label={`${check.label}: ${check.met ? 'met' : 'not met'}`}>
            {check.met ? '\u2713' : '\u2717'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Email Verification

```tsx
function EmailVerificationPage() {
  const [status, setStatus] = useState<'pending' | 'verified' | 'expired' | 'error'>('pending');

  return (
    <main className="auth-layout">
      <div className="auth-card">
        {status === 'pending' && (
          <>
            <h1>Check your email</h1>
            <p>We sent a verification link to <strong>{email}</strong>.</p>
            <p>Click the link in the email to verify your account.</p>
            <button type="button" onClick={resendVerification} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </button>
            <p className="hint">Check your spam folder if you don't see the email.</p>
          </>
        )}

        {status === 'verified' && (
          <>
            <h1>Email verified</h1>
            <p>Your account is ready. <a href="/login">Sign in</a></p>
          </>
        )}

        {status === 'expired' && (
          <>
            <h1>Link expired</h1>
            <p>This verification link has expired.</p>
            <button type="button" onClick={resendVerification}>Send a new link</button>
          </>
        )}
      </div>
    </main>
  );
}
```

---

## Password Reset Flow

### Step 1: Request Reset

```tsx
function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  // SECURITY: Always show success message, even if email does not exist
  return submitted ? (
    <div className="auth-card">
      <h1>Check your email</h1>
      <p>If an account exists with that email, we sent a password reset link.</p>
      <p className="hint">The link expires in 1 hour.</p>
    </div>
  ) : (
    <div className="auth-card">
      <h1>Reset your password</h1>
      <p>Enter your email and we'll send a reset link.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="username" required />
        <button type="submit">Send reset link</button>
      </form>
      <a href="/login">Back to sign in</a>
    </div>
  );
}
```

### Step 2: Set New Password

```tsx
function ResetPasswordPage({ token }: { token: string }) {
  return (
    <div className="auth-card">
      <h1>Set a new password</h1>
      <form onSubmit={handleSubmit}>
        {/* Hidden email for password manager association */}
        <input type="hidden" autoComplete="username" value={email} />

        <label htmlFor="password">New password</label>
        <input id="password" type="password" autoComplete="new-password" />
        <PasswordStrength password={watchedPassword} />

        <label htmlFor="confirmPassword">Confirm new password</label>
        <input id="confirmPassword" type="password" autoComplete="new-password" />

        <button type="submit">Reset password</button>
      </form>
    </div>
  );
}
```

---

## MFA Enrollment and Challenge

### MFA Enrollment

```tsx
function MFAEnrollmentPage() {
  const [method, setMethod] = useState<'totp' | 'sms' | null>(null);

  return (
    <div className="auth-card">
      <h1>Set up two-factor authentication</h1>

      {!method && (
        <div className="mfa-method-picker">
          <button onClick={() => setMethod('totp')}>
            <AuthenticatorIcon aria-hidden="true" />
            <span>Authenticator app</span>
            <span className="hint">Recommended</span>
          </button>
          <button onClick={() => setMethod('sms')}>
            <PhoneIcon aria-hidden="true" />
            <span>Text message (SMS)</span>
          </button>
        </div>
      )}

      {method === 'totp' && (
        <>
          <p>Scan this QR code with your authenticator app:</p>
          <img src={qrCodeUrl} alt="QR code for authenticator app setup" />
          <details>
            <summary>Can't scan? Enter the key manually</summary>
            <code className="manual-key" aria-label="Manual setup key">{secretKey}</code>
          </details>
          <label htmlFor="totp-code">Enter the 6-digit code from your app</label>
          <input id="totp-code" type="text" inputMode="numeric" autoComplete="one-time-code"
                 pattern="[0-9]{6}" maxLength={6} />
          <button type="submit">Verify and enable</button>
        </>
      )}
    </div>
  );
}
```

### MFA Challenge

```tsx
function MFAChallengeModal() {
  return (
    <div role="dialog" aria-labelledby="mfa-title" aria-modal="true">
      <h2 id="mfa-title">Two-factor authentication</h2>
      <p>Enter the 6-digit code from your authenticator app.</p>

      <form onSubmit={handleVerify}>
        <label htmlFor="mfa-code" className="visually-hidden">Authentication code</label>
        <input id="mfa-code" type="text" inputMode="numeric"
               autoComplete="one-time-code" autoFocus
               pattern="[0-9]{6}" maxLength={6}
               aria-describedby="mfa-hint" />
        <p id="mfa-hint" className="hint">Open your authenticator app to find the code.</p>

        <button type="submit" disabled={isVerifying}>
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      <button type="button" onClick={switchToRecoveryCode} className="link-button">
        Use a recovery code instead
      </button>
    </div>
  );
}
```

---

## Session Expiry Handling

### Silent Refresh

```typescript
// Refresh token before it expires
function setupTokenRefresh(expiresAt: number): void {
  const refreshBuffer = 60_000; // Refresh 1 minute before expiry
  const timeout = expiresAt - Date.now() - refreshBuffer;

  if (timeout <= 0) {
    refreshToken();
    return;
  }

  setTimeout(async () => {
    const result = await refreshToken();
    if (result.success) {
      setupTokenRefresh(result.expiresAt);
    } else {
      showSessionExpiredModal();
    }
  }, timeout);
}
```

### Session Expired Modal

```tsx
function SessionExpiredModal() {
  return (
    <div role="alertdialog" aria-labelledby="session-title" aria-describedby="session-desc" aria-modal="true">
      <h2 id="session-title">Session expired</h2>
      <p id="session-desc">Your session has expired. Sign in again to continue.</p>
      <div className="modal-actions">
        <button onClick={() => redirectToLogin({ returnTo: window.location.pathname })}>
          Sign in
        </button>
      </div>
    </div>
  );
}
```

---

## "Remember Me" UX

| Option | Session Duration | Implementation |
|--------|-----------------|----------------|
| Unchecked | Browser session (closes on tab close) | Session cookie (no `max-age`) |
| Checked | 30 days | Persistent cookie with `max-age=2592000` |

**Security considerations:**
- "Remember me" should extend the refresh token lifetime, not remove re-authentication for sensitive actions
- Sensitive actions (change password, add payment) should always require recent authentication regardless of "remember me"

---

## Account Linking

```tsx
function LinkedAccountsSettings() {
  const linkedProviders = useLinkedProviders();

  return (
    <section>
      <h2>Linked accounts</h2>
      <p>Sign in with any of these providers.</p>

      <ul className="provider-list">
        {providers.map((provider) => {
          const isLinked = linkedProviders.includes(provider.id);
          return (
            <li key={provider.id}>
              <provider.icon aria-hidden="true" />
              <span>{provider.name}</span>
              {isLinked ? (
                <button onClick={() => unlinkProvider(provider.id)}
                        aria-label={`Unlink ${provider.name} account`}>
                  Unlink
                </button>
              ) : (
                <button onClick={() => linkProvider(provider.id)}
                        aria-label={`Link ${provider.name} account`}>
                  Link
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="hint">You must keep at least one sign-in method active.</p>
    </section>
  );
}
```

---

## Error States

| Error | User-Facing Message | Notes |
|-------|---------------------|-------|
| Invalid credentials | "Invalid email or password" | Never reveal which field is wrong |
| Account locked | "Account locked. Check email for unlock instructions." | After N failed attempts |
| Rate limited | "Too many attempts. Try again in 15 minutes." | Show countdown timer |
| Email not verified | "Please verify your email. [Resend link]" | Include resend action |
| OAuth error | "Sign in with [Provider] failed. Try again or use email." | Offer alternative |
| Network error | "Connection problem. Check your internet and try again." | Offer retry |
| Token expired | "This link has expired. [Request a new one]" | Password reset, verification |
| Server error | "Something went wrong on our end. Try again shortly." | Log details server-side |

---

## Mobile-Responsive Auth Layouts

```css
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1rem;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
}

/* On mobile, auth card fills the screen */
@media (max-width: 480px) {
  .auth-layout {
    align-items: flex-start;
    padding: 0;
  }

  .auth-card {
    max-width: none;
    min-height: 100dvh;
    padding: 1.5rem;
    border-radius: 0;
  }
}

/* Inputs should be at least 44px tall for touch targets */
.auth-card input,
.auth-card button,
.auth-card select {
  min-height: 44px;
  font-size: 1rem; /* Prevents iOS zoom on focus */
}
```

---

## Loading States

```tsx
function AuthSkeleton() {
  return (
    <div className="auth-card" aria-busy="true" aria-label="Loading authentication form">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-input" />
      <div className="skeleton skeleton-input" />
      <div className="skeleton skeleton-button" />
    </div>
  );
}
```

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| "Email not found" on login | "Invalid email or password" (timing-safe) |
| Password visible in URL params | POST request body only |
| Auto-redirect after login without checking destination | Validate redirect URL is same-origin |
| Showing CAPTCHA on first visit | Show after 3 failed attempts |
| Infinite session with no re-auth | Require re-auth for sensitive actions |
| OAuth popup without fallback | Support redirect flow for popup blockers |
| Storing tokens in localStorage | Use httpOnly cookies for tokens |
| Magic link that never expires | Expire in 15 minutes, single-use |

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
