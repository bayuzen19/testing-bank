"""Loopback-only Ollama client. Never follow redirects or use ambient proxies."""
import json
import os
import urllib.request
from urllib.parse import urlsplit


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Redirects are forbidden for local inference')


def validate_endpoint(url):
    parsed = urlsplit(url)
    if (parsed.scheme != 'http' or parsed.hostname not in {'127.0.0.1', '::1'}
            or parsed.username or parsed.password or parsed.query or parsed.fragment
            or parsed.path not in {'', '/'}):
        raise ValueError('OLLAMA_URL must be a literal loopback HTTP address, e.g. http://127.0.0.1:11434')
    return url.rstrip('/')


def client():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


def local_request(path, body=None, timeout=600):
    base = validate_endpoint(os.environ.get('OLLAMA_URL', 'http://127.0.0.1:11434'))
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(base + path, data=data, headers={'Content-Type': 'application/json'})
    with client().open(request, timeout=timeout) as response:
        return json.load(response)


def infer(system, prompt, model=None, schema=None, thinking=False):
    model = model or os.environ.get('LOCAL_MODEL', 'gemma4:26b')
    if any(s in model.lower() for s in ('cloud', '/', 'http')):
        raise ValueError('Cloud and remote model identifiers are forbidden')
    installed = local_request('/api/tags')['models']
    entry = next((item for item in installed if item.get('name') == model), None)
    if not entry or entry.get('remote_host') or entry.get('remote_model'):
        raise ValueError('Model must already be installed locally; no automatic pull or cloud fallback')
    details = local_request('/api/show', {'model': model})
    if details.get('remote_host') or details.get('remote_model'):
        raise ValueError('Remote-backed model is forbidden')
    payload = {
        'model': model, 'stream': False, 'think': thinking, 'keep_alive': '2m',
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
        'options': {'temperature': 0.1, 'seed': 42, 'num_ctx': 8192, 'num_predict': 4096 if thinking else 1800},
    }
    if schema:
        payload['format'] = schema
    response = local_request('/api/chat', payload)
    if response.get('done_reason') == 'length':
        raise ValueError('Model response truncated; reduce review scope')
    return response['message']['content'], {
        'model': model, 'model_digest': entry.get('digest'),
        'thinking': thinking,
        'endpoint': 'loopback', 'eval_count': response.get('eval_count'),
        'eval_duration_ns': response.get('eval_duration'),
        'total_duration_ns': response.get('total_duration'),
    }
