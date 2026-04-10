---
name: input-sanitization
description: "Input validation and sanitization patterns: server-side validation as source of truth, Zod/Joi/Yup schema validation, SQL parameterization, HTML sanitization, file upload validation, URL/email validation, path traversal prevention, command injection prevention, ReDoS prevention, and content-type enforcement. Use when handling any user input in web applications."
version: 1.0.0
---

# Input Validation and Sanitization

**Status**: Production Ready
**Last Updated**: 2026-02-17
**Dependencies**: None (standalone skill)

---

## Use This Skill When

- Handling any form of user input in a web application
- Building API endpoints that accept request bodies, query params, or headers
- Implementing file upload functionality
- Preventing injection attacks (SQL, NoSQL, command, XSS, path traversal)

## Do Not Use This Skill When

- You need cryptographic operations (use crypto-patterns skill)
- You need CSP/CORS configuration (use csp-cors-headers skill)
- You need dependency security scanning (use dependency-auditing skill)

---

## Core Principle

Client-side validation is for UX. Server-side validation is for security.
Both are required. Neither replaces the other. Share the same schema.

```typescript
// src/schemas/user.schema.ts -- shared between client and server
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(50).trim(),
  age: z.number().int().min(13).max(150),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

```typescript
// Server-side: validate EVERY request
app.post("/api/users", async (req, res) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }
  const user = await createUser(parsed.data);
  res.status(201).json(user);
});
```

---

## Schema Validation Libraries

### Zod (Recommended for TypeScript)

```typescript
const ProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  price: z.number().positive().multipleOf(0.01),
  category: z.enum(["electronics", "clothing", "food", "books"]),
  tags: z.array(z.string().max(50)).max(10).default([]),
  metadata: z.record(z.string(), z.string()).optional(),
});

const UpdateProductSchema = ProductSchema.partial(); // All fields optional
const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  (d) => new Date(d.endDate) > new Date(d.startDate),
  { message: "End date must be after start date", path: ["endDate"] }
);
```

### Joi

```typescript
import Joi from "joi";
const schema = Joi.object({
  name: Joi.string().min(1).max(200).trim().required(),
  price: Joi.number().positive().precision(2).required(),
});
const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
```

### Pydantic (Python)

```python
from pydantic import BaseModel, Field, field_validator

class CreateProduct(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(gt=0)
    category: str

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()
```

---

## SQL Parameterization

Never concatenate user input into SQL strings.

```typescript
// VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}'`;

// SECURE: Parameterized query (Node.js pg)
const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
```

```python
# VULNERABLE
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# SECURE: Parameterized query (psycopg2)
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```

```go
// SECURE: Parameterized query (database/sql)
row := db.QueryRowContext(ctx, "SELECT id FROM users WHERE email = $1", email)
```

**ORM warning**: Even with ORMs, avoid raw queries with interpolation:

```typescript
// VULNERABLE
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE name = '${name}'`);
// SECURE
await prisma.$queryRaw`SELECT * FROM users WHERE name = ${name}`;
```

---

## HTML Sanitization

When accepting HTML input (rich text editors), sanitize to remove dangerous elements.

```typescript
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const DOMPurify = createDOMPurify(new JSDOM("").window);

function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["h1", "h2", "h3", "p", "br", "ul", "ol", "li",
      "b", "i", "em", "strong", "a", "img", "blockquote", "pre", "code"],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "form", "input"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "style"],
  });
}

// Force safe link behavior
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});
```

### React XSS Prevention

```typescript
// SAFE: React auto-escapes
function Comment({ text }: { text: string }) { return <p>{text}</p>; }

// DANGEROUS: dangerouslySetInnerHTML bypasses escaping
<div dangerouslySetInnerHTML={{ __html: userHtml }} /> // XSS risk

// SAFE: Sanitize first
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userHtml) }} />
```

---

## File Upload Validation

```typescript
import fileType from "file-type";
import path from "path";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", { extensions: [".jpg", ".jpeg"], maxSize: 5 * 1024 * 1024 }],
  ["image/png", { extensions: [".png"], maxSize: 5 * 1024 * 1024 }],
  ["application/pdf", { extensions: [".pdf"], maxSize: 10 * 1024 * 1024 }],
]);

async function validateUpload(buffer: Buffer, originalName: string, declaredMime: string) {
  const config = ALLOWED_TYPES.get(declaredMime);
  if (!config) return { valid: false, error: "File type not allowed" };

  const ext = path.extname(originalName).toLowerCase();
  if (!config.extensions.includes(ext)) return { valid: false, error: "Extension mismatch" };
  if (buffer.length > config.maxSize) return { valid: false, error: "File too large" };

  // Verify magic bytes (actual content, not just declared MIME)
  const detected = await fileType.fromBuffer(buffer);
  if (!detected || detected.mime !== declaredMime)
    return { valid: false, error: "Content does not match declared type" };

  if (originalName.includes("\0")) return { valid: false, error: "Invalid filename" };
  return { valid: true };
}
```

```typescript
// Express multer configuration with strict limits
import multer from "multer";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5, fields: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) { cb(new Error("Type not allowed")); return; }
    cb(null, true);
  },
});
```

---

## URL Validation

```typescript
function validateUrl(input: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try { parsed = new URL(input); } catch { return { valid: false, error: "Invalid URL" }; }

  if (!["http:", "https:"].includes(parsed.protocol))
    return { valid: false, error: "Only HTTP(S) allowed" };
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname))
    return { valid: false, error: "IP addresses not allowed" };
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname))
    return { valid: false, error: "Internal hosts not allowed" };
  if (input.length > 2048) return { valid: false, error: "URL too long" };
  return { valid: true };
}
```

---

## Email Validation

```typescript
// Use Zod -- do NOT write custom email regex
const EmailSchema = z.string().email().max(254).toLowerCase().trim();

// Stricter for registration (block disposable domains)
const RegistrationEmailSchema = z.string().email().max(254).toLowerCase().trim()
  .refine((email) => {
    const blocked = ["mailinator.com", "guerrillamail.com", "tempmail.com"];
    return !blocked.includes(email.split("@")[1]);
  }, { message: "Disposable email addresses not allowed" });
```

---

## Path Traversal Prevention

```typescript
import path from "path";

const UPLOAD_DIR = "/var/app/uploads";

// VULNERABLE: Direct path concatenation
app.get("/files/:filename", (req, res) => res.sendFile(`${UPLOAD_DIR}/${req.params.filename}`));

// SECURE: Resolve and validate containment
app.get("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  if (/[\/\\]/.test(filename) || filename.includes("..") || filename.includes("\0"))
    return res.status(400).json({ error: "Invalid filename" });

  const resolved = path.resolve(UPLOAD_DIR, filename);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep))
    return res.status(400).json({ error: "Invalid path" });

  res.sendFile(resolved);
});
```

```python
from pathlib import Path
UPLOAD_DIR = Path("/var/app/uploads").resolve()

def safe_path(filename: str) -> Path:
    if ".." in filename or "\x00" in filename:
        raise ValueError("Invalid filename")
    resolved = (UPLOAD_DIR / filename).resolve()
    if not str(resolved).startswith(str(UPLOAD_DIR) + "/"):
        raise ValueError("Path traversal detected")
    return resolved
```

---

## Command Injection Prevention

```typescript
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const FilenameSchema = z.string().regex(/^[a-zA-Z0-9_.-]+$/).max(255);

// VULNERABLE: exec() interprets shell metacharacters
exec(`convert ${inputFile} ${outputFile}`);

// SECURE: execFile passes arguments directly, no shell
async function convertImage(input: string, output: string) {
  FilenameSchema.parse(input);
  FilenameSchema.parse(output);
  await execFileAsync("convert", [input, output], { timeout: 30000, cwd: "/var/app/uploads" });
}
```

```python
# VULNERABLE
os.system(f"convert {input_file} {output_file}")

# SECURE: subprocess with argument list, no shell=True
subprocess.run(["convert", input_file, output_file], check=True, timeout=30)
```

---

## ReDoS Prevention

Certain regex patterns cause exponential backtracking with crafted input.

```typescript
// VULNERABLE: Nested quantifiers
const emailRegex = /^([a-zA-Z0-9]+)*@[a-zA-Z0-9]+\.[a-zA-Z]+$/;
// Input "aaaaaaaaaaaaaaaaaa!" will hang

// SAFE: Use built-in validators
import { z } from "zod";
const email = z.string().email(); // Uses safe internal pattern

// SAFE: Use URL constructor instead of regex
function isValidUrl(input: string): boolean {
  try { new URL(input); return true; } catch { return false; }
}
```

**Prevention rules**: Avoid nested quantifiers `(a+)+`, avoid overlapping
alternatives `(a|a)+`, limit input length before regex, use `safe-regex`
library to check patterns, prefer built-in validators over custom regex.

---

## Content-Type Enforcement

```typescript
// Reject unexpected content types
const requireJSON: RequestHandler = (req, res, next) => {
  if (["GET", "DELETE"].includes(req.method)) return next();
  if (!req.headers["content-type"]?.includes("application/json"))
    return res.status(415).json({ error: "Content-Type must be application/json" });
  next();
};
app.use("/api/", requireJSON);
```

---

## Anti-Patterns Summary

| Anti-Pattern | Risk | Fix |
|-------------|------|-----|
| Client-side only validation | Trivially bypassed | Always validate server-side |
| String concatenation in SQL | SQL injection | Parameterized queries |
| `innerHTML` with user data | XSS | textContent or DOMPurify |
| Direct file path from user input | Path traversal | Resolve + containment check |
| `exec()` with user input | Command injection | `execFile()` with arg array |
| Custom email regex | ReDoS, false negatives | Use Zod/validator.js |
| Trusting Content-Type header | Type confusion | Verify magic bytes for files |
| No file size limits | DoS via large uploads | multer/busboy limits |
| Nested regex quantifiers | ReDoS | safe-regex check, limit input length |
| Trusting `req.params` directly | Injection, traversal | Validate with Zod schema |

---

## Validation Checklist

- [ ] Every API endpoint validates input with a schema library
- [ ] SQL queries use parameterized statements
- [ ] HTML user content is sanitized with DOMPurify or sanitize-html
- [ ] File uploads validate MIME type, magic bytes, extension, and size
- [ ] URLs validated for protocol, host, and length
- [ ] File paths resolved and checked for directory containment
- [ ] Shell commands use argument arrays, not string interpolation
- [ ] Regular expressions checked for ReDoS vulnerability
- [ ] Content-Type headers enforced on API endpoints
- [ ] Client and server use the same validation schema

---

## References

- **OWASP Input Validation Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **Zod Documentation**: https://zod.dev/
- **DOMPurify**: https://github.com/cure53/DOMPurify
- **OWASP File Upload Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- **OWASP SQL Injection Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html

---

**Last verified**: 2026-02-17 | **Skill version**: 1.0.0
