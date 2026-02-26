# Apex v1 — Step 2.5: CI/CD for dev, staging, prod

## Status
- **Step:** 2.5 CI/CD baseline and promotion flow
- **State:** ✅ Completed (baseline in place)
- **Date:** 2026-02-26

## What was done

### 1) Artifact Registry repos created
- `apex-dev`
- `apex-staging`
- `apex-prod`

Location: `us-central1`

### 2) Runtime service accounts prepared
- `apex-dev-runtime@apex-v1-488611.iam.gserviceaccount.com`
- `apex-staging-runtime@apex-v1-488611.iam.gserviceaccount.com`
- `apex-prod-runtime@apex-v1-488611.iam.gserviceaccount.com`

Roles granted (project level):
- `roles/cloudsql.client`
- `roles/secretmanager.secretAccessor`

### 3) Cloud Build pipeline configs added
In `service/cloudbuild/`:
- `cloudbuild.dev.yaml` (build image for dev)
- `cloudbuild.staging.yaml` (build + deploy to `apex-staging-api`)
- `cloudbuild.prod.yaml` (build + deploy to `apex-prod-api`)

### 4) Simple deploy scripts added
In `ci/`:
- `deploy-dev.sh`
- `deploy-staging.sh`
- `deploy-prod.sh`

Usage:
```bash
cd projects/apex-v1
./ci/deploy-staging.sh
```

## Trigger status
No SCM connection/triggers currently exist in project yet (`gcloud builds connections list` empty).
So this step sets up the pipelines and deployment path; automated branch triggers are pending repo connection.

## Promotion model
- `develop` -> dev pipeline
- `main` -> staging pipeline
- prod deploy is manual approval / manual run

## Next step
**Step 2.6: Connect repository and create branch triggers**

Planned:
1. Connect GitHub repo to Cloud Build
2. Create trigger for `develop` -> `cloudbuild.dev.yaml`
3. Create trigger for `main` -> `cloudbuild.staging.yaml`
4. Create manual trigger for `prod` -> `cloudbuild.prod.yaml`
5. Validate one end-to-end trigger execution
