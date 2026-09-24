param([int]$PullRequest = 1)
$ErrorActionPreference = 'Stop'
if ($PullRequest -lt 1) { throw 'Positive PR number required' }
$reviewToken = Read-Host 'Read-only GitHub token (not saved)' -AsSecureString
try {
    $env:GITHUB_TOKEN = [System.Net.NetworkCredential]::new('', $reviewToken).Password
    $env:OLLAMA_NO_CLOUD = '1'
    $env:LOCAL_MODEL = 'gemma4:26b'
    python scripts/github_review.py --repo bayuzen19/testing-bank --pr $PullRequest --output "reports/github-review-pr$PullRequest.json"
    if ($LASTEXITCODE -ne 0) { throw 'Review failed; inspect non-secret diagnostic output' }
} finally { Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue }
