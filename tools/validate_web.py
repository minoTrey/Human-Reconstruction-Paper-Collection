"""Offline consistency checks for public indexes, detail shards, downloads and stats."""
import csv,json,pathlib,os
from collections import Counter
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/os.environ['HUMAN_WEB_OUTPUT'] if os.environ.get('HUMAN_WEB_OUTPUT') else ROOT/'web-publish' if (ROOT/'web-publish').exists() else ROOT
def load(p):return json.loads((OUT/p).read_text(encoding='utf-8'))
def main():
 meta=load('data/meta.json');broad=load('data/candidates.json');ref=load('data/reference.json');stats=load('data/statistics.json');editorial=load('downloads/editorial-reviews.json');reading=load('data/reading-paths.json')
 ids={r['id']:r for r in broad};assert len(ids)==len(broad)==meta['candidateCount'];assert len(ref)==meta['referenceCount'];assert len({r['id'] for r in ref})==len(ref)
 details={}
 for shard in range(32):details.update(load(f'data/details/{shard}.json'))
 assert set(ids)|set(meta['aliases'])==set(details)
 csvrows=list(csv.DictReader((OUT/'downloads/candidates.csv').open(encoding='utf-8-sig',newline='')));assert len(csvrows)==len(broad)
 for row in csvrows:
  r=ids[row['id']];assert row['title']==r['t'];assert row['input_tags']=='|'.join(r['i']);assert row['output_tags']=='|'.join(r['o']);assert row['representation_mentions']=='|'.join(r['r']);assert row['evidence']==r['e']
  for basis,column in [('venue','venue_year'),('manuscript','manuscript_year'),('index','index_year')]:assert row[column]==str(r['y'][basis] or '')
 for name,rows in [('reference',ref),('broad',broad)]:
  assert stats[name]['total']==len(rows);assert stats[name]['evidence']==dict(Counter(r['e'] for r in rows));assert stats[name]['by_category']==dict(Counter(r['c'] for r in rows))
  for basis in ['venue','manuscript','index']:
   known=[r for r in rows if r['y'][basis] is not None];assert stats[name]['by_basis'][basis]['known']==len(known);assert stats[name]['by_basis'][basis]['unknown']==len(rows)-len(known);assert stats[name]['by_basis'][basis]['years']==dict(Counter(str(r['y'][basis]) for r in known))
 for item in load('downloads/reference.json'):
  r=item['record'];assert r in ref;assert item['details']==details[r['id']]
 assert len(editorial['records'])==32
 for review in editorial['records']:
  r=ids[review['id']];assert r['i']==review['input_tags'];assert r['o']==review['output_tags'];assert details[r['id']]['review']==review
  for field in review['fields'].values():
   assert field['status'] in ['reviewed','unconfirmed','scope_inference'];assert all(0<=n<len(review['sources']) for n in field['sources']);assert field['value'] or field['status']=='unconfirmed'
 for alias,canonical in meta['aliases'].items():assert alias not in ids and canonical in ids and details[alias]['aliasOf']==canonical
 assert ids['hr_dd9fccc9a9ba73']['i']==['video'];assert ids['hr_776e4c1c02f286']['i']==['radar'];assert ids['hr_9e5bfe686f8f79']['i']==['stereo'];assert ids['hr_fb784d0fc0d675']['o'];assert ids['hr_c45358e60d7358']['o']==['rgb'];assert ids['hr_e360010f7920c5']['o']==['texture'];assert ids['hr_9824a995989ad9']['i']==['single'];assert ids['hr_9824a995989ad9']['optionalInputs']==['multi']
 for path in reading['paths']:assert all(id in ids for id in path['papers'])
 assert len(reading['relations'])==15
 for rel in reading['relations']:assert rel['from'] in ids and rel['to'] in ids and rel['type'] in reading['relation_types'] and rel['source'].startswith('https://')
 result={'status':'passed','reference':len(ref),'candidates':len(broad),'reviewed':32,'relations':15,'aliases':len(meta['aliases']),'checks':'index/detail/CSV/reference download/statistics IDs, fields, years, denominators; representative I/O and source-status regressions'}
 print(json.dumps(result));return result
if __name__=='__main__':main()
