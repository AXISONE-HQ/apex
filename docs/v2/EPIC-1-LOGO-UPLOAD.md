# EPIC 1 — Club Logo Upload (GCS, private + signed URLs)

**Last updated:** 2026-03-04

## Bucket
- `gs://apex-v1-488611-assets`
- Security posture: **private**, **Uniform bucket-level access**, **Public access prevention enforced**

## Stable pointer model
- We **do not store signed URLs** in the DB.
- We store a stable object pointer:
  - `organizations.logo_object_path`
  - Format: `club-logos/<orgId>/<uuid>.<ext>`

Allowed formats
- `image/png`
- `image/jpeg`
- `image/webp`

Max size
- 5MB (`5 * 1024 * 1024`)

## Endpoints (admin)
All endpoints require session + RBAC.

### 1) Get signed upload URL
`POST /admin/clubs/:orgId/logo/upload-url`

Body:
```json
{ "contentType": "image/png" }
```

Response:
```json
{
  "bucket": "apex-v1-488611-assets",
  "objectPath": "club-logos/<orgId>/<uuid>.png",
  "uploadUrl": "https://storage.googleapis.com/...signed...",
  "requirements": {
    "contentType": "image/png",
    "maxBytes": 5242880,
    "method": "PUT"
  }
}
```

Notes
- Signed URL requires the **same Content-Type** on the client `PUT`.

### 2) Client uploads to GCS
Client performs:
- `PUT <uploadUrl>`
- Headers: `Content-Type: <contentType>`
- Body: raw bytes

### 3) Confirm upload (server verifies)
`POST /admin/clubs/:orgId/logo/confirm`

Body:
```json
{ "objectPath": "club-logos/<orgId>/<uuid>.png" }
```

Server checks
- Prefix must be `club-logos/<orgId>/`
- Object exists
- Size <= 5MB
- Content-Type in allowlist

If passes, server persists:
- `organizations.logo_object_path = objectPath`

Response:
```json
{
  "ok": true,
  "orgId": "...",
  "logo_object_path": "club-logos/<orgId>/<uuid>.png",
  "verified": { "size": 12345, "contentType": "image/png" }
}
```

### 4) Get signed read URL for UI
`GET /admin/clubs/:orgId/logo/read-url?objectPath=club-logos/<orgId>/<uuid>.png`

Response:
```json
{ "url": "https://storage.googleapis.com/...signed...", "expiresMinutes": 60 }
```

## RBAC
Permissions used:
- `admin.clubs.logo.upload` (upload-url + confirm)
- `admin.clubs.logo.read` (read-url)

Scope:
- organization scoped: `{ type: "organization", id: orgId }`

Roles
- Currently implemented via `OrgAdmin` and platform admin patterns in the service.

## Migrations
- `010_epic1_org_profile_plan_onboarding.sql` (adds `logo_url` initially; legacy, unused)
- `011_epic1_logo_object_path.sql` (adds `logo_object_path` + prefix check constraint)
