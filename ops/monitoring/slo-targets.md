# Apex v1 SLO Targets (v1)

## Scope
- Service: `apex-staging-api`, `apex-prod-api`
- Region: `us-central1`

## Availability SLO
- **Target:** 99.9% monthly availability (prod)
- **SLI:** successful request ratio = `2xx + 3xx + 4xx(expected auth)` / all requests
- **Burn alerts:**
  - Fast burn: >10% error budget burn over 1h
  - Slow burn: >2% over 6h

## Latency SLO
- **Target:** p95 < 500ms for API requests
- **Target:** p99 < 1200ms

## Reliability Guardrails
- 5xx ratio < 1% over 5m
- New revision rollback threshold:
  - 5xx > 3% over 10m, or
  - p95 latency > 2x baseline for 15m

## Data Tier (Cloud SQL)
- CPU utilization < 80% sustained
- Memory utilization < 85% sustained
- No storage exhaustion trend

## CI/CD SLO
- Main -> staging pipeline success rate > 95%
- Manual prod deploy requires explicit approval + post-deploy check
