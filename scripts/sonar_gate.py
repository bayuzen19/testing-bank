"""Verify the quality gate of this scanner task, never the latest project scan."""
import argparse
import json
import os
import re
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from local_model import NoRedirect


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--task', type=Path, default=Path('.scannerwork/report-task.txt'))
    p.add_argument('--sha', required=True)
    p.add_argument('--output', type=Path, default=Path('reports/sonar.json'))
    a = p.parse_args()
    if not re.fullmatch('[0-9a-f]{40}', a.sha):
        raise ValueError('A complete commit SHA is required')
    base = os.environ['SONAR_HOST_URL'].rstrip('/')
    u = urlsplit(base)
    if u.username or u.password or u.query or u.fragment or u.scheme not in {'http', 'https'}:
        raise ValueError('Invalid Sonar URL')
    if u.scheme == 'http' and u.hostname not in {'localhost', '127.0.0.1', '::1'}:
        raise ValueError('Use TLS for non-loopback SonarQube')
    props = dict(line.split('=', 1) for line in a.task.read_text().splitlines() if '=' in line)
    if props['serverUrl'].rstrip('/') != os.environ.get('SONAR_SCANNER_URL', base).rstrip('/'):
        raise ValueError('Scanner task belongs to a different server')
    def get(path, **params):
        request = urllib.request.Request(base + path + '?' + urlencode(params), headers={
            'Authorization': 'Bearer ' + os.environ['SONAR_TOKEN']})
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
            return json.load(response)
    deadline = time.monotonic() + 300
    while True:
        task = get('/api/ce/task', id=props['ceTaskId'])['task']
        if task['status'] == 'SUCCESS':
            break
        if task['status'] in {'FAILED', 'CANCELED'} or time.monotonic() > deadline:
            raise ValueError('Sonar processing failed or timed out')
        time.sleep(3)
    gate = get('/api/qualitygates/project_status', analysisId=task['analysisId'])['projectStatus']
    result = {'sha': a.sha, 'analysis_id': task['analysisId'], 'task_id': props['ceTaskId'],
              'status': gate['status'], 'conditions': gate.get('conditions', [])}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    if gate['status'] != 'OK':
        raise SystemExit('Sonar quality gate is not OK')
    print('Sonar quality gate OK for the current scanner task')


if __name__ == '__main__':
    main()
