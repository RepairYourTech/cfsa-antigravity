---
name: crypto-patterns
description: "Cryptography patterns for developers: password hashing, encryption, key management, JWT, HMAC, TLS configuration, and secure random generation. Use when implementing authentication, data encryption, webhook verification, token-based auth, or any feature requiring cryptographic operations."
version: 1.0.0
---

# Cryptography Patterns for Developers

**Status**: Production Ready
**Last Updated**: 2026-02-17
**Dependencies**: None (standalone skill)

---

## Use This Skill When

- Implementing password hashing and verification
- Encrypting sensitive data at rest or in transit
- Designing JWT-based authentication systems
- Verifying webhook signatures with HMAC
- Managing encryption keys and secrets
- Generating secure random values (tokens, IDs, nonces)

## Do Not Use This Skill When

- You need to implement a custom cryptographic algorithm (never do this)
- You need CSP/CORS header configuration (use csp-cors-headers skill)
- You need general OWASP vulnerability guidance (use owasp-web-security skill)

---

## Password Hashing

Never use general-purpose hash functions (MD5, SHA-256) for passwords.

### bcrypt (Recommended Default)

```typescript
import bcrypt from "bcrypt";
const SALT_ROUNDS = 12; // Minimum 10, recommended 12-14
async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}
async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

```python
import bcrypt
def hash_password(plaintext: str) -> str:
    return bcrypt.hashpw(plaintext.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
def verify_password(plaintext: str, hashed: str) -> bool:
    return bcrypt.checkpw(plaintext.encode("utf-8"), hashed.encode("utf-8"))
```

```go
import "golang.org/x/crypto/bcrypt"
func HashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(hash), err
}
func VerifyPassword(password, hash string) error {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
```

### Argon2id (Strongest Option)

Winner of the Password Hashing Competition. Use when you need maximum security.

```typescript
import argon2 from "argon2";
async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, {
    type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4,
  });
}
async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, plaintext);
}
```

### Algorithm Selection

| Algorithm | When To Use | Max Password Length |
|-----------|-------------|---------------------|
| bcrypt | Default choice, wide support | 72 bytes |
| Argon2id | Highest security, configurable memory | No practical limit |
| scrypt | Node.js built-in, no extra deps | No practical limit |

### scrypt (Node.js Built-in)

```typescript
import crypto from "crypto";
import { promisify } from "util";
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32);
  const key = (await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1 })) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const storedHash = Buffer.from(hashHex, "hex");
  const key = (await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1 })) as Buffer;
  return crypto.timingSafeEqual(key, storedHash);
}
```

---

## Integrity Hashing (SHA-256)

Use SHA-256 for data integrity verification and checksums. Never for passwords.

```typescript
import crypto from "crypto";

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
```

```python
import hashlib
def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
```

---

## Symmetric Encryption (AES-256-GCM)

AES-256-GCM provides authenticated encryption (confidentiality + integrity).

```typescript
import crypto from "crypto";

interface EncryptedPayload {
  iv: string; ciphertext: string; tag: string;
}

function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(12); // 96 bits for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  return { iv: iv.toString("hex"), ciphertext, tag: cipher.getAuthTag().toString("hex") };
}

function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "hex"));
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
  let plaintext = decipher.update(payload.ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}
```

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

def encrypt(plaintext: bytes, key: bytes) -> tuple[bytes, bytes]:
    nonce = os.urandom(12)
    return nonce, AESGCM(key).encrypt(nonce, plaintext, None)

def decrypt(nonce: bytes, ciphertext: bytes, key: bytes) -> bytes:
    return AESGCM(key).decrypt(nonce, ciphertext, None)
```

### Using libsodium (Simplest API)

```typescript
import sodium from "libsodium-wrappers";
await sodium.ready;

function encryptWithSodium(plaintext: string, key: Uint8Array): string {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key);
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);
  return sodium.to_base64(combined);
}
```

---

## Key Management

### Envelope Encryption

Encrypt data with a Data Encryption Key (DEK), then encrypt the DEK with a
Key Encryption Key (KEK) stored in a KMS.

```typescript
// KMS integration pattern
interface KMSProvider {
  generateDataKey(): Promise<{ plaintext: Buffer; encrypted: Buffer }>;
  decryptDataKey(encryptedKey: Buffer): Promise<Buffer>;
}

async function encryptWithKMS(plaintext: string, kms: KMSProvider) {
  const { plaintext: dek, encrypted: encryptedKey } = await kms.generateDataKey();
  const payload = encrypt(plaintext, dek);
  dek.fill(0); // Zero out plaintext DEK from memory
  return { encryptedKey, payload };
}

async function decryptWithKMS(encryptedKey: Buffer, payload: EncryptedPayload, kms: KMSProvider) {
  const dek = await kms.decryptDataKey(encryptedKey);
  const result = decrypt(payload, dek);
  dek.fill(0);
  return result;
}
```

**Key rules**: Never hardcode keys in source code. Store keys in KMS (AWS KMS,
Google Cloud KMS, Azure Key Vault) or environment variables. Rotate keys on a
schedule. Zero out plaintext keys from memory after use.

---

## JWT Best Practices

### Algorithm Selection

| Algorithm | Type | Use Case |
|-----------|------|----------|
| HS256 | Symmetric | Single-service auth (shared secret, 256+ bits) |
| RS256 | Asymmetric | Multi-service auth (RSA 2048+ bit key pair) |
| ES256 | Asymmetric | Modern systems, smaller tokens (ECDSA P-256) |

### Secure Implementation

```typescript
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m";   // Short-lived
const REFRESH_TOKEN_EXPIRY = "7d";   // Longer, stored securely

function generateAccessToken(userId: string, roles: string[]): string {
  return jwt.sign({ sub: userId, roles, type: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: "HS256",
    issuer: "myapp.com", audience: "myapp.com", jwtid: crypto.randomUUID(),
  });
}

function verifyToken(token: string, expectedType: "access" | "refresh") {
  const decoded = jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"], // Explicitly allow ONLY expected algorithm
    issuer: "myapp.com", audience: "myapp.com",
  }) as { sub: string; type: string; roles?: string[] };
  if (decoded.type !== expectedType) throw new Error("Invalid token type");
  return decoded;
}
```

### Token Refresh Flow

```typescript
async function refreshTokens(refreshToken: string) {
  const payload = verifyToken(refreshToken, "refresh");
  if (await isTokenRevoked(payload.jti)) throw new Error("Token revoked");
  await revokeToken(payload.jti); // Rotate: revoke old refresh token

  const user = await getUserById(payload.sub);
  if (!user || !user.active) throw new Error("User not found or inactive");

  return {
    accessToken: generateAccessToken(user.id, user.roles),
    refreshToken: generateRefreshToken(user.id),
  };
}
```

### JWT Anti-Patterns

| Anti-Pattern | Risk | Fix |
|-------------|------|-----|
| `algorithm: "none"` | Token forgery | Explicit algorithm in verify |
| Not validating `iss`/`aud` | Token misuse across services | Set and verify both |
| Long-lived access tokens | Extended compromise window | 15min access + refresh tokens |
| JWTs in localStorage | XSS token theft | httpOnly cookies |
| No token revocation | Cannot invalidate stolen tokens | Revocation list |
| Sensitive data in payload | Exposed (base64, not encrypted) | Only IDs and roles |

---

## HMAC for Webhook Verification

```typescript
import crypto from "crypto";

function verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace("sha256=", "");
  try {
    return crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch { return false; }
}

function signWebhookPayload(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}
```

```python
import hmac, hashlib
def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.replace("sha256=", ""))
```

```go
import ("crypto/hmac"; "crypto/sha256"; "encoding/hex")
func VerifyWebhook(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    return hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(signature))
}
```

---

## Secure Random Generation

```typescript
import crypto from "crypto";

function generateToken(bytes: number = 32): string { return crypto.randomBytes(bytes).toString("base64url"); }
function generateId(): string { return crypto.randomUUID(); }
function generateOTP(digits: number = 6): string {
  return crypto.randomInt(0, Math.pow(10, digits)).toString().padStart(digits, "0");
}
```

```python
import secrets
def generate_token(bytes: int = 32) -> str: return secrets.token_urlsafe(bytes)
def generate_otp(digits: int = 6) -> str: return "".join(secrets.choice("0123456789") for _ in range(digits))
```

### Never Use for Security

| Insecure | Secure Replacement |
|----------|-------------------|
| `Math.random()` | `crypto.randomBytes()` / `crypto.randomInt()` |
| `random.random()` (Python) | `secrets.token_bytes()` / `secrets.randbelow()` |
| `rand.Intn()` (Go math/rand) | `crypto/rand.Int()` |
| UUID v1 (time-based) | UUID v4 (random) or `crypto.randomUUID()` |

---

## TLS Configuration

### nginx

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
ssl_stapling on;
ssl_stapling_verify on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### Node.js

```typescript
const server = https.createServer({
  key: fs.readFileSync("/path/to/private.key"),
  cert: fs.readFileSync("/path/to/certificate.crt"),
  minVersion: "TLSv1.2",
  ciphers: [
    "TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256",
    "ECDHE-RSA-AES256-GCM-SHA384", "ECDHE-RSA-AES128-GCM-SHA256",
  ].join(":"),
  honorCipherOrder: true,
}, app);
```

**Certificate pinning warning**: Pinning can cause outages if certificates rotate
without updating pins. Prefer Certificate Transparency monitoring for web apps.

---

## Anti-Patterns Summary

| Anti-Pattern | Risk | Correct Approach |
|-------------|------|-----------------|
| MD5/SHA1 for passwords | Rainbow table attacks | bcrypt, argon2id, or scrypt |
| ECB mode for encryption | Pattern leakage | GCM mode with authentication |
| Hardcoded encryption keys | Key compromise on code leak | KMS or environment variables |
| Custom crypto algorithms | Unknown vulnerabilities | Vetted libraries (libsodium, crypto) |
| Reusing IVs/nonces | Breaks encryption | Random IV for every operation |
| `Math.random()` for tokens | Predictable output | `crypto.randomBytes()` |
| Comparing hashes with `===` | Timing attacks | `crypto.timingSafeEqual()` |
| TLS 1.0/1.1 enabled | Protocol vulnerabilities | TLS 1.2 minimum |
| Self-signed certs in production | MitM risk | CA-issued certificates |

---

## Decision Matrix

```
Storing passwords?         --> bcrypt (default) or argon2id (max security)
Encrypting data at rest?   --> AES-256-GCM with envelope encryption
Verifying data integrity?  --> SHA-256 hash
Signing/verifying messages? --> HMAC-SHA256
Authentication tokens?     --> JWT with RS256/ES256 (multi-service) or HS256 (single)
Random security values?    --> crypto.randomBytes() / secrets.token_urlsafe()
Protecting data in transit? --> TLS 1.2+ with modern cipher suites
```

---

## References

- **OWASP Password Storage Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **OWASP Key Management Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
- **JWT Best Practices (RFC 8725)**: https://www.rfc-editor.org/rfc/rfc8725
- **libsodium Documentation**: https://doc.libsodium.org/
- **Node.js crypto Module**: https://nodejs.org/api/crypto.html

---

**Last verified**: 2026-02-17 | **Skill version**: 1.0.0
