#!/usr/bin/env bash
# Usage: ./scripts/rerun.sh SAM_AUTOMATION_ID SBIR_AUTOMATION_ID
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

SAM_ID="${1:?SAM automation id required}"
SBIR_ID="${2:?SBIR automation id required}"

set -a
# shellcheck disable=SC1091
source .env.local
set +a

aws lambda invoke \
  --function-name "$WORKFLOW_LAMBDA_FUNCTION_NAME" \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload "{\"automation_id\":\"${SAM_ID}\",\"gov_dual_source\":true,\"sbir_automation_id\":\"${SBIR_ID}\"}" \
  --region "${AWS_REGION:-us-east-1}" \
  /dev/stdout

echo
echo "Invoked gov dual-source run: SAM=${SAM_ID} SBIR=${SBIR_ID}"
