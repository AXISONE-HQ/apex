# GCP Assets — Storage (v2)

**Last updated:** 2026-03-04

## Bucket: `apex-v1-488611-assets`

Purpose: private application assets (starting with club logos for EPIC 1).

### Security posture (secure/standard)
- **Uniform bucket-level access:** enabled
- **Public access prevention:** enforced
- Objects are intended to be **private**.

### Location
- `us-central1`

### IAM
Cloud Run service account granted object admin to support signed URLs / uploads:
- `serviceAccount:apex-staging-runtime@apex-v1-488611.iam.gserviceaccount.com`
  - `roles/storage.objectAdmin` on the bucket

### Recommended upload pattern
- Backend issues **V4 signed upload URL** (short TTL, restrict content-type).
- Frontend uploads directly to GCS using the signed URL.
- Backend stores `organizations.logo_url` (either `gs://...` or https object URL).
- For reads, either:
  - issue a **signed read URL** endpoint, or
  - serve through a controlled proxy (later), or
  - add CDN once requirements are clear.

### Notes
- This bucket is separate from Cloud Build / Cloud Functions managed buckets.
