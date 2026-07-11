# Sprintio — Storage Architecture

---

| Field         | Value                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Document Type | Storage Architecture                                                                                                                         |
| Product       | Sprintio — Sprint fast. Ship together.                                                                                                       |
| Version       | 1.0                                                                                                                                          |
| Status        | Finalized                                                                                                                                    |
| Date          | 2026-07-08                                                                                                                                   |
| Author        | Engineering Team                                                                                                                             |
| Related Docs  | [Frontend Architecture](01-FRONTEND.md), [MVP Definition](../MVP_DEFINITION.md), [PRD](../PRD.md), [NFRs](../NON_FUNCTIONAL_REQUIREMENTS.md) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [R2 Bucket Strategy](#2-r2-bucket-strategy)
3. [File Organization & Path Structure](#3-file-organization--path-structure)
4. [Upload Flow](#4-upload-flow)
5. [Download & Access Control](#5-download--access-control)
6. [Image Processing Pipeline](#6-image-processing-pipeline)
7. [CDN Configuration](#7-cdn-configuration)
8. [File Metadata Schema](#8-file-metadata-schema)
9. [Limits & Quotas](#9-limits--quotas)
10. [Cleanup & Garbage Collection](#10-cleanup--garbage-collection)
11. [Migration from Local Storage](#11-migration-from-local-storage)
12. [Backup Strategy](#12-backup-strategy)
13. [Quick Reference Cheat Sheet](#13-quick-reference-cheat-sheet)

---

## 1. Executive Summary

This document defines the complete storage architecture for Sprintio. All binary content — task attachments, document media, user avatars, project icons, generated exports, and temporary processing files — is stored in **Cloudflare R2**, an S3-compatible object store with zero egress fees and native CDN integration.

### Design Principles

| #   | Principle                      | Application                                                                                                                                                  |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Direct client uploads**      | The browser uploads straight to R2 via presigned URLs. The Node.js server never sees file bytes for large uploads — it only signs URLs and records metadata. |
| 2   | **Workspace-scoped isolation** | Every object key is prefixed by workspace ID. No cross-workspace access is possible without an explicit signed URL.                                          |
| 3   | **Content-addressed caching**  | CDN cache keys include a version hash. Updating a file creates a new object; the old one is cleaned up asynchronously.                                       |
| 4   | **Soft delete, async cleanup** | Files are never hard-deleted on user action. They are marked deleted in the DB and garbage-collected after a configurable retention period.                  |
| 5   | **Fail-safe uploads**          | A separate upload_sessions table tracks in-progress uploads. Incomplete uploads are cleaned up by a cron job, never left dangling.                           |
| 6   | **Least-privilege access**     | Public read access is limited to avatar images and shared export links. Everything else requires time-limited signed URLs.                                   |

### Technology Choices

| Concern          | Choice                                                 | Rationale                                                         |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Object Store     | Cloudflare R2                                          | Zero egress, S3-compatible API, native CDN, 10 GB free tier       |
| SDK              | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | S3-compatible; works out-of-the-box with R2                       |
| Image Processing | Cloudflare Images (resize rules) + sharp (server-side) | CDN-edge transforms for common sizes; sharp for custom processing |
| Temp Storage     | R2 bucket with 24-hour lifecycle                       | No ephemeral disk to manage                                       |

---

## 2. R2 Bucket Strategy

### 2.1 Bucket Layout

Sprintio uses **three R2 buckets**, each with distinct lifecycle and access policies:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Account                           │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐│
│  │ sprintio-production  │  │ sprintio-temp        │  │ sprintio-    ││
│  │                     │  │                      │  │ backups      ││
│  │ Primary bucket.     │  │ Upload staging.      │  │              ││
│  │ All user content.   │  │ Processing interim.  │  │ DB backups.  ││
│  │                     │  │                      │  │ WAL archives.││
│  │ Lifecycle: none     │  │ Lifecycle: 24h TTL   │  │ Lifecycle:   ││
│  │ Public: NO          │  │ Public: NO           │  │   90d rotate ││
│  │                     │  │                      │  │ Public: NO   ││
│  └─────────────────────┘  └─────────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Bucket Configuration

| Setting         | `sprintio-production`          | `sprintio-temp` | `sprintio-backups` |
| --------------- | ------------------------------ | --------------- | ------------------ |
| Region          | Auto (R2 selects)              | Auto            | Auto               |
| Storage Class   | Standard                       | Standard        | Infrequent Access  |
| Public Access   | Disabled                       | Disabled        | Disabled           |
| CORS            | Configured for browser uploads | Same            | None               |
| Lifecycle Rules | None (manual cleanup)          | 24h expiration  | 90-day deletion    |
| Versioning      | Enabled (soft delete support)  | Disabled        | Disabled           |
| Max Object Size | 5 GB                           | 5 GB            | 100 GB             |

### 2.3 CORS Configuration for Production Bucket

```json
[
  {
    "AllowedOrigins": [
      "https://app.sprintio.dev",
      "https://staging.sprintio.dev",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Length",
      "Content-MD5",
      "Authorization",
      "x-amz-acl",
      "x-amz-meta-*"
    ],
    "ExposeHeaders": ["ETag", "x-amz-meta-file-id", "Location"],
    "MaxAgeSeconds": 3600
  }
]
```

### 2.4 Lifecycle Rules (Temp Bucket)

```json
{
  "Rules": [
    {
      "ID": "expire-24h",
      "Status": "Enabled",
      "Filter": { "Prefix": "uploads/" },
      "Expiration": { "Days": 1 }
    },
    {
      "ID": "expire-processing",
      "Status": "Enabled",
      "Filter": { "Prefix": "processing/" },
      "Expiration": { "Days": 1 }
    }
  ]
}
```

---

## 3. File Organization & Path Structure

### 3.1 Key Naming Convention

Every object in the production bucket follows this path structure:

```
{workspace_id}/{category}/{entity_id}/{file_id}/{sanitized_filename}
```

| Segment        | Description                             | Example                                               |
| -------------- | --------------------------------------- | ----------------------------------------------------- |
| `workspace_id` | UUID of the workspace                   | `ws_a1b2c3d4`                                         |
| `category`     | Content classification                  | `attachments`, `avatars`, `icons`, `exports`, `media` |
| `entity_id`    | Parent entity UUID (task, doc, project) | `task_x9y8z7`                                         |
| `file_id`      | Unique file UUID (DB primary key)       | `f_12345678`                                          |
| `filename`     | Sanitized original filename             | `screenshot-2026.png`                                 |

### 3.2 Path Structure Diagram

```
sprintio-production/
│
├── ws_a1b2c3d4/                          ← Workspace isolation root
│   │
│   ├── attachments/                      ← Task attachments
│   │   ├── task_x9y8z7/
│   │   │   ├── f_11111111/screenshot-2026.png
│   │   │   ├── f_22222222/design-spec.pdf
│   │   │   └── f_33333333/notes.txt
│   │   └── task_a9b8c7/
│   │       └── f_44444444/mockup-v2.fig
│   │
│   ├── media/                            ← TipTap document images
│   │   ├── doc_m1n2o3/
│   │   │   ├── f_55555555/banner.webp
│   │   │   └── f_66666666/diagram.png
│   │   └── doc_p4q5r6/
│   │       └── f_77777777/chart.svg
│   │
│   ├── avatars/                          ← User profile pictures
│   │   └── user_u1v2w3/
│   │       ├── f_88888888/avatar.jpg
│   │       ├── f_88888888/thumb_128.webp     ← Auto-generated
│   │       └── f_88888888/thumb_64.webp      ← Auto-generated
│   │
│   ├── icons/                            ← Project/workspace icons
│   │   └── project_pr1s2/
│   │       ├── f_99999999/icon.png
│   │       └── f_99999999/thumb_32.webp
│   │
│   └── exports/                          ← Generated exports
│       └── export_e1e2e3/
│           └── f_a0a0a0a0/tasks-export-2026-07-08.csv
│
├── _shared/                              ← Cross-workspace shared resources
│   └── defaults/
│       └── avatar-placeholder.webp
│
└── _system/                              ← System assets
    └── email-templates/
        └── invite-template.html
```

### 3.3 Filename Sanitization

```typescript
// src/server/storage/filename.ts

const DANGEROUS_CHARS = /[^\w\s\-.À-ɏ]/g;
const MULTIPLE_DASHES = /-{2,}/g;

export function sanitizeFilename(raw: string): string {
  const ext = raw.split('.').pop()?.toLowerCase() ?? '';
  const base = raw
    .replace(/\.[^.]+$/, '') // strip extension
    .replace(DANGEROUS_CHARS, '-') // replace unsafe chars
    .replace(MULTIPLE_DASHES, '-') // collapse dashes
    .replace(/^-|-$/g, '') // trim leading/trailing dashes
    .slice(0, 200); // limit length
  return `${base}.${ext}`;
}

export function generateObjectKey(
  workspaceId: string,
  category: string,
  entityId: string,
  fileId: string,
  filename: string,
): string {
  const safe = sanitizeFilename(filename);
  return `${workspaceId}/${category}/${entityId}/${fileId}/${safe}`;
}
```

---

## 4. Upload Flow

Sprintio supports three upload strategies depending on file size and origin.

### 4.1 Upload Strategy Selection

```
                    ┌─────────────────────┐
                    │   Client wants to   │
                    │   upload a file     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   File size > 5 MB? │
                    └──────────┬──────────┘
                          ┌────┴────┐
                         YES        NO
                          │          │
                ┌─────────▼──┐  ┌───▼──────────┐
                │  Chunked   │  │  Presigned    │
                │  Resumable │  │  Direct PUT   │
                │  Upload    │  │  Upload       │
                └────────────┘  └──────────────┘
```

| Strategy                | File Size     | Use Case                                |
| ----------------------- | ------------- | --------------------------------------- |
| Presigned PUT           | < 5 MB        | Avatars, icons, small attachments       |
| Presigned multipart     | 5 MB – 500 MB | Large documents, images, design files   |
| Server-side (streaming) | Any           | Exports generated server-side, webhooks |

### 4.2 Step 1: Request Upload (API)

The client calls this endpoint to get an upload session and a presigned URL.

```typescript
// src/server/routes/storage.routes.ts

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const requestUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
  category: z.enum(['attachments', 'media', 'avatars', 'icons']),
  entityId: z.string().uuid(),
});

// POST /api/storage/upload/request
router.post('/upload/request', async (req, res) => {
  const body = requestUploadSchema.parse(req.body);
  const workspaceId = req.auth.workspaceId;

  // 1. Check quota
  const quota = await checkWorkspaceQuota(workspaceId, body.fileSize);
  if (!quota.allowed) {
    return res.status(413).json({
      error: 'STORAGE_QUOTA_EXCEEDED',
      message: `Workspace storage limit exceeded. Used: ${quota.usedMB} MB / ${quota.limitMB} MB`,
    });
  }

  // 2. Check file type allowlist
  if (!isAllowedContentType(body.contentType, body.category)) {
    return res.status(415).json({
      error: 'UNSUPPORTED_FILE_TYPE',
      message: `Content type "${body.contentType}" is not allowed for category "${body.category}"`,
    });
  }

  // 3. Create file record in DB
  const fileRecord = await db.file.create({
    data: {
      workspaceId,
      entityId: body.entityId,
      category: body.category,
      originalFilename: body.filename,
      contentType: body.contentType,
      fileSize: body.fileSize,
      status: 'PENDING_UPLOAD',
      uploadedById: req.auth.userId,
    },
  });

  // 4. Generate object key
  const objectKey = generateObjectKey(
    workspaceId,
    body.category,
    body.entityId,
    fileRecord.id,
    body.filename,
  );

  // 5. Generate presigned URL
  if (body.fileSize <= 5 * 1024 * 1024) {
    // Small file: presigned PUT
    const presignedUrl = await getPresignedPutUrl(objectKey, body.contentType);
    return res.json({
      uploadType: 'direct',
      fileId: fileRecord.id,
      presignedUrl,
      objectKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } else {
    // Large file: presigned multipart
    const multipart = await createMultipartUpload(objectKey, body.contentType);
    await db.uploadSession.create({
      data: {
        fileId: fileRecord.id,
        objectKey,
        uploadId: multipart.uploadId,
        totalParts: Math.ceil(body.fileSize / (5 * 1024 * 1024)),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return res.json({
      uploadType: 'multipart',
      fileId: fileRecord.id,
      uploadId: multipart.uploadId,
      objectKey,
      partSize: 5 * 1024 * 1024, // 5 MB chunks
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }
});
```

### 4.3 Step 2: Client Upload

```typescript
// src/client/lib/upload.ts

interface UploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
  category: 'attachments' | 'media' | 'avatars' | 'icons';
  entityId: string;
}

interface DirectUploadResponse {
  uploadType: 'direct';
  fileId: string;
  presignedUrl: string;
  objectKey: string;
}

interface MultipartUploadResponse {
  uploadType: 'multipart';
  fileId: string;
  uploadId: string;
  objectKey: string;
  partSize: number;
}

/**
 * Upload a file to R2 via presigned URL.
 * Returns the fileId on success.
 */
export async function uploadFile(
  file: File,
  request: UploadRequest,
  onProgress?: (percent: number) => void,
): Promise<string> {
  // 1. Request presigned URL from backend
  const res = await fetch('/api/storage/upload/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, fileSize: file.size }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new UploadError(error.error, error.message);
  }

  const data: DirectUploadResponse | MultipartUploadResponse = await res.json();

  if (data.uploadType === 'direct') {
    // 2a. Direct PUT for small files
    await putFileWithProgress(data.presignedUrl, file, onProgress);
  } else {
    // 2b. Multipart upload for large files
    await multipartUpload(data, file, onProgress);
  }

  // 3. Confirm upload with backend
  const confirmRes = await fetch('/api/storage/upload/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId: data.fileId, objectKey: data.objectKey }),
  });

  if (!confirmRes.ok) {
    throw new UploadError('UPLOAD_CONFIRM_FAILED', 'Failed to confirm upload');
  }

  return data.fileId;
}

async function putFileWithProgress(
  presignedUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new UploadError('PRESIGNED_UPLOAD_FAILED', `HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new UploadError('NETWORK_ERROR', 'Upload failed'));
    });

    xhr.send(file);
  });
}

async function multipartUpload(
  data: MultipartUploadResponse,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const totalParts = Math.ceil(file.size / data.partSize);
  const completedParts: { PartNumber: number; ETag: string }[] = [];

  for (let partIndex = 0; partIndex < totalParts; partIndex++) {
    const start = partIndex * data.partSize;
    const end = Math.min(start + data.partSize, file.size);
    const chunk = file.slice(start, end);

    // Request presigned URL for this part
    const partRes = await fetch('/api/storage/upload/part-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: data.uploadId,
        objectKey: data.objectKey,
        partNumber: partIndex + 1,
      }),
    });

    const { presignedUrl } = await partRes.json();

    // Upload part
    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: chunk,
    });

    const etag = putRes.headers.get('ETag')!;
    completedParts.push({ PartNumber: partIndex + 1, ETag: etag });

    onProgress?.(Math.round(((partIndex + 1) / totalParts) * 100));
  }

  // Complete multipart upload
  await fetch('/api/storage/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId: data.uploadId,
      objectKey: data.objectKey,
      parts: completedParts,
    }),
  });
}
```

### 4.4 Step 3: Confirm Upload (Server)

```typescript
// src/server/routes/storage.routes.ts (continued)

const confirmUploadSchema = z.object({
  fileId: z.string().uuid(),
  objectKey: z.string().min(1),
});

// POST /api/storage/upload/confirm
router.post('/upload/confirm', async (req, res) => {
  const body = confirmUploadSchema.parse(req.body);

  // 1. Verify object exists in R2
  const headResult = await r2Client.send(
    new HeadObjectCommand({
      Bucket: R2_PRODUCTION_BUCKET,
      Key: body.objectKey,
    }),
  );

  // 2. Update file record
  await db.file.update({
    where: { id: body.fileId },
    data: {
      status: 'UPLOADED',
      r2Key: body.objectKey,
      r2Bucket: R2_PRODUCTION_BUCKET,
      mimeType: headResult.ContentType,
      storageSize: headResult.ContentLength,
      versionId: headResult.VersionId,
    },
  });

  // 3. Clean up upload session
  await db.uploadSession.deleteMany({
    where: { fileId: body.fileId },
  });

  // 4. Trigger async processing (thumbnails, etc.)
  await enqueueJob('file.process', { fileId: body.fileId });

  return res.json({ success: true, fileId: body.fileId });
});
```

### 4.5 R2 Client Setup

```typescript
// src/server/storage/r2-client.ts

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_PRODUCTION_BUCKET = process.env.R2_BUCKET_PRODUCTION!;
export const R2_TEMP_BUCKET = process.env.R2_BUCKET_TEMP!;
export const R2_BACKUPS_BUCKET = process.env.R2_BUCKET_BACKUPS!;

const PRESIGNED_URL_TTL = 15 * 60; // 15 minutes

export async function getPresignedPutUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_PRODUCTION_BUCKET,
    Key: key,
    ContentType: contentType,
    // Content-MD5 for integrity (optional but recommended)
  });
  return getSignedUrl(r2Client, command, { expiresIn: PRESIGNED_URL_TTL });
}

export async function getPresignedGetUrl(
  key: string,
  options?: {
    expiresIn?: number;
    responseContentType?: string;
    responseContentDisposition?: string;
  },
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_PRODUCTION_BUCKET,
    Key: key,
    ResponseContentType: options?.responseContentType,
    ResponseContentDisposition: options?.responseContentDisposition,
  });
  return getSignedUrl(r2Client, command, {
    expiresIn: options?.expiresIn ?? 60 * 60, // 1 hour default
  });
}

export async function createMultipartUpload(key: string, contentType: string) {
  const command = new CreateMultipartUploadCommand({
    Bucket: R2_PRODUCTION_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const result = await r2Client.send(command);
  return { uploadId: result.UploadId! };
}

export async function deleteObject(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_PRODUCTION_BUCKET,
      Key: key,
    }),
  );
}

export async function copyObject(sourceKey: string, destinationKey: string): Promise<void> {
  await r2Client.send(
    new CopyObjectCommand({
      Bucket: R2_PRODUCTION_BUCKET,
      CopySource: `${R2_PRODUCTION_BUCKET}/${sourceKey}`,
      Key: destinationKey,
    }),
  );
}
```

---

## 5. Download & Access Control

### 5.1 Access Control Matrix

| Resource           | Authenticated User            | Workspace Member | Public (CDN)                   |
| ------------------ | ----------------------------- | ---------------- | ------------------------------ |
| Task attachment    | Signed URL (1h)               | Signed URL (1h)  | No                             |
| Document media     | Signed URL (1h)               | Signed URL (1h)  | No                             |
| User avatar        | Signed URL (1h)               | Signed URL (1h)  | CDN-cached (if shared profile) |
| Avatar thumbnails  | Signed URL (1h)               | Signed URL (1h)  | CDN-cached (if shared profile) |
| Project icon       | Signed URL (1h)               | Signed URL (1h)  | No                             |
| Export files       | Signed URL (15m)              | Signed URL (15m) | No                             |
| Shared export link | Signed URL (24h, token-gated) | Signed URL (24h) | No                             |
| Default avatar     | N/A                           | N/A              | CDN-cached (public)            |

### 5.2 Signed URL Generation

```typescript
// src/server/routes/storage.routes.ts

const getFileSchema = z.object({
  fileId: z.string().uuid(),
});

// GET /api/storage/:fileId
router.get('/:fileId', async (req, res) => {
  const { fileId } = getFileSchema.parse(req.params);

  const file = await db.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND' });
  }

  // 1. Verify workspace membership
  if (file.workspaceId !== req.auth.workspaceId) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND' });
  }

  // 2. Generate signed URL
  const signedUrl = await getPresignedGetUrl(file.r2Key, {
    expiresIn: 60 * 60, // 1 hour
    responseContentType: file.mimeType,
    responseContentDisposition: `inline; filename="${encodeURIComponent(file.originalFilename)}"`,
  });

  // 3. Update access timestamp
  await db.file.update({
    where: { id: fileId },
    data: { lastAccessedAt: new Date() },
  });

  return res.json({ url: signedUrl, expiresIn: 3600 });
});

// POST /api/storage/:fileId/download — force download (attachment header)
router.post('/:fileId/download', async (req, res) => {
  const { fileId } = getFileSchema.parse(req.params);

  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file || file.workspaceId !== req.auth.workspaceId) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND' });
  }

  const signedUrl = await getPresignedGetUrl(file.r2Key, {
    expiresIn: 60 * 60,
    responseContentType: file.mimeType,
    responseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalFilename)}"`,
  });

  return res.json({ url: signedUrl, expiresIn: 3600 });
});
```

### 5.3 Shared/Export Links

For publicly shareable exports (e.g., sharing a CSV export with a stakeholder):

```typescript
// POST /api/storage/export/share
router.post('/export/share', async (req, res) => {
  const { fileId } = z.object({ fileId: z.string().uuid() }).parse(req.body);

  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file || file.workspaceId !== req.auth.workspaceId) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND' });
  }

  // Generate a unique share token
  const shareToken = generateShareToken();

  await db.fileShareLink.create({
    data: {
      fileId,
      token: shareToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdById: req.auth.userId,
      accessCount: 0,
      maxAccessCount: 50,
    },
  });

  const shareUrl = `https://app.sprintio.dev/shared/${shareToken}`;
  return res.json({ shareUrl, expiresAt: /* ... */ });
});

// GET /shared/:token — public endpoint, no auth required
router.get('/shared/:token', async (req, res) => {
  const { token } = z.object({ token: z.string() }).parse(req.params);

  const link = await db.fileShareLink.findUnique({
    where: { token },
    include: { file: true },
  });

  if (!link || link.expiresAt < new Date()) {
    return res.status(410).json({ error: 'LINK_EXPIRED' });
  }

  if (link.accessCount >= link.maxAccessCount) {
    return res.status(410).json({ error: 'MAX_ACCESS_REACHED' });
  }

  await db.fileShareLink.update({
    where: { id: link.id },
    data: { accessCount: { increment: 1 } },
  });

  const signedUrl = await getPresignedGetUrl(link.file.r2Key, {
    expiresIn: 15 * 60,
    responseContentDisposition: `attachment; filename="${encodeURIComponent(link.file.originalFilename)}"`,
  });

  return res.redirect(signedUrl);
});
```

### 5.4 CDN URL Patterns

For avatar thumbnails and the single default avatar, CDN URLs are used directly:

```
# CDN-cached public assets
https://cdn.sprintio.dev/ws_{workspaceId}/avatars/user_{userId}/thumb_128.webp
https://cdn.sprintio.dev/_shared/defaults/avatar-placeholder.webp
```

---

## 6. Image Processing Pipeline

### 6.1 Pipeline Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│ File uploaded │────▶│ Trigger       │────▶│ Process      │────▶│ Store       │
│ to R2         │     │ (Webhook/Job)│     │ (sharp/Cf)   │     │ (Back to R2)│
└──────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
                                                │
                                         ┌──────┴──────┐
                                         │  Resize     │
                                         │  Thumbnail  │
                                         │  WebP conv  │
                                         │  EXIF strip │
                                         └─────────────┘
```

### 6.2 Processing Job

```typescript
// src/server/workers/file-processor.ts

import sharp from 'sharp';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

interface FileProcessPayload {
  fileId: string;
}

const IMAGE_PROCESSING_CONFIGS: Record<
  string,
  {
    thumbnails: { name: string; width: number; height: number }[];
    formats: string[];
  }
> = {
  avatars: {
    thumbnails: [
      { name: 'thumb_64', width: 64, height: 64 },
      { name: 'thumb_128', width: 128, height: 128 },
      { name: 'thumb_256', width: 256, height: 256 },
    ],
    formats: ['webp'],
  },
  icons: {
    thumbnails: [
      { name: 'thumb_32', width: 32, height: 32 },
      { name: 'thumb_64', width: 64, height: 64 },
    ],
    formats: ['webp'],
  },
  media: {
    thumbnails: [
      { name: 'thumb_400', width: 400, height: 300 },
      { name: 'thumb_800', width: 800, height: 600 },
    ],
    formats: ['webp'],
  },
  attachments: {
    thumbnails: [], // Only process images in attachments
    formats: ['webp'],
  },
};

export async function processFile(payload: FileProcessPayload): Promise<void> {
  const file = await db.file.findUnique({ where: { id: payload.fileId } });
  if (!file || !file.r2Key) return;

  // 1. Check if this is an image
  if (!file.mimeType.startsWith('image/')) {
    await db.file.update({
      where: { id: file.id },
      data: { status: 'READY', processedAt: new Date() },
    });
    return;
  }

  const config = IMAGE_PROCESSING_CONFIGS[file.category];
  if (!config) {
    await db.file.update({
      where: { id: file.id },
      data: { status: 'READY', processedAt: new Date() },
    });
    return;
  }

  // 2. Download original from R2
  const getCommand = new GetObjectCommand({
    Bucket: R2_PRODUCTION_BUCKET,
    Key: file.r2Key,
  });
  const response = await r2Client.send(getCommand);
  const imageBuffer = await streamToBuffer(response.Body as Readable);

  // 3. Strip EXIF data (security: remove GPS, camera info, etc.)
  const sanitizedBuffer = await sharp(imageBuffer)
    .rotate() // Auto-rotate based on EXIF, then strip EXIF
    .toBuffer();

  // 4. Generate WebP version
  if (config.formats.includes('webp')) {
    const webpBuffer = await sharp(sanitizedBuffer).webp({ quality: 85, effort: 4 }).toBuffer();

    // Upload WebP version (same key but with .webp extension)
    const webpKey = file.r2Key.replace(/\.[^.]+$/, '.webp');
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_PRODUCTION_BUCKET,
        Key: webpKey,
        Body: webpBuffer,
        ContentType: 'image/webp',
        Metadata: {
          'sprintio-original-key': file.r2Key,
          'sprintio-processed-by': 'pipeline',
        },
      }),
    );

    await db.fileVariant.create({
      data: {
        fileId: file.id,
        variant: 'webp',
        r2Key: webpKey,
        fileSize: webpBuffer.length,
      },
    });
  }

  // 5. Generate thumbnails
  const baseDir = file.r2Key.substring(0, file.r2Key.lastIndexOf('/'));

  for (const thumb of config.thumbnails) {
    const thumbBuffer = await sharp(sanitizedBuffer)
      .resize(thumb.width, thumb.height, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbKey = `${baseDir}/${thumb.name}.webp`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_PRODUCTION_BUCKET,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          'sprintio-variant': thumb.name,
          'sprintio-processed-by': 'pipeline',
        },
      }),
    );

    await db.fileVariant.create({
      data: {
        fileId: file.id,
        variant: thumb.name,
        r2Key: thumbKey,
        fileSize: thumbBuffer.length,
      },
    });
  }

  // 6. Mark as ready
  await db.file.update({
    where: { id: file.id },
    data: {
      status: 'READY',
      processedAt: new Date(),
      processedVariants: config.thumbnails.map((t) => t.name),
    },
  });
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

### 6.3 Frontend Image Component

```tsx
// src/client/components/ui/AvatarImage.tsx

import { useState } from 'react';
import { getFileUrl } from '@/lib/storage';

interface AvatarImageProps {
  fileId: string | null;
  workspaceId: string;
  userId: string;
  size?: 64 | 128 | 256;
  alt: string;
  className?: string;
}

export function AvatarImage({
  fileId,
  workspaceId,
  userId,
  size = 128,
  alt,
  className,
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!fileId || hasError) {
    return (
      <img
        src="/defaults/avatar-placeholder.webp"
        alt={alt}
        className={className}
        width={size}
        height={size}
      />
    );
  }

  // Use the thumbnail variant
  const variant = `thumb_${size}`;
  const url = getFileUrl(workspaceId, userId, fileId, variant);

  return (
    <>
      {!loaded && (
        <div
          className={`animate-pulse bg-muted rounded-full ${className}`}
          style={{ width: size, height: size }}
        />
      )}
      <img
        src={url}
        alt={alt}
        width={size}
        height={size}
        className={`${className} ${loaded ? '' : 'hidden'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
      />
    </>
  );
}
```

---

## 7. CDN Configuration

### 7.1 Cloudflare CDN Rules

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN Architecture                         │
│                                                                          │
│  Client ──▶ Edge PoP ──▶ R2 Bucket                                      │
│             │                                                             │
│             ├── Cache Hit ──▶ Serve from edge (TTFB < 50ms)              │
│             │                                                             │
│             └── Cache Miss ──▶ Fetch from R2 ──▶ Cache ──▶ Serve         │
│                                                                          │
│  Custom Domain: cdn.sprintio.dev → R2 Bucket                             │
│  Default Cache: assets in R2 bucket served via r2.dev subdomain          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.2 R2 Public Access (Bucket-Level)

Enable the R2.dev subdomain for the production bucket to serve CDN-cached content:

```
R2 Dashboard → sprintio-production → Settings → Public Access → r2.dev → Allow Access
```

Then configure a custom domain:

```
R2 Dashboard → sprintio-production → Settings → Custom Domains → Connect Domain:
  cdn.sprintio.dev
```

### 7.3 Cache Control Headers

Set per-object via R2 Metadata during upload:

| Content Type      | Cache-Control                            | Rationale                                                       |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Avatar thumbnails | `public, max-age=31536000, immutable`    | Content-addressed (key includes file ID); safe to cache forever |
| Document images   | `public, max-age=31536000, immutable`    | Same as above                                                   |
| Original uploads  | `private, max-age=0, no-cache`           | Never cache originals — they may be replaced                    |
| Exports           | `private, max-age=0, no-store`           | Never cache exports — time-sensitive                            |
| Default avatars   | `public, max-age=86400, s-maxage=604800` | Cache at edge for 1 week, browser for 1 day                     |
| System assets     | `public, max-age=86400, s-maxage=604800` | Infrequently changing templates                                 |

### 7.4 Cloudflare Page Rules / Cache Rules

```jsonc
// Cache Rule 1: Cache immutable thumbnails aggressively
{
  "expression": "(http.host eq \"cdn.sprintio.dev\" and http.request.uri contains \"thumb_\")",
  "action": "set_cache_settings",
  "action_parameters": {
    "cache": true,
    "edge_ttl": 31536000,
    "browser_ttl": 31536000
  }
}

// Cache Rule 2: Cache WebP variants aggressively
{
  "expression": "(http.host eq \"cdn.sprintio.dev\" and http.request.uri contains \".webp\")",
  "action": "set_cache_settings",
  "action_parameters": {
    "cache": true,
    "edge_ttl": 31536000,
    "browser_ttl": 31536000
  }
}

// Cache Rule 3: Don't cache exports
{
  "expression": "(http.host eq \"cdn.sprintio.dev\" and http.request.uri contains \"/exports/\")",
  "action": "set_cache_settings",
  "action_parameters": {
    "cache": false
  }
}
```

### 7.5 Cache Purge

```typescript
// src/server/storage/cdn-purge.ts

/**
 * Purge CDN cache for a specific file.
 * Used when a file is updated (e.g., avatar replaced).
 *
 * Note: R2 + Cloudflare CDN automatically handles content-addressed
 * files (new key = new cache entry). This is needed for key-preserving
 * updates like avatar replacements where the key stays the same.
 */
export async function purgeCdnCache(urls: string[]): Promise<void> {
  await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/purge_cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: urls }),
  });
}

// When an avatar is replaced, purge the CDN for the old key
export async function purgeFileFromCdn(r2Key: string): Promise<void> {
  const cdnUrl = `https://cdn.sprintio.dev/${r2Key}`;
  await purgeCdnCache([cdnUrl]);
}
```

---

## 8. File Metadata Schema

### 8.1 ER Diagram

```
┌──────────────────────────┐      ┌──────────────────────────┐
│         files            │      │      file_variants        │
├──────────────────────────┤      ├──────────────────────────┤
│ id (UUID, PK)           │──┐   │ id (UUID, PK)            │
│ workspace_id (UUID, FK) │  │   │ file_id (UUID, FK) ──────│──▶ files.id
│ category (ENUM)         │  │   │ variant (VARCHAR)        │
│ entity_id (UUID)        │  │   │ r2_key (TEXT)            │
│ entity_type (ENUM)      │  │   │ file_size (BIGINT)       │
│ original_filename (TEXT) │  │   │ created_at (TIMESTAMPTZ) │
│ display_name (TEXT)     │  │   └──────────────────────────┘
│ mime_type (VARCHAR)     │  │
│ file_size (BIGINT)      │  │   ┌──────────────────────────┐
│ storage_size (BIGINT)   │  │   │     file_share_links     │
│ r2_bucket (VARCHAR)     │  │   ├──────────────────────────┤
│ r2_key (TEXT)           │  │   │ id (UUID, PK)            │
│ status (ENUM)           │  │   │ file_id (UUID, FK) ──────│──▶ files.id
│ version_id (VARCHAR)    │  │   │ token (VARCHAR, UNIQUE)  │
│ uploaded_by_id (UUID)   │  │   │ expires_at (TIMESTAMPTZ) │
│ processed_at (TIMESTAMPTZ)  │  │ max_access_count (INT)   │
│ processed_variants (JSONB)  │  │ access_count (INT)       │
│ deleted_at (TIMESTAMPTZ)│  │   │ created_by_id (UUID)     │
│ last_accessed_at (TSTZ) │  │   │ created_at (TIMESTAMPTZ) │
│ metadata (JSONB)        │  │   └──────────────────────────┘
│ created_at (TIMESTAMPTZ)│  │
│ updated_at (TIMESTAMPTZ)│  │   ┌──────────────────────────┐
└──────────────────────────┘  │   │   upload_sessions        │
                              │   ├──────────────────────────┤
                              │   │ id (UUID, PK)            │
                              │   │ file_id (UUID, FK) ──────│──▶ files.id
                              │   │ r2_key (TEXT)            │
                              │   │ upload_id (VARCHAR)      │
                              │   │ total_parts (INT)        │
                              │   │ completed_parts (INT)    │
                              │   │ expires_at (TIMESTAMPTZ) │
                              │   │ created_at (TIMESTAMPTZ) │
                              │   └──────────────────────────┘
```

### 8.2 SQL Schema

```sql
-- Migration: 20260708_001_create_storage_tables.sql

-- ENUM types
CREATE TYPE file_category AS ENUM (
  'attachments',   -- Task attachments (images, PDFs, docs)
  'media',         -- TipTap document inline images
  'avatars',       -- User profile pictures
  'icons',         -- Project/workspace icons
  'exports',       -- Generated CSV/PDF exports
  'system'         -- System assets (email templates, etc.)
);

CREATE TYPE file_entity_type AS ENUM (
  'task',
  'document',
  'user',
  'project',
  'workspace',
  'export'
);

CREATE TYPE file_status AS ENUM (
  'PENDING_UPLOAD',  -- DB record created, upload not started
  'UPLOADING',       -- Upload in progress (multipart)
  'UPLOADED',        -- File bytes in R2, processing pending
  'PROCESSING',      -- Thumbnails/variants being generated
  'READY',           -- Fully processed and available
  'FAILED',          -- Upload or processing failed
  'DELETED'          -- Soft deleted
);

-- Main files table
CREATE TABLE files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category            file_category NOT NULL,
  entity_id           UUID NOT NULL,
  entity_type         file_entity_type NOT NULL,
  original_filename   TEXT NOT NULL,
  display_name        TEXT NOT NULL,
  mime_type           VARCHAR(255) NOT NULL,
  file_size           BIGINT NOT NULL,           -- Original file size in bytes
  storage_size        BIGINT NOT NULL,           -- Actual storage used (may differ with compression)
  r2_bucket           VARCHAR(255) NOT NULL,
  r2_key              TEXT NOT NULL,
  status              file_status NOT NULL DEFAULT 'PENDING_UPLOAD',
  version_id          VARCHAR(255),              -- R2 version ID for soft delete
  uploaded_by_id      UUID NOT NULL REFERENCES users(id),
  processed_at        TIMESTAMPTZ,
  processed_variants  JSONB DEFAULT '[]',        -- ["thumb_64", "thumb_128", "webp"]
  deleted_at          TIMESTAMPTZ,               -- Soft delete timestamp
  last_accessed_at    TIMESTAMPTZ,
  metadata            JSONB DEFAULT '{}',        -- Flexible metadata (dimensions, page count, etc.)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT files_r2_key_unique UNIQUE (r2_key)
);

-- Indexes
CREATE INDEX idx_files_workspace_id ON files(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_entity ON files(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_status ON files(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_category ON files(workspace_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_pending_cleanup ON files(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_files_orphan_detection ON files(entity_type, entity_id, created_at);
CREATE INDEX idx_files_r2_key ON files(r2_key);

-- File variants (thumbnails, WebP conversions)
CREATE TABLE file_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  variant     VARCHAR(50) NOT NULL,             -- "thumb_64", "thumb_128", "webp"
  r2_key      TEXT NOT NULL,
  file_size   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT file_variants_unique UNIQUE (file_id, variant)
);

CREATE INDEX idx_file_variants_file_id ON file_variants(file_id);

-- File share links
CREATE TABLE file_share_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id         UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  token           VARCHAR(64) NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  max_access_count INT NOT NULL DEFAULT 50,
  access_count    INT NOT NULL DEFAULT 0,
  created_by_id   UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_share_links_token ON file_share_links(token) WHERE expires_at > NOW();
CREATE INDEX idx_file_share_links_expires ON file_share_links(expires_at);

-- Upload sessions (multipart upload tracking)
CREATE TABLE upload_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id         UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  r2_key          TEXT NOT NULL,
  upload_id       VARCHAR(255) NOT NULL,
  total_parts     INT NOT NULL,
  completed_parts INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_sessions_expires ON upload_sessions(expires_at);

-- Workspace storage usage (materialized for fast quota checks)
CREATE TABLE workspace_storage_usage (
  workspace_id    UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  total_bytes     BIGINT NOT NULL DEFAULT 0,
  file_count      BIGINT NOT NULL DEFAULT 0,
  last_computed   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workspace_storage_usage_check CHECK (total_bytes >= 0)
);

-- Trigger: Update storage usage on file insert/update/delete
CREATE OR REPLACE FUNCTION update_workspace_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    INSERT INTO workspace_storage_usage (workspace_id, total_bytes, file_count, last_computed)
    VALUES (NEW.workspace_id, NEW.storage_size, 1, NOW())
    ON CONFLICT (workspace_id) DO UPDATE SET
      total_bytes = workspace_storage_usage.total_bytes + NEW.storage_size,
      file_count  = workspace_storage_usage.file_count + 1,
      last_computed = NOW();
  ELSIF TG_OP = 'UPDATE' THEN
    -- Soft delete: subtract from usage
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE workspace_storage_usage SET
        total_bytes = total_bytes - OLD.storage_size,
        file_count  = file_count - 1,
        last_computed = NOW()
      WHERE workspace_id = NEW.workspace_id;
    -- Undelete: add back to usage
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE workspace_storage_usage SET
        total_bytes = total_bytes + NEW.storage_size,
        file_count  = file_count + 1,
        last_computed = NOW()
      WHERE workspace_id = NEW.workspace_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE workspace_storage_usage SET
      total_bytes = total_bytes - OLD.storage_size,
      file_count  = file_count - 1,
      last_computed = NOW()
    WHERE workspace_id = OLD.workspace_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_files_storage_usage
  AFTER INSERT OR UPDATE OR DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_storage_usage();
```

---

## 9. Limits & Quotas

### 9.1 Per-Workspace Limits

| Limit                     | Free Plan    | Pro Plan               | Enterprise             |
| ------------------------- | ------------ | ---------------------- | ---------------------- |
| Storage quota             | 1 GB         | 50 GB                  | Custom                 |
| Max file size (upload)    | 10 MB        | 100 MB                 | 500 MB                 |
| Max files per workspace   | 500          | 50,000                 | Unlimited              |
| Allowed file types        | Images, PDFs | All except executables | All except executables |
| Retention (deleted files) | 7 days       | 30 days                | 90 days                |
| Export expiration         | 24 hours     | 7 days                 | 30 days                |
| Concurrent uploads        | 3            | 10                     | 25                     |

### 9.2 Per-Entity Limits

| Entity         | Max Attachments | Max Inline Images |
| -------------- | --------------- | ----------------- |
| Task           | 10              | —                 |
| Document       | —               | 50                |
| Comment        | 5               | —                 |
| User (avatar)  | 1 (latest only) | —                 |
| Project (icon) | 1 (latest only) | —                 |

### 9.3 File Type Allowlist

```typescript
// src/server/storage/allowed-types.ts

const ALLOWED_TYPES: Record<string, string[]> = {
  attachments: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain',
    'text/csv',
    'text/markdown',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    // Design
    'application/octet-stream', // .fig, .sketch (detected by extension)
  ],
  media: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  avatars: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  icons: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  exports: ['text/csv', 'application/pdf', 'text/plain', 'application/json', 'text/html'],
};

export function isAllowedContentType(contentType: string, category: string): boolean {
  const allowed = ALLOWED_TYPES[category];
  if (!allowed) return false;

  // Normalize: match base type (e.g., image/jpeg; charset=utf-8 → image/jpeg)
  const base = contentType.split(';')[0].trim().toLowerCase();
  return allowed.includes(base);
}

export const FILE_SIZE_LIMITS: Record<string, number> = {
  attachments: 100 * 1024 * 1024, // 100 MB
  media: 10 * 1024 * 1024, // 10 MB
  avatars: 5 * 1024 * 1024, // 5 MB
  icons: 2 * 1024 * 1024, // 2 MB
  exports: 50 * 1024 * 1024, // 50 MB
};
```

### 9.4 Quota Enforcement

```typescript
// src/server/storage/quota.ts

interface QuotaCheck {
  allowed: boolean;
  usedBytes: number;
  limitBytes: number;
  usedMB: number;
  limitMB: number;
}

export async function checkWorkspaceQuota(
  workspaceId: string,
  additionalBytes: number,
): Promise<QuotaCheck> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  });

  const usage = await db.workspaceStorageUsage.findUnique({
    where: { workspaceId },
    select: { totalBytes: true },
  });

  const limitBytes = getStorageLimit(workspace?.plan ?? 'free');
  const usedBytes = usage?.totalBytes ?? 0;

  return {
    allowed: usedBytes + additionalBytes <= limitBytes,
    usedBytes,
    limitBytes,
    usedMB: Math.round(usedBytes / (1024 * 1024)),
    limitMB: Math.round(limitBytes / (1024 * 1024)),
  };
}

function getStorageLimit(plan: string): number {
  switch (plan) {
    case 'pro':
      return 50 * 1024 * 1024 * 1024; // 50 GB
    case 'enterprise':
      return 1024 * 1024 * 1024 * 1024; // 1 TB (configurable)
    default:
      return 1 * 1024 * 1024 * 1024; // 1 GB
  }
}
```

---

## 10. Cleanup & Garbage Collection

### 10.1 Cleanup Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Cleanup Pipeline                                │
│                                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌────────────────────┐  │
│  │  Soft Delete     │   │  Orphan Detection│   │  Hard Delete       │  │
│  │                  │   │                  │   │                    │  │
│  │  User deletes    │   │  Cron: daily     │   │  Cron: daily       │  │
│  │  file →          │   │  scans for       │   │  deletes files     │  │
│  │  deleted_at set  │   │  files where     │   │  past retention    │  │
│  │                  │   │  entity no longer │   │  period from       │  │
│  │                  │   │  exists in DB     │   │  both DB and R2    │  │
│  └────────┬────────┘   └────────┬────────┘   └─────────┬──────────┘  │
│           │                      │                       │             │
│           ▼                      ▼                       ▼             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌────────────────────┐  │
│  │  Stale Upload   │   │  Orphaned Variant│   │  Expired Share     │  │
│  │  Cleanup        │   │  Cleanup         │   │  Links Cleanup     │  │
│  │                  │   │                  │   │                    │  │
│  │  Cron: hourly    │   │  Cron: daily     │   │  Cron: hourly      │  │
│  │  aborts expired  │   │  deletes variants│   │  deletes expired   │  │
│  │  multipart       │   │  for deleted     │   │  share link DB     │  │
│  │  uploads         │   │  files           │   │  records           │  │
│  └──────────────────┘   └──────────────────┘   └────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.2 Soft Delete

```typescript
// src/server/routes/storage.routes.ts

// DELETE /api/storage/:fileId
router.delete('/:fileId', async (req, res) => {
  const { fileId } = z.object({ fileId: z.string().uuid() }).parse(req.params);

  const file = await db.file.findFirst({
    where: { id: fileId, workspaceId: req.auth.workspaceId, deletedAt: null },
  });

  if (!file) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND' });
  }

  // Soft delete: just set deleted_at
  await db.file.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });

  return res.status(204).end();
});
```

### 10.3 Hard Delete Job (Garbage Collector)

```typescript
// src/server/workers/gc-cleanup.ts

import { DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Hard-delete files that have been soft-deleted past their retention period.
 * Runs daily via cron.
 */
export async function garbageCollectDeletedFiles(): Promise<void> {
  const retentionDays = parseInt(process.env.FILE_RETENTION_DAYS ?? '30');
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Find files past retention
  const staleFiles = await db.file.findMany({
    where: {
      deletedAt: { not: null, lt: cutoffDate },
    },
    include: { variants: true },
    take: 100, // Process in batches
  });

  console.log(`[GC] Processing ${staleFiles.length} expired files`);

  for (const file of staleFiles) {
    try {
      // 1. Delete all R2 objects (original + variants)
      const keysToDelete = [file.r2Key, ...file.variants.map((v) => v.r2Key)];

      await Promise.all(
        keysToDelete.map((key) =>
          r2Client.send(
            new DeleteObjectCommand({
              Bucket: R2_PRODUCTION_BUCKET,
              Key: key,
            }),
          ),
        ),
      );

      // 2. Hard delete DB records
      await db.fileVariant.deleteMany({ where: { fileId: file.id } });
      await db.fileShareLink.deleteMany({ where: { fileId: file.id } });
      await db.file.delete({ where: { id: file.id } });

      console.log(`[GC] Deleted file ${file.id} and ${keysToDelete.length} R2 objects`);
    } catch (error) {
      console.error(`[GC] Failed to delete file ${file.id}:`, error);
    }
  }
}
```

### 10.4 Orphan Detection Job

```typescript
// src/server/workers/orphan-detection.ts

/**
 * Detect files whose parent entity no longer exists.
 * Runs daily. These files should be soft-deleted.
 */
export async function detectOrphanedFiles(): Promise<void> {
  const batchSize = 100;
  let offset = 0;

  while (true) {
    const files = await db.file.findMany({
      where: { deletedAt: null },
      skip: offset,
      take: batchSize,
    });

    if (files.length === 0) break;

    const entityChecks = files.map(async (file) => {
      const exists = await checkEntityExists(file.entityType, file.entityId);
      if (!exists) {
        console.log(
          `[ORPHAN] File ${file.id} references missing ${file.entityType}:${file.entityId}`,
        );
        await db.file.update({
          where: { id: file.id },
          data: { deletedAt: new Date() },
        });
      }
    });

    await Promise.all(entityChecks);
    offset += batchSize;
  }
}

async function checkEntityExists(entityType: string, entityId: string): Promise<boolean> {
  switch (entityType) {
    case 'task':
      return !!(await db.task.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'document':
      return !!(await db.document.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'user':
      return !!(await db.user.findUnique({ where: { id: entityId }, select: { id: true } }));
    case 'project':
      return !!(await db.project.findUnique({ where: { id: entityId }, select: { id: true } }));
    default:
      return true; // Don't orphans system files
  }
}
```

### 10.5 Stale Upload Cleanup

```typescript
// src/server/workers/stale-upload-cleanup.ts

/**
 * Abort multipart uploads that were never completed.
 * Runs hourly. Uploads expire after 24 hours by default.
 */
export async function cleanupStaleUploads(): Promise<void> {
  const staleUploads = await db.uploadSession.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  console.log(`[UPLOAD-CLEANUP] Cleaning up ${staleUploads.length} stale upload sessions`);

  for (const session of staleUploads) {
    try {
      // Abort multipart upload in R2
      await r2Client.send(
        new AbortMultipartUploadCommand({
          Bucket: R2_PRODUCTION_BUCKET,
          Key: session.r2Key,
          UploadId: session.uploadId,
        }),
      );

      // Delete the pending file record
      await db.file.update({
        where: { id: session.fileId },
        data: { status: 'FAILED', deletedAt: new Date() },
      });

      // Delete the upload session
      await db.uploadSession.delete({ where: { id: session.id } });
    } catch (error) {
      console.error(`[UPLOAD-CLEANUP] Failed to abort upload ${session.id}:`, error);
    }
  }
}
```

### 10.6 Cron Job Schedule

```typescript
// src/server/cron/scheduler.ts

import cron from 'node-cron';

// Hourly: cleanup stale uploads and expired share links
cron.schedule('0 * * * *', async () => {
  await cleanupStaleUploads();
  await cleanupExpiredShareLinks();
});

// Daily at 03:00 UTC: orphan detection + garbage collection
cron.schedule('0 3 * * *', async () => {
  await detectOrphanedFiles();
  await garbageCollectDeletedFiles();
  await cleanupExpiredShareLinks();
});

// Weekly: rebuild storage usage counts (consistency check)
cron.schedule('0 4 * * 0', async () => {
  await rebuildStorageUsageCounts();
});
```

---

## 11. Migration from Local Storage

### 11.1 Migration Strategy

If Sprintio currently stores files on the local filesystem (e.g., `uploads/` directory), migration to R2 follows this phased approach:

```
Phase 1: Dual-Write (1 week)
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Upload   │────▶│  Local   │     │  R2      │
│  Request  │     │  Write   │────▶│  Write   │
└──────────┘     └──────────┘     └──────────┘
                  (primary)         (mirror)

Phase 2: Read Migration (1 week)
┌──────────┐     ┌──────────┐
│  Read     │────▶│  Try R2  │──hit──▶ Serve from R2
│  Request  │     │  first   │
└──────────┘     └──────────┘
                  miss ──▶ Serve from local

Phase 3: Cutover
┌──────────┐     ┌──────────┐
│  Upload   │────▶│  R2 only │
│  Request  │     └──────────┘
└──────────┘
┌──────────┐     ┌──────────┐
│  Read     │────▶│  R2 only │
│  Request  │     └──────────┘
└──────────┘

Phase 4: Local Cleanup (1 week later)
- Delete local files
- Remove local storage config
```

### 11.2 Migration Script

```typescript
// src/scripts/migrate-to-r2.ts

import fs from 'fs/promises';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_PRODUCTION_BUCKET } from '../server/storage/r2-client';

const LOCAL_UPLOADS_DIR = process.env.LOCAL_UPLOADS_DIR ?? './uploads';
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50;

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
}

async function migrateToR2(): Promise<void> {
  const stats: MigrationStats = { total: 0, migrated: 0, skipped: 0, failed: 0 };

  // 1. Find all file records that need migration
  const filesToMigrate = await db.file.findMany({
    where: { r2Key: null, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  stats.total = filesToMigrate.length;
  console.log(`[MIGRATE] Found ${stats.total} files to migrate`);

  // 2. Process in batches
  for (let i = 0; i < filesToMigrate.length; i += BATCH_SIZE) {
    const batch = filesToMigrate.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (file) => {
        try {
          const localPath = path.join(LOCAL_UPLOADS_DIR, file.storagePath);

          // Check if local file exists
          try {
            await fs.access(localPath);
          } catch {
            console.warn(`[MIGRATE] Local file not found: ${localPath}`);
            stats.skipped++;
            return;
          }

          if (DRY_RUN) {
            console.log(`[MIGRATE-DRY] Would migrate: ${localPath} → ${file.r2Key}`);
            stats.migrated++;
            return;
          }

          // Generate R2 key
          const r2Key = generateObjectKey(
            file.workspaceId,
            file.category,
            file.entityId,
            file.id,
            file.originalFilename,
          );

          // Read and upload to R2
          const fileBuffer = await fs.readFile(localPath);
          await r2Client.send(
            new PutObjectCommand({
              Bucket: R2_PRODUCTION_BUCKET,
              Key: r2Key,
              Body: fileBuffer,
              ContentType: file.mimeType,
              Metadata: {
                'sprintio-migrated-from': 'local',
                'sprintio-migration-date': new Date().toISOString(),
              },
            }),
          );

          // Update DB record
          await db.file.update({
            where: { id: file.id },
            data: {
              r2Key,
              r2Bucket: R2_PRODUCTION_BUCKET,
              storageSize: fileBuffer.length,
              status: 'UPLOADED',
            },
          });

          // Trigger image processing if needed
          if (file.mimeType.startsWith('image/')) {
            await enqueueJob('file.process', { fileId: file.id });
          }

          stats.migrated++;
          console.log(`[MIGRATE] Migrated: ${file.originalFilename} → ${r2Key}`);
        } catch (error) {
          stats.failed++;
          console.error(`[MIGRATE] Failed: ${file.originalFilename}`, error);
        }
      }),
    );

    console.log(`[MIGRATE] Progress: ${Math.min(i + BATCH_SIZE, stats.total)}/${stats.total}`);
  }

  console.log(`\n[MIGRATE] Complete:`);
  console.log(`  Migrated: ${stats.migrated}`);
  console.log(`  Skipped:  ${stats.skipped}`);
  console.log(`  Failed:   ${stats.failed}`);
}

migrateToR2().catch(console.error);
```

### 11.3 Migration Rollback

```typescript
// src/scripts/rollback-migration.ts

/**
 * Rollback: Point file records back to local storage paths.
 * Use only if migration failed and you need to revert.
 */
async function rollbackMigration(): Promise<void> {
  const migratedFiles = await db.file.findMany({
    where: {
      r2Key: { not: null },
      metadata: { path: ['migrated_from'] },
    },
  });

  console.log(`[ROLLBACK] Rolling back ${migratedFiles.length} migrated files`);

  for (const file of migratedFiles) {
    await db.file.update({
      where: { id: file.id },
      data: {
        r2Key: null,
        r2Bucket: null,
        status: 'UPLOADED',
      },
    });
  }

  console.log('[ROLLBACK] Complete. Files now use local paths.');
}
```

---

## 12. Backup Strategy

### 12.1 Database Backup to R2

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐
│ PostgreSQL   │────▶│ pg_dump /    │────▶│ sprintio-backups         │
│ (primary)    │     │ WAL archiving│     │ /db/{date}/              │
└──────────────┘     └──────────────┘     │   full.dump.gz           │
                                          │   wal/0000000100000000... │
                                          └──────────────────────────┘
```

### 12.2 Backup Configuration

```bash
# /etc/postgresql/16/main/postgresql.conf

# WAL archiving to R2
archive_mode = on
archive_command = 'aws s3 cp %p s3://sprintio-backups/db/wal/%f --endpoint-url=https://R2_ENDPOINT --profile r2-backup'
archive_timeout = 300  # Archive every 5 minutes, even if no WAL switch
```

### 12.3 Backup Cron Script

```bash
#!/bin/bash
# scripts/backup-database.sh

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_KEY="db/${TIMESTAMP}/full.dump.gz"

echo "[BACKUP] Starting database backup: ${BACKUP_KEY}"

# Full dump compressed
pg_dump sprintio | gzip | \
  aws s3 cp - "s3://sprintio-backups/${BACKUP_KEY}" \
    --endpoint-url="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    --profile r2-backup

echo "[BACKUP] Full dump uploaded: ${BACKUP_KEY}"

# Retention: delete backups older than 30 days
aws s3 ls "s3://sprintio-backups/db/" \
  --endpoint-url="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --profile r2-backup | \
  while read -r line; do
    DIR_DATE=$(echo "$line" | awk '{print $2}' | tr -d '/')
    if [[ "${DIR_DATE}" < "$(date -d '30 days ago' +%Y%m%d_%H%M%S)" ]]; then
      echo "[BACKUP] Deleting old backup: ${DIR_DATE}"
      aws s3 rm "s3://sprintio-backups/db/${DIR_DATE}/" \
        --endpoint-url="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
        --profile r2-backup --recursive
    fi
  done

echo "[BACKUP] Complete"
```

---

## 13. Quick Reference Cheat Sheet

### R2 SDK Operations

```typescript
// ─── Upload (small file) ─────────────────────────────────────
const url = await getSignedUrl(r2Client, new PutObjectCommand({ Bucket, Key, ContentType }), {
  expiresIn: 900,
});
await fetch(url, { method: 'PUT', body: file });

// ─── Upload (large file, multipart) ──────────────────────────
const { UploadId } = await r2Client.send(new CreateMultipartUploadCommand({ Bucket, Key }));
// ... upload parts with signed URLs ...
await r2Client.send(
  new CompleteMultipartUploadCommand({
    Bucket,
    Key,
    UploadId,
    MultipartUpload: { Parts },
  }),
);

// ─── Download (signed URL) ───────────────────────────────────
const url = await getSignedUrl(r2Client, new GetObjectCommand({ Bucket, Key }), {
  expiresIn: 3600,
});

// ─── Delete ──────────────────────────────────────────────────
await r2Client.send(new DeleteObjectCommand({ Bucket, Key }));

// ─── Copy ────────────────────────────────────────────────────
await r2Client.send(
  new CopyObjectCommand({
    Bucket,
    Key: destKey,
    CopySource: `${Bucket}/${srcKey}`,
  }),
);
```

### Path Structure

```
{workspace_id}/{category}/{entity_id}/{file_id}/{filename}
     │              │          │          │         │
     ▼              ▼          ▼          ▼         ▼
ws_a1b2  attachments  task_x9  f_12345  report.pdf
ws_a1b2  avatars      user_u1  f_67890  photo.jpg
ws_a1b2  media        doc_m1   f_11111  banner.webp
ws_a1b2  icons        proj_pr  f_22222  icon.png
ws_a1b2  exports      exp_e1   f_33333  tasks.csv
```

### Status Flow

```
PENDING_UPLOAD → UPLOADING → UPLOADED → PROCESSING → READY
                                                      ↓
                                                    DELETED (soft)
                                                      ↓
                                               [hard delete after retention]
```

### Cron Jobs

| Schedule                       | Job                          | Purpose                                        |
| ------------------------------ | ---------------------------- | ---------------------------------------------- |
| Hourly (`0 * * * *`)           | `cleanupStaleUploads`        | Abort expired multipart uploads                |
| Hourly (`0 * * * *`)           | `cleanupExpiredShareLinks`   | Remove expired share link DB records           |
| Daily 03:00 (`0 3 * * *`)      | `detectOrphanedFiles`        | Soft-delete files with missing parent entities |
| Daily 03:00 (`0 3 * * *`)      | `garbageCollectDeletedFiles` | Hard-delete files past retention period        |
| Weekly Sun 04:00 (`0 4 * * 0`) | `rebuildStorageUsageCounts`  | Consistency check on workspace storage usage   |

### Environment Variables

```bash
# R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_PRODUCTION=sprintio-production
R2_BUCKET_TEMP=sprintio-temp
R2_BUCKET_BACKUPS=sprintio-backups

# CDN Configuration
CDN_DOMAIN=cdn.sprintio.dev
CF_ZONE_ID=your_zone_id
CF_API_TOKEN=your_api_token

# Limits
FILE_RETENTION_DAYS=30
MAX_FILE_SIZE_MB=100
```

### Key Design Decisions

| Decision                         | Choice                        | Why                                                                   |
| -------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Direct upload via presigned URLs | Client → R2                   | Server never touches file bytes; scales horizontally                  |
| Soft delete + GC                 | `deleted_at` column           | Undelete support; safe recovery; configurable retention               |
| Content-addressed cache keys     | File ID in path               | Update = new path = instant CDN cache invalidation                    |
| Three buckets                    | production / temp / backups   | Independent lifecycle rules and access policies                       |
| Workspace ID prefix              | `ws_xxx/category/entity/file` | Hard isolation; easy bulk operations per workspace                    |
| Trigger-based usage tracking     | PostgreSQL trigger            | Always-consistent quota numbers; no background sync                   |
| Sharp for image processing       | Server-side worker            | Consistent output; EXIF stripping; thumbnail generation               |
| 24h multipart upload expiry      | Upload session TTL            | No abandoned uploads consuming storage                                |
| DB-backed upload sessions        | `upload_sessions` table       | Track in-progress uploads; clean up reliably                          |
| JSONB metadata column            | Flexible metadata             | Per-category metadata (dimensions, page count) without schema changes |

---

_Document Version: 1.0 — Last Updated: 2026-07-08_
