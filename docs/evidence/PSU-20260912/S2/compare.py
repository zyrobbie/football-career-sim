from pathlib import Path
import json,gzip,statistics
D=Path(__file__).parent
new=json.loads((D/'aggregate.json').read_text())['rows'];old=json.loads((D.parent/'S1/aggregate.json').read_text())['rows'];pairs=[]
for r in new:
 o=next(x for x in old if (x['role'],x['approach'])==(r['role'],r['approach']));s=next(x for x in new if x['role']==r['role'] and x['approach']=='STEADY');delta=lambda a,b,k:a['metrics'][k]['mean']-b['metrics'][k]['mean'];pairs.append({'role':r['role'],'approach':r['approach'],'newMinusOld':{k:delta(r,o,k) for k in ['appearances','starts','substitutes','minutes','averageRating']},'newMinusSteady':{k:delta(r,s,k) for k in ['appearances','starts','substitutes','minutes','averageRating']},'startShareDeltaVsSteady':r['startsPerAppearance']-s['startsPerAppearance']})
for r in pairs:
 if r['approach']=='PUSH':assert r['newMinusSteady']['appearances']>0 and r['newMinusSteady']['starts']>0
 if r['approach']=='TEAM_FIRST':assert r['newMinusSteady']['appearances']>0 and r['newMinusSteady']['substitutes']>0 and r['startShareDeltaVsSteady']<=0
rotation=next(r for r in pairs if r['role']=='ROTATION' and r['approach']=='PUSH');assert 1.2<=rotation['newMinusSteady']['appearances']<=2.2
get=lambda role,a:next(x for x in new if x['role']==role and x['approach']==a)['metrics']['appearances']['mean'];gap=get('STARTER','STEADY')-get('FRINGE','PUSH');assert gap>=4
rows=json.loads(gzip.decompress((D/'continuous.json.gz').read_bytes()));long=[]
for r in rows:
 ws=r['windows'];base=r['input']['player'];final=ws[-1]['after']['player'];stats=[w['after']['lastReport']['stats'] for w in ws];fitness=[base['fitness']]+[w['after']['player']['fitness'] for w in ws];risks=[]
 for w in ws:
  before=w['probe']['before'];prepared=w['probe']['prepared'];recovery=min(before[k] for k in ['form','fitness','morale'])<46;delta=0 if recovery else {'PUSH':.025,'STEADY':-.015,'TEAM_FIRST':0}[w['selection']['approach']];lo,hi=(.03,.12) if recovery else (.015,.16);risks.append(max(lo,min(hi,.04+(50-prepared['fitness'])*.001+(45-prepared['attributes']['physical'])*.0005+delta)))
 long.append({'group':r['group']['id'],'approach':r['approach'],'windows':len(ws),'appearances':sum(s['appearances'] for s in stats),'minutes':sum(s['minutes'] for s in stats),'injuries':sum(bool(w['after']['lastReport']['injury']) for w in ws),'injuryWeeks':sum((w['after']['lastReport']['injury'] or {}).get('weeks',0) for w in ws),'fitnessTrajectory':fitness,'meanTheoreticalRisk':statistics.mean(risks),'recoveryWindows':sum(min(w['probe']['before'][k] for k in ['form','fitness','morale'])<46 for w in ws),'actualPlans':[w['selection'] for w in ws],'attributeDelta':{k:final['attributes'][k]-base['attributes'][k] for k in base['attributes']},'reputationDelta':final['reputation']-base['reputation'],'coachDelta':final['coachRelation']-base['coachRelation'],'squadDelta':final['squadRelation']-base['squadRelation'],'roleTrajectory':[r['input']['firstTeamRole']]+[w['after']['firstTeamRole'] for w in ws],'cashBefore':r['input']['cashEuro'],'cashAfter':r['final']['cashEuro'],'contractAfter':r['final']['contract'],'finalPhase':r['final']['phase'],'externalActionSequence':[a['label'] for a in r['actions'] if a['label'].startswith(('event ','report ','select '))]})
divergences=[]
for group in sorted(set(r['group'] for r in long)):
 rs=[r for r in long if r['group']==group];base=next(x for x in rs if x['approach']=='STEADY')['externalActionSequence'];divergences.append({'group':group,'sameExternalChoiceSequence':all(x['externalActionSequence']==base for x in rs),'note':'All state/performance trajectories still naturally diverge; matching action labels does not imply equal event effects or market offers.'})
oldInj=json.loads(gzip.decompress((D/'injury-outputs.json.gz').read_bytes()));extended=json.loads(gzip.decompress((D/'injury-maintenance-10000-outputs.json.gz').read_bytes()));oldRows=[r for r in oldInj if r['group']=='maintenance'];overlap=[r for r in extended if int(r['seed'].split('-')[-1])<1000];assert overlap==oldRows
out={'mainComparisons':pairs,'starterSteadyMinusFringePush':gap,'rotationPushGain':rotation['newMinusSteady']['appearances'],'continuousActualHalfYears':sum(x['windows'] for x in long),'continuous':long,'externalChoiceComparison':divergences,'injuryExtendedOriginal1000Exact':True,'injuryUniqueInputCount':15000+27000,'injuryNote':'maintenance10000 includes original1000; distinct seeds10000, not11000. Normal/threshold/high/recovery remain1000 each; groups/window streams differ.'}
p=D/'comparison.json'
if p.exists():assert json.loads(p.read_text())==out
else:
 with p.open('x') as f:json.dump(out,f,ensure_ascii=False,indent=2)
print('main PASS rotation+',out['rotationPushGain'],'role gap',gap)
for r in long:print(r['group'],r['approach'],r['appearances'],r['minutes'],r['fitnessTrajectory'],'inj',r['injuries'],'recover',r['recoveryWindows'],'squad+',r['squadDelta'],'risk',round(r['meanTheoreticalRisk'],4))
print('extended', (D/'injury-maintenance-10000-summary.json').read_text())
