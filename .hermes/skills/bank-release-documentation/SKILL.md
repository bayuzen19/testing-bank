---
name: bank-release-documentation
description: Generate complete application Markdown and PDF from feature/source evidence after same-commit CI and Sonar gates pass, with explicit draft mode otherwise.
---
# Release documentation

Maintain docs/application.json with user-confirmed name, author, owner, purpose,
features, implementation status, source paths, tests and known gaps. Inspect routes,
schemas and user journeys. A file or task specification alone does not prove a feature
works. Never invent an author from the CI actor or claim a missing feature is complete.

Discover the repository generator: scripts/release_docs.py for testing-bank,
scripts/bank/documentation.py for muamalat-shop. Draft mode must say it is not a passed
GitHub release. Release mode requires the exact current commit, GitHub repository/run,
all required checks explicitly passed and that run's Sonar analysis with gate OK.
Missing/skipped checks, stale evidence or an unversioned folder cannot produce release
documents. Treat CI workflow and manifest changes as review-protected files.

Include application identity, features and limitations, architecture, API inventory,
data models, setup, operations, validation provenance and source fingerprints. Render
the generated PDF and inspect clipping, wrapping and page breaks. Upload the Markdown,
PDF and machine-readable evidence as the same immutable run artifact. Production
approval is separate from automated pipeline success.
