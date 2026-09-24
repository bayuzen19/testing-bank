# Hermes - local AI coding evaluation for banking

Owner: **Bayuzen Ahmad**. Workload: **Muamalat Banking PoC** with synthetic data only.
This repository evaluates a local coding agent and its delivery controls. It is not a
bank-operated service, production banking system or compliance certification.

## What is included

- React account dashboard, onboarding, login, transfer simulation and privacy flows.
- Express/PostgreSQL API with authenticated ownership, CSRF, transactional balance
  updates, idempotency, encrypted identity and reauthenticated profile export.
- Independent unit/integration/browser tests, including network interruption after
  commit, concurrent transfers, cross-user access and tampered ciphertext.
- Seven Hermes bank skills; local model preflight; GitHub PR review via loopback Ollama.
- GitHub CI, ephemeral SonarQube, non-root container, vulnerability scan/SBOM,
  Kubernetes baseline, and Markdown/PDF documentation gated by exact-commit evidence.

## Start here

Read [the end-to-end test guide](docs/OPERATIONS.md), [architecture](docs/ARCHITECTURE.md),
[pricing assumptions](docs/COSTS.md), and [PDP/PII control matrix](docs/COMPLIANCE.md).

```powershell
npm ci
node scripts/init_demo.mjs
docker compose up -d
npx playwright install chromium
npm run test:coverage
npm run dev:api
# In another terminal:
npm run dev
# After both servers are ready:
npm run test:e2e
```

Use http://localhost:5174 with a name such as `Demo Alya`, a unique email starting
with `demo` under `@example.test`, and a password of at least 12 characters. There is
no pre-created login. No real identity documents, customer data or payments.

## Evidence and boundaries

The draft [review fixture PR](https://github.com/bayuzen19/testing-bank/pull/1) contains
an intentional IDOR example outside the application. **Do not merge or deploy it.**
Local review is advisory and does not automatically post comments or approve a PR.

The evaluator authored the API, harness, contracts and DevOps integration. Hermes
generated selected frontend/privacy code with feedback. Later reviewer corrections
are attributed separately in the evaluation artifacts. A build alone is not a user
journey pass; no Copilot parity claim is made from this small experiment.

GitHub Actions artifacts bind results and release documents to a specific commit.
Missing/skipped gates and stale Sonar evidence cannot produce release documentation.
Local Kubernetes proof uses a disposable kind cluster, separate from any client cluster.

Production work still includes SSO/MFA, OS sandbox and enforced egress for the agent,
KMS/rotation, retention and privacy-request fulfillment, HA/DR, independent pentest,
bank approvals and license review. See the detailed control matrix before rollout.
