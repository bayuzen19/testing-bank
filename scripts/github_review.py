"""Fetch PR patches using read-only GitHub API calls; inference stays on loopback."""
import argparse
import json
import os
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from local_model import NoRedirect, infer
from review import SCHEMA, SYSTEM, validate_review


def github_get(path):
    base = os.environ.get('GITHUB_API_URL', 'https://api.github.com').rstrip('/')
    parsed = urlsplit(base)
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('GitHub API must use HTTPS without embedded credentials')
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        raise ValueError('Set a read-only GITHUB_TOKEN for the approved repository')
    req = urllib.request.Request(base + path, headers={
        'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'hermes-bank-review',
    })
    with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect()).open(req, timeout=45) as response:
        return json.load(response)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--repo', required=True)
    p.add_argument('--pr', required=True, type=int)
    p.add_argument('--output', type=Path, default=Path('reports/github-review.json'))
    p.add_argument('--file', action='append', default=[], help='Exact changed file to review; repeat for a bounded scope')
    a = p.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', a.repo) or a.pr < 1:
        raise ValueError('Invalid repository or PR number')
    prefix = f'/repos/{a.repo}/pulls/{a.pr}'
    pr = github_get(prefix)
    sections, allowed, omitted = [], {}, []
    count = 0
    for page in range(1, 31):
        files = github_get(f'{prefix}/files?per_page=100&page={page}')
        for item in files:
            count += 1
            name, patch = item['filename'], item.get('patch', '')
            if a.file and name not in a.file:
                omitted.append(name)
                continue
            if (Path(name).suffix not in {'.ts', '.tsx', '.jsx', '.js', '.py', '.yml', '.yaml', '.mjs'}
                    or '.env' in Path(name).name or not patch):
                omitted.append(name)
                continue
            if re.search(r'-----BEGIN .*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}', patch):
                raise ValueError('Possible secret in PR; stop and handle through incident process')
            ends = [int(start) + int(length or 1) for start, length in re.findall(r'@@ .*?\+(\d+)(?:,(\d+))? @@', patch)]
            allowed[name] = max(ends, default=1)
            sections.append(f'FILE {name}\n{patch}')
        if len(files) < 100:
            break
    if count != pr['changed_files']:
        raise ValueError('GitHub file listing incomplete; no full-review claim allowed')
    if set(a.file)-set(allowed):
        raise ValueError('Requested file missing, unsupported or patch unavailable')
    prompt = '\n\n'.join(sections)
    if not prompt or len(prompt) > 22000:
        raise ValueError('PR scope empty or too large; split into smaller reviews')
    raw, metadata = infer(SYSTEM, prompt, schema=SCHEMA)
    result = validate_review(json.loads(raw), allowed)
    after = github_get(prefix)
    if after['head']['sha'] != pr['head']['sha']:
        raise ValueError('PR changed during review; rerun against the current head')
    result.update({'repository': a.repo, 'pr': a.pr, 'head_sha': pr['head']['sha'],
                   'status': 'advisory-human-review-required', 'omitted_files': omitted,
                   'requested_files': a.file,
                   'scope': 'GitHub patches only; full-file context and execution not included', 'inference': metadata})
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print('Read-only PR review saved; no comment, approval, commit or merge was sent')


if __name__ == '__main__':
    main()
