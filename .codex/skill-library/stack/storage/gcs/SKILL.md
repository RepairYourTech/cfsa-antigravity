---
name: gcs
description: "Google Cloud Storage patterns covering bucket operations, signed URLs, resumable uploads, IAM, lifecycle rules, and integration with Cloud Functions. Use when implementing file storage with GCS."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Google Cloud Storage

Object storage for unstructured data with strong consistency, fine-grained IAM, and deep GCP ecosystem integration.

## When to Use

- Project runs on GCP or uses GCP services
- Need object storage with IAM-granular access control
- Serving static assets via Cloud CDN
- Need signed URLs for direct browser uploads

## When NOT to Use

- Using AWS exclusively (use S3)
- Using Cloudflare ecosystem (use R2)
- Need a filesystem interface (use Filestore or persistent disks)

## Setup

### Installation

```bash
npm install @google-cloud/storage
```

### Client Initialization

```typescript
import { Storage } from '@google-cloud/storage';

// Auto-detects credentials from GOOGLE_APPLICATION_CREDENTIALS env var
const storage = new Storage();
const bucket = storage.bucket('my-bucket');

// Or explicit credentials
const storageExplicit = new Storage({
  projectId: 'my-project',
  keyFilename: '/path/to/service-account.json',
});
```

### Environment Variables

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCS_BUCKET_NAME=my-bucket
```

## Basic Operations

### Upload

```typescript
// Upload from buffer
async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  const file = bucket.file(key);
  await file.save(buffer, {
    metadata: { contentType },
    resumable: false, // Use true for files > 5MB
  });
}

// Upload from local file
await bucket.upload('./local-file.jpg', {
  destination: 'uploads/photo.jpg',
  metadata: { contentType: 'image/jpeg' },
});

// Stream upload
const writeStream = bucket.file('uploads/large.zip').createWriteStream({
  resumable: true,
  metadata: { contentType: 'application/zip' },
});
readableStream.pipe(writeStream);
```

### Download

```typescript
// Download to buffer
const [contents] = await bucket.file('uploads/photo.jpg').download();

// Download to local file
await bucket.file('uploads/photo.jpg').download({ destination: './local.jpg' });

// Stream download
const readStream = bucket.file('uploads/large.zip').createReadStream();
readStream.pipe(fs.createWriteStream('./local.zip'));
```

### Delete

```typescript
await bucket.file('uploads/old-photo.jpg').delete();

// Delete multiple files by prefix
await bucket.deleteFiles({ prefix: 'uploads/temp/' });
```

### List Objects

```typescript
const [files] = await bucket.getFiles({
  prefix: 'uploads/user-123/',
  maxResults: 100,
  autoPaginate: false,
});

for (const file of files) {
  console.log(`${file.name} — ${file.metadata.size} bytes`);
}
```

## Signed URLs (Direct Browser Upload)

```typescript
// Generate upload URL (server-side)
async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  const [url] = await bucket.file(key).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
    contentType,
  });
  return url;
}

// Generate download URL
async function generateDownloadUrl(key: string): Promise<string> {
  const [url] = await bucket.file(key).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return url;
}

// Client-side upload
async function uploadDirect(file: File) {
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  const { url } = await res.json();
  await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
}
```

## Resumable Uploads (Large Files)

```typescript
const file = bucket.file('uploads/large-video.mp4');
const writeStream = file.createWriteStream({
  resumable: true,
  metadata: {
    contentType: 'video/mp4',
    metadata: { uploadedBy: 'api', userId: '123' },
  },
  // Automatic retries on network failures
});

writeStream.on('error', (err) => console.error('Upload failed:', err));
writeStream.on('finish', () => console.log('Upload complete'));
readableStream.pipe(writeStream);
```

## Lifecycle Rules

```typescript
// Set lifecycle rules programmatically
await bucket.setMetadata({
  lifecycle: {
    rule: [
      {
        action: { type: 'Delete' },
        condition: { age: 30 }, // Delete objects older than 30 days
      },
      {
        action: { type: 'SetStorageClass', storageClass: 'NEARLINE' },
        condition: { age: 90 }, // Move to Nearline after 90 days
      },
    ],
  },
});
```

## Public Access

```typescript
// Make a single file public
await bucket.file('public/logo.png').makePublic();
// URL: https://storage.googleapis.com/my-bucket/public/logo.png

// Make entire bucket public (use with caution)
await bucket.makePublic();
```

## Key Limits

| Limit | Value |
|-------|-------|
| Max object size | 5 TB |
| Max bucket name length | 63 characters |
| Signed URL max expiry | 7 days |
| Max objects per list request | 5,000 |
| Max custom metadata per object | 8 KB |
| Minimum storage duration (Nearline) | 30 days |
| Minimum storage duration (Coldline) | 90 days |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Hardcode service account keys in source | Use `GOOGLE_APPLICATION_CREDENTIALS` or workload identity |
| Use non-resumable uploads for large files | Use `resumable: true` for files over 5 MB |
| Make entire buckets public by default | Use signed URLs or IAM for granular access |
| Store all files in bucket root | Use prefixes (virtual directories) for organization |
| Skip content-type on upload | Always set `contentType` metadata correctly |
| Use `allUsers` IAM binding in production | Use signed URLs or authenticated access |
| Poll for upload completion | Use Cloud Storage notifications via Pub/Sub |
| Ignore lifecycle rules | Set retention/transition rules to manage storage costs |
