---
name: bank-qa-qc
description: Build and execute QA plans and QC release checks with requirement traceability, negative tests, isolated data and honest pass/fail evidence.
---
# QA and QC

QA defines the test strategy before implementation. QC verifies the resulting build.
Map each requirement to its test and expected outcome. Include positive, negative,
boundary, authorization, rollback and concurrency cases appropriate to the feature.
Use a dedicated synthetic test database and known fixtures. Never reset an existing
developer or production database to make tests run.

For this monorepo run lint, typecheck, coverage tests and build. Acceptance tests
require migrations and seed data; missing infrastructure is BLOCKED, not PASS. Cover
full browser journeys separately from mocked component tests. Check route registration,
refresh behavior, loading/error states and access by another user.

Record command, exit code, commit, environment and report path. Missing, skipped or
timed-out checks cannot satisfy a release gate. Do not reduce coverage thresholds,
exclude failing code or suppress errors without an explicit reviewed policy change.
Keep risk acceptance, approver and expiry in a maintained decision record. The bank's
actual checklist supersedes this provisional engineering baseline.
