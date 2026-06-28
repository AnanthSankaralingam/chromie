---
name: gov-profile-rerun
description: Manually rerun a government contract search (SAM.gov + SBIR dual-source) for a gov_profiles company domain via AWS Lambda. Use when the user asks to rerun, re-run, trigger, or execute a gov monitor/search for a company domain or gov profile.
---

# Gov profile manual rerun

Force a gov dual-source search **today**, bypassing app once-per-day dedup. Run from the Chromie repo root.

## 1. Resolve automation IDs (Supabase)

Use Supabase `execute_sql` (or SQL editor). Replace `COMPANY_DOMAIN`:

```sql
SELECT
  gp.company_domain,
  sam.id AS sam_automation_id,
  sbir.id AS sbir_automation_id
FROM gov_profiles gp
JOIN profiles p ON p.gov_profile_id = gp.id
JOIN automations sam
  ON sam.user_id = p.id AND sam.scenario_id = 'gov_contract_sam_gov'
JOIN automations sbir
  ON sbir.user_id = p.id AND sbir.scenario_id = 'gov_contract_sbir_tech_marketplace'
WHERE lower(gp.company_domain) = lower('COMPANY_DOMAIN')
LIMIT 1;
```

Prefer the row whose SAM automation has `schedule_kind = 'cron'` if multiple teammates exist.

## 2. Invoke Lambda (AWS CLI)

```bash
cd /Users/shank/Documents/Work/chromie/automations/chromie
set -a && source .env.local && set +a

aws lambda invoke \
  --function-name "$WORKFLOW_LAMBDA_FUNCTION_NAME" \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload "{
    \"automation_id\": \"SAM_AUTOMATION_ID\",
    \"gov_dual_source\": true,
    \"sbir_automation_id\": \"SBIR_AUTOMATION_ID\"
  }" \
  --region "${AWS_REGION:-us-east-1}" \
  /dev/stdout
```

Expect HTTP **202**. Run appears in `workflow_runs` within ~1 minute.

## 3. Verify

```sql
SELECT id, status, started_at, finished_at
FROM workflow_runs
WHERE automation_id = 'SAM_AUTOMATION_ID'
ORDER BY started_at DESC
LIMIT 3;
```

Or tail Lambda logs (group name may vary):

```bash
aws logs tail "/aws/lambda/$(basename "$WORKFLOW_LAMBDA_FUNCTION_NAME")" --follow --region "${AWS_REGION:-us-east-1}"
```

## Notes

- **Do not** use `POST /api/gov-monitor/run` for forced reruns — it skips when the org already ran today.
- Scheduled EventBridge runs use payload `{"automation_id":"<sam-id>"}` only; manual reruns need `gov_dual_source` + `sbir_automation_id`.
- Example `chromie.dev`: SAM `584dc227-52e0-455d-9962-c035260c5aa9`, SBIR `34f14530-bd21-4990-a9f7-790970dd9751`.

Optional helper: [scripts/rerun.sh](scripts/rerun.sh) when IDs are already known.
