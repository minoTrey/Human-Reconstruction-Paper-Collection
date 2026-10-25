"""Small dependency keys and proof checks; no publisher, model or UI changes."""
import datetime
import hashlib
import json
from pathlib import Path
import time

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def key(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False).encode('utf8')).hexdigest()

def validate_preview(spec,root):
    root=Path(root);m=spec['metadata'];c=spec['content'];errors=[]
    def error(code,at,detail):errors.append({'code':code,'at':at,'detail':detail})
    def read(name,fallback):
        try:return json.loads((root/name).read_text('utf8'))
        except (OSError,ValueError) as e:error('file',name,str(e));return fallback
    rows=read('data/reader.json',[]);matches=[r for r in rows if r.get('id')==m['id']];row=matches[0] if matches else {}
    if len(matches)!=1:error('id','reader','Expected one existing ID')
    if row.get('k')!=c['summary']:error('summary','reader.k','Summary mismatch')
    for k,v in m['row_patch'].items():
        if k in ['d','y']:
            for sub,value in v.items():
                if row.get(k,{}).get(sub)!=value:error('metadata',k+'.'+sub,'Mismatch')
        elif row.get(k)!=v:error('metadata',k,'Mismatch')
    detail=read(f"data/details/{m['shard']}.json",{}).get(m['id'],{})
    if detail.get('resourceAvailability')!=m['resource_availability']:error('resource','resourceAvailability','Mismatch')
    if row.get('l') is not None and row['l']!=m['resources']:error('resource','reader.l','Mismatch')
    regions=read('data/body-regions.json',{}).get('records',[])
    if not any(r.get('id')==m['id'] and r.get('regions')==m['regions'] for r in regions):error('region','body-regions','Mismatch')
    visible=' '.join([c['summary'],*[c['fields'].get(k,'') for k in ['input','output','conditions','evaluation','limitations']],*[s['title']+' '+s['text'] for s in c['steps']]])
    for word in spec['qa']['required_text']:
        if word not in visible:error('visible_term',word,'Missing from displayed guide')
    for f in m['figures']:
        for name in [f"assets/papers/{m['slug']}/{f['asset_name']}",f.get('licenseUrl','')]:
            if name and not name.startswith('https://') and not (root/name).is_file():error('internal_link',name,'Missing')
    return errors

def group_keys(spec,root,version):
    root=Path(root);m=spec['metadata'];c=spec['content'];q=spec['qa']
    ui={p.name:sha(p) for p in root.iterdir() if p.is_file() and p.suffix in ['.js','.css','.html']}
    reader=root/'data/reader.json';common=[version,ui,sha(reader)]
    figures=[(f,sha(root/f"assets/papers/{m['slug']}/{f['asset_name']}")) for f in m['figures']]
    search=[m['id'],m['row_patch'],m['regions'],q['queries'],c['summary']]
    detail=[c['summary'],{k:c['fields'].get(k) for k in ['input','output','conditions','evaluation','limitations']},c['steps'],m['resources'],q['required_text'],q['resource_labels'],figures]
    return {f'{width}:{name}':key([common,width,value]) for width in [1180,390] for name,value in [('search',search),('detail',detail),('figure',figures)]}

def compare_captures(local,public,names,reviewed=False):
    local=Path(local);public=Path(public);same=[];changed=[];missing=[]
    for name in names:
        if not (local/name).is_file() or not (public/name).is_file():missing.append(name)
        elif sha(local/name)==sha(public/name):same.append(name)
        else:changed.append(name)
    status='failed' if missing or not names else 'changed_review_required' if changed else 'identical'
    return {'status':status,'same':same,'changed':changed,'missing':missing,'second_identical_visual_review_skipped':status=='identical' and reviewed}

def wait_for_deployment(commit,fetch,sleep=time.sleep,timeout=240):
    started=time.monotonic();queries=0
    while time.monotonic()-started<timeout:
        runs=fetch();queries+=1
        for run in runs:
            if run.get('head_sha')==commit and run.get('status')=='completed':
                return {'status':'passed' if run.get('conclusion')=='success' else 'failed','queries':queries,'completed_at':run.get('updated_at'),'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seconds':round(time.monotonic()-started,3),'run_url':run.get('html_url')}
        sleep(3)
    return {'status':'timeout','queries':queries,'seconds':round(time.monotonic()-started,3)}
