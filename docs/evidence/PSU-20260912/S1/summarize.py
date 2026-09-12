from pathlib import Path
import json,gzip,statistics,hashlib
D=Path(__file__).parent;data=json.loads(gzip.decompress((D/'outputs.json.gz').read_bytes()));base=json.loads((D/'inputs-valid.json').read_text())['base']['state'];groups={}
def dist(xs):
 s=sorted(xs);return {'mean':statistics.mean(s),'min':s[0],'p10':s[round((len(s)-1)*.1)],'p50':s[round((len(s)-1)*.5)],'p90':s[round((len(s)-1)*.9)],'max':s[-1]}
for row in data:
 if row['group']!='main':continue
 role,approach,_=row['id'].split('/');groups.setdefault((role,approach),[]).append(row)
out=[]
for (role,a),rs in groups.items():
 metrics={}
 for k in ['appearances','starts','minutes','averageRating','goals','assists']:metrics[k]=dist([r['output']['report']['stats'][k] for r in rs])
 metrics['substitutes']=dist([r['output']['report']['stats']['appearances']-r['output']['report']['stats']['starts'] for r in rs])
 for k in ['form','fitness','morale','coachRelation','squadRelation','reputation']:
  metrics['prepared_'+k]=dist([r['probe']['prepared'][k] for r in rs]);metrics['final_'+k]=dist([r['output']['player'][k] for r in rs])
 for k in ['attack','defense','physical','mental']:metrics['growth_'+k]=dist([r['output']['player']['attributes'][k]-base['player']['attributes'][k] for r in rs])
 totalApps=sum(r['output']['report']['stats']['appearances'] for r in rs);roleAfter={}
 for r in rs:
  rr=r['output']['firstTeamRole'];roleAfter[rr]=roleAfter.get(rr,0)+1
 out.append({'role':role,'approach':a,'n':len(rs),'metrics':metrics,'startsPerAppearance':sum(r['output']['report']['stats']['starts'] for r in rs)/totalApps if totalApps else None,'injured':sum(bool(r['output']['report']['injury']) for r in rs),'oldRisk':dist([r['oldRiskFormula'] for r in rs]),'roleAfter':roleAfter})
result={'scope':'1500 main only; 100 paired seeds; no independence claim across roles','quantiles':'nearest rank round((n-1)*q)','rows':out}
p=D/'aggregate.json';assert not p.exists();p.write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('role approach apps starts bench minutes rating injuries% startshare')
for r in out:print(r['role'],r['approach'],*[round(r['metrics'][k]['mean'],3) for k in ['appearances','starts','substitutes','minutes','averageRating']],r['injured'],round(r['startsPerAppearance'],3))
