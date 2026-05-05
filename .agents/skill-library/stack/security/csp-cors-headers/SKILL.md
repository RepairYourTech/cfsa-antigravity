---
name: csp-cors-headers
description: "Content Security Policy, CORS, and security headers configuration for web applications. Use when setting up CSP directives, configuring cross-origin requests, implementing nonce-based policies, or adding security headers (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) in Express, Next.js, Astro, or nginx."
version: 1.0.0
---

# CSP, CORS, and Security Headers

**Status**: Production Ready
**Last Updated**: 2026-02-17
**Dependencies**: None (standalone skill)

---

## Use This Skill When

- Configuring Content Security Policy for a web application
- Setting up CORS for API endpoints consumed by different origins
- Adding security headers to HTTP responses
- Debugging CSP violations or CORS errors
- Implementing nonce-based CSP for inline scripts
- Configuring HSTS, X-Frame-Options, or Permissions-Policy

## Do Not Use This Skill When

- You need application-level security patterns (use owasp-web-security skill)
- You need encryption or token management (use crypto-patterns skill)
- You need rate limiting or abuse protection (use rate-limiting skill)

---

## Content Security Policy (CSP)

CSP controls which resources the browser is allowed to load. It is the primary
defense against XSS, clickjacking, and data injection attacks.

### CSP Directives Reference

| Directive | Controls | Example |
|-----------|----------|---------|
| `default-src` | Fallback for all resource types | `default-src 'self'` |
| `script-src` | JavaScript sources | `script-src 'self' 'nonce-abc123'` |
| `style-src` | CSS sources | `style-src 'self' 'unsafe-inline'` |
| `img-src` | Image sources | `img-src 'self' data: https:` |
| `connect-src` | XHR, Fetch, WebSocket targets | `connect-src 'self' https://api.example.com` |
| `font-src` | Web font sources | `font-src 'self' https://fonts.gstatic.com` |
| `frame-src` | iframe sources | `frame-src 'none'` |
| `frame-ancestors` | Who can embed this page | `frame-ancestors 'none'` |
| `media-src` | Audio and video sources | `media-src 'self'` |
| `object-src` | Plugin sources (Flash, etc.) | `object-src 'none'` |
| `base-uri` | Allowed base URLs | `base-uri 'self'` |
| `form-action` | Form submission targets | `form-action 'self'` |
| `worker-src` | Web Worker sources | `worker-src 'self' blob:` |
| `manifest-src` | Web App Manifest source | `manifest-src 'self'` |
| `report-uri` | Where to send violation reports (deprecated) | `report-uri /csp-report` |
| `report-to` | Reporting API endpoint name | `report-to csp-endpoint` |

### CSP Source Values

| Value | Meaning |
|-------|---------|
| `'self'` | Same origin only |
| `'none'` | Block everything |
| `'unsafe-inline'` | Allow inline scripts/styles (avoid if possible) |
| `'unsafe-eval'` | Allow eval() and similar (avoid) |
| `'nonce-{base64}'` | Allow specific inline elements with matching nonce |
| `'strict-dynamic'` | Trust scripts loaded by already-trusted scripts |
| `https:` | Any HTTPS URL |
| `data:` | Data URIs (use sparingly) |
| `blob:` | Blob URIs |
| `*.example.com` | Wildcard subdomain |

### Strict CSP (Recommended)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic';
  style-src 'self' 'nonce-{RANDOM}';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-src 'none';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  report-to csp-endpoint
```

### Nonce-Based CSP

Every page load generates a unique nonce. Only inline scripts/styles with the
matching nonce attribute are allowed to execute.

```typescript
// Express middleware for nonce-based CSP
import crypto from "crypto";
import { RequestHandler } from "express";

export const cspMiddleware: RequestHandler = (req, res, next) => {
  // Generate a unique nonce per request
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.cspNonce = nonce;

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.example.com",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  res.setHeader("Content-Security-Policy", csp);
  next();
};
```

```html
<!-- Using the nonce in HTML -->
<script nonce="<%= cspNonce %>">
  // This inline script will execute because it has the matching nonce
  console.log("Allowed by CSP");
</script>

<script>
  // This inline script will be BLOCKED -- no nonce
  console.log("Blocked by CSP");
</script>
```

### CSP Reporting

```typescript
// Report-To header for CSP violation reports
app.use((req, res, next) => {
  res.setHeader("Report-To", JSON.stringify({
    group: "csp-endpoint",
    max_age: 86400,
    endpoints: [{ url: "/api/csp-report" }],
  }));
  next();
});

// CSP report handler
app.post("/api/csp-report", express.json({ type: "application/csp-report" }), (req, res) => {
  const report = req.body["csp-report"];
  logger.warn({
    type: "csp-violation",
    blockedUri: report["blocked-uri"],
    violatedDirective: report["violated-directive"],
    documentUri: report["document-uri"],
    sourceFile: report["source-file"],
    lineNumber: report["line-number"],
  });
  res.status(204).end();
});
```

---

## CORS (Cross-Origin Resource Sharing)

CORS controls which origins can make requests to your API from a browser.

### How CORS Works

1. Browser sends request with `Origin` header
2. For "simple" requests (GET, HEAD, POST with standard content types): server
   responds with `Access-Control-Allow-Origin`
3. For "preflighted" requests (PUT, DELETE, custom headers, JSON content type):
   browser sends OPTIONS request first, server responds with CORS headers

### CORS Headers Reference

| Header | Purpose | Example |
|--------|---------|---------|
| `Access-Control-Allow-Origin` | Allowed origins | `https://app.example.com` |
| `Access-Control-Allow-Methods` | Allowed HTTP methods | `GET, POST, PUT, DELETE` |
| `Access-Control-Allow-Headers` | Allowed request headers | `Content-Type, Authorization` |
| `Access-Control-Allow-Credentials` | Allow cookies/auth | `true` |
| `Access-Control-Expose-Headers` | Headers readable by client | `X-Request-Id` |
| `Access-Control-Max-Age` | Preflight cache duration (seconds) | `86400` |

### Express CORS Configuration

```typescript
import cors from "cors";

// Strict CORS -- specific origins only
const ALLOWED_ORIGINS = [
  "https://app.example.com",
  "https://admin.example.com",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id", "X-RateLimit-Remaining"],
  credentials: true,     // Allow cookies
  maxAge: 86400,          // Cache preflight for 24 hours
}));
```

```typescript
// Per-route CORS (when different routes need different policies)
import cors from "cors";

const publicCors = cors({ origin: "*", credentials: false });
const privateCors = cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
});

app.get("/api/public/status", publicCors, statusHandler);
app.get("/api/user/profile", privateCors, profileHandler);
```

### CORS Anti-Patterns

| Anti-Pattern | Risk | Fix |
|-------------|------|-----|
| `Access-Control-Allow-Origin: *` with credentials | Browsers reject this combination | Specify exact origins |
| Reflecting the Origin header without validation | Any site can make requests | Validate against allowlist |
| Wildcard `*` on authenticated endpoints | Any origin can read responses | Restrict to known origins |
| Not handling preflight (OPTIONS) | PUT/DELETE/JSON requests fail | Configure CORS middleware properly |
| Overly broad `Access-Control-Allow-Headers` | Expands attack surface | List only needed headers |

---

## Security Headers

### Complete Security Headers Configuration

```typescript
// Express middleware -- all security headers in one place
import { RequestHandler } from "express";

export const securityHeaders: RequestHandler = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Control referrer information
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // HTTP Strict Transport Security (2 years, include subdomains, preload)
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Permissions Policy (disable unused browser features)
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=()"
  );

  // Prevent XSS in older browsers (modern browsers use CSP instead)
  res.setHeader("X-XSS-Protection", "0");

  // Cross-Origin policies
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  next();
};

app.use(securityHeaders);
```

### Header Details

#### HSTS (HTTP Strict Transport Security)

Forces browsers to use HTTPS for all future requests to the domain.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- `max-age=63072000` -- Remember for 2 years
- `includeSubDomains` -- Apply to all subdomains
- `preload` -- Submit to browser preload list (permanent HTTPS)

**Warning**: Only add `preload` after confirming ALL subdomains support HTTPS.
Preload list inclusion is difficult to reverse.

#### X-Frame-Options

Prevents the page from being embedded in iframes (clickjacking defense).

| Value | Meaning |
|-------|---------|
| `DENY` | Never allow framing |
| `SAMEORIGIN` | Allow framing by same origin only |
| `ALLOW-FROM https://example.com` | Allow specific origin (deprecated, use CSP frame-ancestors) |

**Recommendation**: Use `DENY` and CSP `frame-ancestors 'none'` together.

#### Referrer-Policy

Controls how much referrer information is sent with requests.

| Value | Behavior |
|-------|----------|
| `no-referrer` | Never send referrer |
| `same-origin` | Send referrer only for same-origin requests |
| `strict-origin` | Send origin (not path) for same-protocol requests |
| `strict-origin-when-cross-origin` | Full URL for same-origin, origin only for cross-origin (recommended) |

#### Permissions-Policy

Disable or restrict browser features your application does not use.

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self), usb=(), bluetooth=(), accelerometer=(), gyroscope=()
```

- `()` -- Disabled entirely
- `(self)` -- Allowed for same origin only
- `(self "https://partner.com")` -- Allowed for same origin and specific partner

---

## Framework-Specific Configuration

### Astro

```typescript
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
  server: {
    headers: {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  },
});
```

```typescript
// src/middleware.ts (Astro middleware for dynamic CSP nonces)
import { defineMiddleware } from "astro:middleware";
import crypto from "crypto";

export const onRequest = defineMiddleware(async (context, next) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  context.locals.nonce = nonce;

  const response = await next();

  // Clone response to add headers
  const newResponse = new Response(response.body, response);

  newResponse.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ")
  );

  newResponse.headers.set("X-Frame-Options", "DENY");
  newResponse.headers.set("X-Content-Type-Options", "nosniff");
  newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  newResponse.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  return newResponse;
});
```

### Next.js

```typescript
// next.config.js
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};
```

```typescript
// middleware.ts (Next.js middleware for nonce-based CSP)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const response = NextResponse.next();

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);

  return response;
}
```

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    # CSP (static -- for dynamic nonces, use application-level middleware)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'" always;

    # CORS for API endpoints
    location /api/ {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://app.example.com" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            return 204;
        }

        add_header Access-Control-Allow-Origin "https://app.example.com" always;
        add_header Access-Control-Allow-Credentials "true" always;
        proxy_pass http://backend;
    }

    # Remove server version
    server_tokens off;
}
```

### Cloudflare (via _headers file)

```
# _headers file for Cloudflare Pages
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.example.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'
```

---

## Debugging Common Issues

### CSP Violations

**Symptom**: Scripts or styles not loading, console shows "Refused to execute inline script"

```
Check browser DevTools Console for CSP violation messages.
Each message tells you which directive blocked which resource.
```

**Fix Strategy**:
1. Start with `Content-Security-Policy-Report-Only` to log without blocking
2. Add the necessary sources to the appropriate directive
3. Prefer nonces over `'unsafe-inline'`
4. Use `'strict-dynamic'` to trust script-loaded scripts

### CORS Errors

**Symptom**: "Access to fetch at X from origin Y has been blocked by CORS policy"

| Error Message | Cause | Fix |
|--------------|-------|-----|
| "No Access-Control-Allow-Origin header" | Server not sending CORS headers | Add CORS middleware |
| "not included in the Access-Control-Allow-Origin" | Origin not in allowlist | Add origin to allowlist |
| "Response to preflight does not have HTTP ok status" | OPTIONS handler missing | Handle OPTIONS requests |
| "Credentials flag is true, but Access-Control-Allow-Credentials is not true" | credentials: true without header | Set `Access-Control-Allow-Credentials: true` |
| "Cannot use wildcard with credentials" | `*` origin with credentials | Use specific origins, not `*` |

### HSTS Issues

**Warning**: HSTS with `preload` is difficult to undo. Test without `preload` first.

```
# Test HSTS without preload
Strict-Transport-Security: max-age=300
# Then increase gradually
Strict-Transport-Security: max-age=86400
# Then add includeSubDomains
Strict-Transport-Security: max-age=86400; includeSubDomains
# Finally, add preload after thorough testing
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

---

## Validation Checklist

- [ ] CSP blocks inline scripts without nonces
- [ ] CSP blocks all object/plugin embeds (`object-src 'none'`)
- [ ] CSP prevents clickjacking (`frame-ancestors 'none'`)
- [ ] CORS only allows specific, known origins
- [ ] CORS preflight is handled for non-simple requests
- [ ] HSTS is set with a long max-age (minimum 1 year for production)
- [ ] X-Frame-Options is set to DENY
- [ ] X-Content-Type-Options is set to nosniff
- [ ] Referrer-Policy restricts information leakage
- [ ] Permissions-Policy disables unused browser APIs
- [ ] Server version headers are removed
- [ ] CSP report-to is configured for violation monitoring
- [ ] All headers include the `always` flag in nginx

---

## References

- **MDN CSP Guide**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **MDN CORS Guide**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **CSP Evaluator (Google)**: https://csp-evaluator.withgoogle.com/
- **Security Headers Scanner**: https://securityheaders.com/
- **OWASP Secure Headers Project**: https://owasp.org/www-project-secure-headers/
- **HSTS Preload List**: https://hstspreload.org/

---

**Last verified**: 2026-02-17 | **Skill version**: 1.0.0
