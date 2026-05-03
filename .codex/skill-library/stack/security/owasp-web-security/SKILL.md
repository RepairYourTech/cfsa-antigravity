---
name: owasp-web-security
description: "OWASP Top 10 (2021) deep dive with vulnerability patterns, exploitation examples, and production fixes across JS/TS, Python, and Go. Use when building web applications, reviewing code for security flaws, or hardening existing systems against injection, broken auth, XSS, and access control attacks."
version: 1.0.0
---

# OWASP Top 10 Web Security (2021)

**Status**: Production Ready
**Last Updated**: 2026-02-17
**Dependencies**: None (standalone skill)

---

## Use This Skill When

- Building or reviewing web application security
- Auditing code for OWASP Top 10 vulnerabilities
- Implementing security controls for production systems
- Performing threat modeling against common attack vectors

## Do Not Use This Skill When

- You need infrastructure-level security (use cloud-hardening skills instead)
- You need cryptographic implementation guidance (use crypto-patterns skill)
- You need CSP/CORS header configuration (use csp-cors-headers skill)

---

## A01:2021 -- Broken Access Control

Occurs when users can act outside their intended permissions.

```typescript
// VULNERABLE: No authorization check
app.get("/api/users/:id/profile", async (req, res) => {
  const profile = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
  res.json(profile);
});

// SECURE: Verify the authenticated user owns the resource
app.get("/api/users/:id/profile", requireAuth, async (req, res) => {
  if (req.params.id !== req.user.id && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const profile = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
  if (!profile) return res.status(404).json({ error: "Not found" });
  res.json(profile);
});
```

```python
# SECURE: Ownership verification in Python
@app.route("/api/documents/<doc_id>")
@login_required
def get_document(doc_id):
    doc = Document.query.get_or_404(doc_id)
    if doc.owner_id != current_user.id and not current_user.is_admin:
        abort(403)
    return jsonify(doc.to_dict())
```

**Key controls**: Deny by default, enforce ownership checks on every data access,
log access control failures, disable directory listing.

---

## A02:2021 -- Cryptographic Failures

Sensitive data exposed through weak or missing cryptography.

```typescript
// VULNERABLE: Plaintext password storage
await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, password]);

// SECURE: Hash with bcrypt (cost factor 12+)
import bcrypt from "bcrypt";
const hashedPassword = await bcrypt.hash(password, 12);
await db.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [email, hashedPassword]);
const isValid = await bcrypt.compare(submittedPassword, storedHash);
```

**Key controls**: Never store plaintext passwords, enforce HTTPS everywhere,
classify data by sensitivity, disable caching for sensitive responses,
never use MD5/SHA1/DES/RC4. See crypto-patterns skill for details.

---

## A03:2021 -- Injection

Untrusted data sent to an interpreter as part of a command or query.

### SQL Injection

```typescript
// VULNERABLE: String concatenation
const query = `SELECT * FROM products WHERE name = '${req.query.name}'`;

// SECURE: Parameterized queries
const results = await db.query("SELECT * FROM products WHERE name = $1", [req.query.name]);
```

### NoSQL Injection

```typescript
// VULNERABLE: Direct user input in MongoDB (attacker sends { "$ne": "" })
const user = await db.collection("users").findOne({
  username: req.body.username,
  password: req.body.password,
});

// SECURE: Validate input types with Zod
const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});
const parsed = LoginSchema.safeParse(req.body);
```

### Command Injection

```python
# VULNERABLE: Shell command with user input
os.system(f"ping -c 4 {hostname}")  # hostname = "; rm -rf /"

# SECURE: subprocess with argument list (no shell)
import subprocess, re
def ping_host(hostname):
    if not re.match(r"^[a-zA-Z0-9._-]+$", hostname):
        raise ValueError("Invalid hostname")
    return subprocess.run(["ping", "-c", "4", hostname], capture_output=True, timeout=30)
```

```go
// SECURE: exec.CommandContext with separate arguments in Go
func PingHost(hostname string) (string, error) {
    matched, _ := regexp.MatchString(`^[a-zA-Z0-9._-]+$`, hostname)
    if !matched {
        return "", fmt.Errorf("invalid hostname")
    }
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    cmd := exec.CommandContext(ctx, "ping", "-c", "4", hostname)
    output, err := cmd.Output()
    return string(output), err
}
```

### LDAP Injection

```typescript
// SECURE: Escape LDAP special characters
function escapeLDAP(input: string): string {
  return input.replace(/\\/g, "\\5c").replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28").replace(/\)/g, "\\29").replace(/\0/g, "\\00");
}
```

---

## A04:2021 -- Insecure Design

Flaws in design patterns that cannot be fixed by implementation alone.

```typescript
// SECURE: Rate limiting at the design level
import rateLimit from "express-rate-limit";
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  keyGenerator: (req) => req.body.email || req.ip,
});
app.post("/api/login", loginLimiter, loginHandler);
```

**Key controls**: Use threat modeling (STRIDE, PASTA), limit resource consumption
per user, separate tenant data, test abuse cases.

---

## A05:2021 -- Security Misconfiguration

```typescript
// VULNERABLE: Stack traces exposed to users
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

// SECURE: Generic error response in production
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID();
  logger.error({ errorId, err, path: req.path });
  res.status(500).json({ error: "Internal server error", errorId });
});
```

**Key controls**: Remove default accounts, disable unnecessary HTTP methods,
remove server version headers, review cloud storage permissions, automate
configuration hardening in CI/CD.

---

## A06:2021 -- Vulnerable and Outdated Components

```bash
npm audit                    # Check for known vulnerabilities
npm audit fix                # Auto-fix where possible
npm ci                       # Use in CI -- respects lockfile exactly
npm install express@4.21.0 --save-exact  # Pin versions
```

See the dependency-auditing skill for comprehensive guidance.

---

## A07:2021 -- Identification and Authentication Failures

```typescript
// SECURE: Strong authentication with multiple protections
const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const user = await findUser(parsed.data.email);
  // Constant-time comparison even when user not found
  const storedHash = user?.passwordHash || "$2b$12$invalidhashplaceholdervalue";
  const isValid = await bcrypt.compare(parsed.data.password, storedHash);

  if (!user || !isValid) {
    return res.status(401).json({ error: "Invalid credentials" }); // Same message always
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Session error" });
    req.session.userId = user.id;
    res.json({ success: true });
  });
});
```

**Key controls**: MFA for sensitive operations, no default credentials, account lockout,
secure session IDs (128+ bits entropy), invalidate sessions on logout/password change,
identical error messages for invalid username vs password.

---

## A08:2021 -- Software and Data Integrity Failures

```html
<!-- VULNERABLE: No integrity check -->
<script src="https://cdn.example.com/library.js"></script>

<!-- SECURE: Subresource Integrity (SRI) -->
<script src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"></script>
```

```typescript
// SECURE: Verify webhook signatures with constant-time comparison
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
```

---

## A09:2021 -- Security Logging and Monitoring Failures

```typescript
import pino from "pino";
const logger = pino({
  redact: {
    paths: ["req.headers.authorization", "req.body.password", "*.email", "*.ssn"],
    censor: "[REDACTED]",
  },
});

function logAuthEvent(event: {
  action: "login_success" | "login_failure" | "logout" | "password_reset";
  userId?: string; ip: string; userAgent: string; reason?: string;
}) {
  logger.info({ type: "auth", ...event });
}
```

**Key controls**: Log auth events, access control failures, input validation failures.
Never log passwords/tokens/PII. Ship logs offsite. Alert on attack patterns.
Retain logs 90+ days.

---

## A10:2021 -- Server-Side Request Forgery (SSRF)

```typescript
import { URL } from "url";
import dns from "dns/promises";

const BLOCKED_PREFIXES = ["10.", "172.16.", "192.168.", "169.254.", "127."];

async function isUrlSafe(urlString: string): Promise<boolean> {
  let parsed: URL;
  try { parsed = new URL(urlString); } catch { return false; }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) return false;

  const addresses = await dns.resolve4(parsed.hostname);
  for (const addr of addresses) {
    if (BLOCKED_PREFIXES.some((p) => addr.startsWith(p))) return false;
  }
  return true;
}
```

```go
// SECURE: SSRF prevention in Go
func isPrivateIP(ip net.IP) bool {
    privateRanges := []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16", "127.0.0.0/8"}
    for _, cidr := range privateRanges {
        _, network, _ := net.ParseCIDR(cidr)
        if network.Contains(ip) { return true }
    }
    return false
}
```

---

## XSS Prevention (Cross-Cutting)

```typescript
// Reflected XSS -- escape output
import { encode } from "he";
app.get("/search", (req, res) => {
  res.send(`<h1>Results for: ${encode(req.query.q || "")}</h1>`);
});

// Stored XSS -- sanitize HTML
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
const DOMPurify = createDOMPurify(new JSDOM("").window);
function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href"], ALLOW_DATA_ATTR: false,
  });
}

// DOM XSS -- use textContent, not innerHTML
document.getElementById("output").textContent = userInput; // Safe
document.getElementById("output").innerHTML = userInput;   // Vulnerable
```

---

## Insecure Deserialization

```python
# VULNERABLE: pickle.loads on untrusted data -- arbitrary code execution
data = pickle.loads(serialized_data)

# SECURE: JSON + Pydantic validation
from pydantic import BaseModel
class UserData(BaseModel):
    name: str
    age: int
def process_data(raw: str) -> UserData:
    return UserData(**json.loads(raw))
```

---

## Anti-Patterns Summary

| Anti-Pattern | Risk | Fix |
|-------------|------|-----|
| String concatenation in queries | SQL/NoSQL injection | Parameterized queries |
| User input in shell commands | Command injection | Argument arrays, input validation |
| Plaintext password storage | Credential theft | bcrypt/argon2 hashing |
| Different errors for missing user vs wrong password | User enumeration | Identical error messages |
| Stack traces in production | Information disclosure | Generic error + error ID |
| No rate limiting on auth | Brute force attacks | Rate limiter per IP and account |
| innerHTML with user data | XSS | textContent or framework escaping |
| Fetching arbitrary URLs | SSRF | URL allowlist + IP blocking |
| pickle.loads on untrusted data | Remote code execution | JSON + schema validation |
| No security event logging | Undetected breaches | Structured logging with alerts |

---

## Security Testing Checklist

- [ ] SQL injection: test with `' OR 1=1 --` in text inputs
- [ ] XSS: test with `<script>alert(1)</script>` in text inputs
- [ ] IDOR: change IDs in URLs/bodies to other users' resources
- [ ] Auth bypass: access protected endpoints without valid tokens
- [ ] SSRF: submit internal URLs (169.254.169.254, localhost)
- [ ] Path traversal: test with `../../etc/passwd` in file params
- [ ] Rate limiting: send 100 rapid requests to auth endpoints
- [ ] Error handling: verify no stack traces leak in production
- [ ] Header security: verify CSP, HSTS, X-Frame-Options present

---

## References

- **OWASP Top 10 (2021)**: https://owasp.org/Top10/
- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **OWASP Cheat Sheet Series**: https://cheatsheetseries.owasp.org/
- **CWE Top 25**: https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html
- **MITRE ATT&CK**: https://attack.mitre.org/

---

**Last verified**: 2026-02-17 | **Skill version**: 1.0.0
