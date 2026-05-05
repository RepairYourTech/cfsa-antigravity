---
name: cloudflare-r2
description: "Cloudflare R2 object storage patterns covering Workers bindings, S3-compatible API, presigned URLs, multipart uploads, CORS, and lifecycle rules. Use when implementing file storage with Cloudflare R2."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Cloudflare R2

S3-compatible object storage with zero egress fees. Access via Workers bindings (fastest, no credentials needed) or S3-compatible API (for external clients).

## When to Use

- Project uses Cloudflare Workers/Pages and needs file storage
- Need S3-compatible storage without egress costs
- Serving static assets, user uploads, or media files
- Need presigned URLs for direct browser uploads

## When NOT to Use

- Need a full CDN with image transformations (use Cloudflare Images instead)
- Using AWS ecosystem exclusively (use S3 directly)
- Need object versioning (R2 does not support versioning)

## Workers Binding (Recommended)

The fastest integration — no credentials, no network hop.

### Setup (wrangler.toml)

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"
preview_bucket_name = "my-bucket-preview"
```

### Basic Operations

```typescript
interface Env { STORAGE: R2Bucket; }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // Remove leading /

    switch (request.method) {
      case 'PUT': {
        const object = await env.STORAGE.put(key, request.body, {
          httpMetadata: {
            contentType: request.headers.get('content-type') ?? 'application/octet-stream',
          },
          customMetadata: { uploadedBy: 'worker', timestamp: Date.now().toString() },
        });
        return Response.json({ key: object.key, size: object.size, etag: object.httpEtag });
      }
      case 'GET': {
        const object = await env.STORAGE.get(key);
        if (!object) return new Response('Not Found', { status: 404 });

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000, immutable');
        return new Response(object.body, { headers });
      }
      case 'DELETE': {
        await env.STORAGE.delete(key);
        return new Response(null, { status: 204 });
      }
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  },
} satisfies ExportedHandler<Env>;
```

### List Objects

```typescript
const listed = await env.STORAGE.list({
  prefix: 'uploads/user-123/',
  limit: 100,
  cursor: previousCursor, // For pagination
});

for (const object of listed.objects) {
  console.log(`${object.key} — ${object.size} bytes — ${object.uploaded}`);
}

if (listed.truncated) {
  // More results available — use listed.cursor for next page
}
```

## S3-Compatible API (External Clients)

For server-side code outside Workers, use the AWS SDK with R2 endpoint.

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Upload
await r2.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/photo.jpg',
  Body: fileBuffer,
  ContentType: 'image/jpeg',
}));

// Download
const response = await r2.send(new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/photo.jpg',
}));
const body = await response.Body?.transformToByteArray();
```

## Presigned URLs (Direct Browser Upload)

Generate server-side, use client-side — no credentials exposed to the browser.

```typescript
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// Server: generate upload URL
async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour
}

// Client: upload directly to R2
async function uploadFile(file: File) {
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  const { url } = await res.json();

  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
}
```

## Multipart Uploads (Large Files)

For files over 100MB, use multipart uploads via Workers binding.

```typescript
// Create multipart upload
const upload = await env.STORAGE.createMultipartUpload('large-file.zip');

// Upload parts (minimum 5MB per part except last)
const parts: R2UploadedPart[] = [];
let partNumber = 1;
for (const chunk of fileChunks) {
  const part = await upload.uploadPart(partNumber, chunk);
  parts.push(part);
  partNumber++;
}

// Complete upload
const object = await upload.complete(parts);

// Or abort if something fails
// await upload.abort();
```

## CORS Configuration

Configure via the Cloudflare dashboard or API:

```json
[
  {
    "AllowedOrigins": ["https://example.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["Content-Type", "Authorization"],
    "MaxAgeSeconds": 3600
  }
]
```

## Public Bucket Access

Enable via `r2.dev` subdomain in dashboard, or use a custom domain with a Worker:

```typescript
// Serve public assets via Worker + custom domain
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const key = new URL(request.url).pathname.slice(1);
    const object = await env.STORAGE.get(key);
    if (!object) return new Response('Not Found', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('cache-control', 'public, max-age=86400');
    return new Response(object.body, { headers });
  },
};
```

## Key Limits

| Limit | Value |
|-------|-------|
| Max object size (single PUT) | 5 GB |
| Max object size (multipart) | 5 TB |
| Min multipart part size | 5 MB (except last part) |
| Max parts per multipart upload | 10,000 |
| Max key length | 1,024 bytes |
| Max custom metadata per object | 2 KB |
| Presigned URL max expiry | 7 days (604,800 seconds) |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use S3 API from Workers when you can bind directly | Use Workers bindings — faster, no credentials needed |
| Expose R2 API credentials to the browser | Use presigned URLs for direct browser uploads |
| Store credentials in wrangler.toml | Use `wrangler secret put` for API keys |
| Upload large files in a single PUT | Use multipart uploads for files over 100 MB |
| Skip Content-Type on uploads | Always set `contentType` — R2 won't guess it |
| Use `r2.dev` subdomain in production | Use a custom domain for branded, cacheable URLs |
| Forget to set cache headers on responses | Set `cache-control` headers for CDN caching |
| List all objects without pagination | Always use `limit` and `cursor` for large buckets |
