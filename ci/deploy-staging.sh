#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-apex-v1-488611}"
REGION="${REGION:-us-central1}"
SHORT_SHA="${SHORT_SHA:-$(git rev-parse --short HEAD)}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
gcloud builds submit \
  --project "$PROJECT_ID" \
  --config service/cloudbuild/cloudbuild.staging.yaml \
  --substitutions="SHORT_SHA=$SHORT_SHA" \
  .
