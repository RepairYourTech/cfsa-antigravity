---
name: aws-s3
description: AWS S3 object storage for file uploads, downloads, presigned URLs, and CDN integration. Use when building file storage, media uploads, static asset hosting, backups, or integrating with S3-compatible services (MinIO, Cloudflare R2). Triggers on S3, presigned URL, file upload, bucket, multipart upload, object storage.
version: 1.0.0
---

# AWS S3

Amazon S3 (Simple Storage Service) is object storage for any file type at any scale. This skill covers the AWS SDK v3 for JavaScript/TypeScript, which is the current standard. SDK v2 is deprecated.

## Installation

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# For multipart uploads:
pnpm add @aws-sdk/lib-storage
```

## Client Configuration

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  // Credentials resolved automatically from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. IAM role (EC2, ECS, Lambda)
});
```

### S3-Compatible Services

```typescript
// Cloudflare R2
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// MinIO (self-hosted)
const minio = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
});
```

## Basic Operations

### Upload an Object

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';

await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/avatar.png',
  Body: fileBuffer,
  ContentType: 'image/png',
  Metadata: { 'uploaded-by': 'user-123' },
}));
```

### Download an Object

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';

const response = await s3.send(new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/avatar.png',
}));

// response.Body is a ReadableStream
const bytes = await response.Body?.transformToByteArray();
const text = await response.Body?.transformToString();
```

### Delete an Object

```typescript
import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

// Single delete
await s3.send(new DeleteObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/avatar.png',
}));

// Bulk delete (up to 1000 objects per request)
await s3.send(new DeleteObjectsCommand({
  Bucket: 'my-bucket',
  Delete: {
    Objects: [
      { Key: 'uploads/a.png' },
      { Key: 'uploads/b.png' },
    ],
  },
}));
```

### List Objects

```typescript
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

const response = await s3.send(new ListObjectsV2Command({
  Bucket: 'my-bucket',
  Prefix: 'uploads/',
  MaxKeys: 100,
}));

for (const object of response.Contents ?? []) {
  console.log(object.Key, object.Size, object.LastModified);
}

// Paginate through all results
let continuationToken: string | undefined;
do {
  const page = await s3.send(new ListObjectsV2Command({
    Bucket: 'my-bucket',
    Prefix: 'uploads/',
    ContinuationToken: continuationToken,
  }));
  // process page.Contents
  continuationToken = page.NextContinuationToken;
} while (continuationToken);
```

### Head Object (Metadata Only)

```typescript
import { HeadObjectCommand } from '@aws-sdk/client-s3';

const head = await s3.send(new HeadObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/avatar.png',
}));
console.log(head.ContentLength, head.ContentType, head.Metadata);
```

## Presigned URLs

Presigned URLs grant temporary access to private objects without exposing credentials. This is the standard pattern for browser-based uploads and downloads.

### Presigned Download

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/avatar.png',
}), {
  expiresIn: 3600, // URL valid for 1 hour (seconds)
});
// Return this URL to the client for direct download
```

### Presigned Upload

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: `uploads/${userId}/${filename}`,
  ContentType: 'image/png',
}), {
  expiresIn: 600, // 10 minutes to complete upload
});

// Client uploads directly to S3:
// await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/png' } });
```

**Anti-pattern**: Never pass presigned URLs in query strings or logs. They contain temporary credentials. Serve them over HTTPS only and set short expiration times.

## Multipart Uploads

For files larger than 100MB, use multipart uploads. The `@aws-sdk/lib-storage` package handles chunking, parallelism, and resume automatically.

```typescript
import { Upload } from '@aws-sdk/lib-storage';

const upload = new Upload({
  client: s3,
  params: {
    Bucket: 'my-bucket',
    Key: 'videos/large-file.mp4',
    Body: readableStream,
    ContentType: 'video/mp4',
  },
  queueSize: 4,        // Parallel upload threads
  partSize: 10 * 1024 * 1024, // 10MB per part (minimum 5MB)
});

upload.on('httpUploadProgress', (progress) => {
  console.log(`${progress.loaded}/${progress.total} bytes`);
});

await upload.done();
```

## CORS Configuration

Required for browser-based direct uploads via presigned URLs:

```typescript
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';

await s3.send(new PutBucketCorsCommand({
  Bucket: 'my-bucket',
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: ['https://myapp.com'],
        AllowedMethods: ['GET', 'PUT', 'POST'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  },
}));
```

## Bucket Policy

```typescript
import { PutBucketPolicyCommand } from '@aws-sdk/client-s3';

// Public read for a specific prefix (e.g., static assets)
await s3.send(new PutBucketPolicyCommand({
  Bucket: 'my-bucket',
  Policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadAssets',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::my-bucket/public/*',
      },
    ],
  }),
}));
```

## Lifecycle Rules

Automatically transition or expire objects:

```typescript
import { PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';

await s3.send(new PutBucketLifecycleConfigurationCommand({
  Bucket: 'my-bucket',
  LifecycleConfiguration: {
    Rules: [
      {
        ID: 'archive-old-logs',
        Status: 'Enabled',
        Filter: { Prefix: 'logs/' },
        Transitions: [
          { Days: 30, StorageClass: 'STANDARD_IA' },
          { Days: 90, StorageClass: 'GLACIER' },
        ],
        Expiration: { Days: 365 },
      },
      {
        ID: 'cleanup-temp',
        Status: 'Enabled',
        Filter: { Prefix: 'tmp/' },
        Expiration: { Days: 1 },
      },
      {
        ID: 'abort-incomplete-uploads',
        Status: 'Enabled',
        Filter: { Prefix: '' },
        AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
      },
    ],
  },
}));
```

## Versioning

```typescript
import { PutBucketVersioningCommand } from '@aws-sdk/client-s3';

await s3.send(new PutBucketVersioningCommand({
  Bucket: 'my-bucket',
  VersioningConfiguration: { Status: 'Enabled' },
}));

// Retrieve a specific version
import { GetObjectCommand } from '@aws-sdk/client-s3';
const response = await s3.send(new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'config.json',
  VersionId: 'abc123',
}));
```

## Server-Side Encryption

```typescript
// SSE-S3 (AWS-managed keys) — simplest, no extra cost
await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'secret.pdf',
  Body: fileBuffer,
  ServerSideEncryption: 'AES256',
}));

// SSE-KMS (customer-managed keys via KMS)
await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'secret.pdf',
  Body: fileBuffer,
  ServerSideEncryption: 'aws:kms',
  SSEKMSKeyId: 'arn:aws:kms:us-east-1:123456:key/abc-def',
}));
```

## CloudFront CDN Integration

Serve S3 objects through CloudFront for global caching and HTTPS:

1. Create a CloudFront Origin Access Control (OAC)
2. Point CloudFront origin to the S3 bucket
3. Update bucket policy to allow CloudFront access only

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::123456:distribution/EDFDVBD6EXAMPLE"
      }
    }
  }]
}
```

## Event Notifications

Trigger Lambda, SQS, or SNS on S3 events:

```typescript
import { PutBucketNotificationConfigurationCommand } from '@aws-sdk/client-s3';

await s3.send(new PutBucketNotificationConfigurationCommand({
  Bucket: 'my-bucket',
  NotificationConfiguration: {
    LambdaFunctionConfigurations: [
      {
        LambdaFunctionArn: 'arn:aws:lambda:us-east-1:123456:function:process-upload',
        Events: ['s3:ObjectCreated:*'],
        Filter: {
          Key: { FilterRules: [{ Name: 'prefix', Value: 'uploads/' }] },
        },
      },
    ],
  },
}));
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|-------------|-------------|-----------------|
| Using SDK v2 (`aws-sdk`) | Deprecated, large bundle, no tree-shaking | Use `@aws-sdk/client-s3` (v3) |
| Storing files in the database | DB bloat, slow queries, expensive backups | Store in S3, save the key in DB |
| Public buckets without policy scoping | Full bucket exposure | Restrict `Principal` and `Resource` in policy |
| Long-lived presigned URLs | Security risk if URL leaks | Set `expiresIn` to minutes, not days |
| Not setting `ContentType` on upload | Files download instead of display in browser | Always set `ContentType` explicitly |
| Listing all objects without pagination | Timeout on large buckets | Use `ContinuationToken` pagination |
| Not aborting incomplete multipart uploads | Phantom storage charges | Add lifecycle rule to abort after N days |
| Using `forcePathStyle` with AWS S3 | Path-style is deprecated for AWS | Only use `forcePathStyle` for MinIO/local |

## Decision Guide

| Need | S3 Feature |
|------|-----------|
| Browser direct upload | Presigned PUT URL + CORS |
| Browser direct download | Presigned GET URL |
| Large file upload (>100MB) | Multipart upload via `@aws-sdk/lib-storage` |
| Global low-latency reads | CloudFront CDN in front of S3 |
| Automatic cleanup of old files | Lifecycle rules with expiration |
| File version history | Bucket versioning |
| Trigger processing on upload | Event notifications to Lambda/SQS |
| Encryption at rest | SSE-S3 (default) or SSE-KMS (custom keys) |
| S3 locally for development | MinIO with `forcePathStyle: true` |
