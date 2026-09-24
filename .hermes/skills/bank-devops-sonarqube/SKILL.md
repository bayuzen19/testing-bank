---
name: bank-devops-sonarqube
description: Configure and test self-managed SonarQube analysis and exact-analysis quality gates for internal DevOps pipelines.
---
# SonarQube DevOps

Identify the SonarQube edition/version, approved internal URL, project key, scanner
version and coverage format. Use secrets for tokens; do not embed them in source,
command logs or artifacts. Run tests before scanning and verify LCOV paths include the
intended application files. Do not hide defects through broad exclusions.

Use sonar.qualitygate.wait=true. Capture report-task.txt and query the quality gate
by that task's analysisId, not the latest project status. Missing token, unreachable
server, absent coverage, processing failure or timeout must fail the gate.

Discover sonar-project.properties and scripts/sonar_gate.py (scripts/bank/sonar_gate.py
in muamalat-shop); they implement the
integration. Validate a known failing synthetic change and a clean one in a disposable
project. Record both gate outcomes, scanner task, analysis ID and commit.

Community Build supports main-branch analysis; do not promise native PR analysis or
decoration without verifying edition support. Local Hermes PR review is separate.
Review quality profiles, new-code baseline, hotspot review, token scope, TLS, backups,
retention and runner connectivity with the bank owner before production adoption.
