---
name: bank-github-review
description: Fetch a GitHub PR with read-only credentials and review its code using a local model without executing PR code or posting automatically.
---
# GitHub local review

Confirm the approved repository and PR number. Use the smallest repository-scoped
read permission. Keep GITHUB_TOKEN in the environment. Run the trusted default-branch
scripts/github_review.py (or scripts/bank/github_review.py in muamalat-shop) with
--repo OWNER/REPO --pr NUMBER. This fetches patches as
data, checks the head SHA is unchanged, and performs inference only on loopback Ollama.

Do not check out or execute PR scripts to obtain a review. Do not run privileged jobs
from fork workflows. Large or incomplete patches must be split or reviewed with full
context; never silently call a truncated review complete. Validate candidate findings
against callers and tests. Report omitted files and the reviewed SHA.

Prepare a concise review with reproducible scenarios. Posting comments or a review
requires a user request to publish. Never let model output call APIs, alter code,
approve or merge. The workflow in this repo uploads a review artifact when enabled;
it does not send comments to the PR.
