from pathlib import Path
import json,hashlib,collections
R=Path.cwd();D=Path(__file__).parent;sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();items=[]
for x in json.loads(Path('docs/evidence/CEU-20260907/T-04/inputs.json').read_text()):
 p=Path(x['file']);assert sha(p)==x['sha256'];items.append({'path':str(p),'sourceKind':x['kind'],'sourceIndex':'T-04/inputs.json','sha':sha(p)})
base=Path('docs/evidence/CEU-20260907/M-01/generated-r4')
for x in json.loads((base/'manifest.json').read_text()):
 p=base/x['file'];items.append({'path':str(p),'sourceKind':x['kind'],'sourceIndex':'M-01/generated-r4/manifest.json','sha':sha(p)})
for file,kind in [('docs/evidence/CEU-20260907/M-01/supplement/withdrawn.json','constructed seed/breach input, public negotiation continuation'),('docs/evidence/CEU-20260907/Q-02/desktop-final-raw.json','Q-01 deterministic anonymous simulated career, reused Q-02 raw')]:
 p=Path(file);items.append({'path':file,'sourceKind':kind,'sourceIndex':'prior batch index','sha':sha(p)})
actions={'HALF_YEAR_PLAN':'chooseTraining合法focus/策略→事件或READY→报告','SPECIAL_EVENT':'当前合法事件路线→提交→RESULT；不能跳过事件','SPECIAL_EVENT_RESULT':'确认结果→READY恰好结算一次','SIMULATION_READY':'continueCareer触发恰好一次模拟；报告后重载不再模拟','HALF_YEAR_REPORT':'只读加载/回看；professionalNextAction按上下文合法分流','PRO_STAGE_COMPLETE':'沿兼容分流，合同到期不得跳过续约/签约','TRANSFER_WINDOW':'先比较完整报价/谈判/选择，合法确认→NONE到队→计划','TRANSFER_ARRIVAL':'NONE报到→下一计划','CAREER_RETIRED':'加载/查看/导出，不再加窗'}
for x in items:
 e=json.loads(Path(x['path']).read_text());g=e['data'];x.update({'phase':g['phase'],'window':g['windowIndex'],'version':[g['saveVersion'],g['dataVersion']],'seed':g['careerSeed'],'nextAction':actions.get(g['phase'],'按现phase公开动作，实施前核查'),'mustPreserve':['history prefix','saved report','careerEventHistory prefix','existing transferOffers order/fields','draft','v11 original backup'],'s1Scope':'source bytes verified; no new per-file replay here. Existing automated suite rerun, full old-save successor matrix belongs S3.'})
out=D/'old-save-inventory.json'
if out.exists():assert json.loads(out.read_text())==items
else:
 with out.open('x') as f:json.dump(items,f,ensure_ascii=False,indent=2)
print('old saves',len(items),collections.Counter(x['phase'] for x in items))
y=json.loads(Path('docs/evidence/CEU-20260907/T-01/training-v11/young-full.json').read_text());print('training54',collections.Counter(x['kind'] for x in y));print('pro approaches',collections.Counter(x['input']['state']['developmentApproach'] for x in y if x['kind']!='youth'))
