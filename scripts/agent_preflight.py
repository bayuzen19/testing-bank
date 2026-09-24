"""Read-only local-inference compatibility check for the installed Hermes profile."""
import argparse,json
from pathlib import Path
from local_model import local_request,validate_endpoint

def main():
    import yaml
    p=argparse.ArgumentParser();p.add_argument('--profile',type=Path,required=True);a=p.parse_args()
    cfg=yaml.safe_load((a.profile/'config.yaml').read_text(encoding='utf8'));model=cfg['model']
    if model['provider']!='custom':raise ValueError('Custom local provider required')
    url=model['base_url'];validate_endpoint(url.removesuffix('/v1'))
    if cfg.get('fallback_model') or cfg.get('fallback_providers'):raise ValueError('Fallbacks must be disabled')
    name=model['default'];installed=local_request('/api/tags')['models'];entry=next(x for x in installed if x['name']==name)
    if entry.get('remote_host') or entry.get('remote_model'):raise ValueError('Remote-backed model forbidden')
    details=local_request('/api/show',{'model':name});limits=[v for k,v in details.get('model_info',{}).items() if k.endswith('.context_length')]
    if not limits or min(limits)<64000 or model.get('ollama_num_ctx',0)<64000:raise ValueError('Hermes requires at least 64k model AND runtime context')
    routes=cfg.get('auxiliary',{})
    for name_,route in routes.items():
        if not isinstance(route,dict):continue
        if route.get('provider')!='custom' or route.get('fallback_chain'):raise ValueError('Non-local auxiliary route: '+name_)
        validate_endpoint(route.get('base_url','').removesuffix('/v1'))
    print(json.dumps({'model':name,'digest':entry['digest'],'runtime_context':model['ollama_num_ctx'],'advertised_context':min(limits),'inference':'literal loopback','auxiliary_routes_checked':len(routes),'fallbacks':'disabled','boundary':'configuration validation; OS egress isolation is a separate production control'},indent=2))
if __name__=='__main__':main()
