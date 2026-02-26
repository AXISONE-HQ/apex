# Apex v1 — Step 2.6: Repo Connection + Branch Triggers

## Status
- **Step:** 2.6 Connect repository and create triggers
- **State:** ✅ Completed (trigger setup) / ⚠️ Waiting on first repo commits for run validation
- **Date:** 2026-02-26

## What was done

1. **Cloud Build GitHub connection completed**
   - Connection: `apex-v1-gh`
   - Region: `us-central1`
   - Installation state: `COMPLETE`
   - GitHub app installation id: `106639965`

2. **Repository attached to connection**
   - Repository resource: `projects/apex-v1-488611/locations/us-central1/connections/apex-v1-gh/repositories/apex-repo`
   - Remote URI: `https://github.com/AXISONE-HQ/apex.git`

3. **Triggers created**
   - `apex-dev-develop`
     - Event: push to `develop`
     - Config: `service/cloudbuild/cloudbuild.dev.yaml`
   - `apex-staging-main`
     - Event: push to `main`
     - Config: `service/cloudbuild/cloudbuild.staging.yaml`
   - `apex-prod-manual`
     - Event: manual
     - Source branch: `main`
     - Config: `service/cloudbuild/cloudbuild.prod.yaml`
     - Requires approval: enabled

4. **IAM adjustment made for connection flow**
   - Added `roles/cloudbuild.connectionAdmin` for:
     - `fred@mkze.vc`
     - `fred@axisone.ca`

## Validation attempt
- Trigger run attempt for `apex-dev-develop` failed with:
  - `ABORTED: Couldn't read commit`
- This indicates branch/repo content is not available yet (e.g., no push to `develop` yet).

## Next step
**Step 2.7: Initialize and push code to GitHub branches, then validate trigger runs**

Planned:
1. Initialize repo contents and push current project files
2. Create/push `develop` and `main`
3. Re-run dev trigger (expect success)
4. Merge/promote and validate staging trigger
5. Document end-to-end CI/CD verification report
