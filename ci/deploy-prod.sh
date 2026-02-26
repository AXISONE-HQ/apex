#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-apex-v1-488611}"
REGION="${REGION:-us-central1}"
cd "$(dirname "$0")/../service"
gcloud builds submit --project "$PROJECT_ID" --config cloudbuild/cloudbuild.prod.yaml .
