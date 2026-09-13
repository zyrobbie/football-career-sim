import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { useGameStore, runReadySimulation } from './gameStore'
import { loadGame, saveGame, validateGameState, deleteSavedCareer } from '../persistence/save'
import { createKeyMatchMoment, resolveKeyMatchMoment, momentSnapshot, validateMomentContext, canonicalMomentJSON, momentChances } from '../engine/keyMatchMoments'
import { prepareReadySimulation } from '../engine/simulationPreparation'
import { simulateProfessionalHalfYear } from '../engine/simulateProfessionalHalfYear'
import type { GameState } from '../models/game'
import { SAVE_VERSION, DATA_VERSION } from '../models/game'
import { KEY_MATCH_MOMENT_TEMPLATES } from '../data/keyMatchMomentTemplates'
import type { MomentActionContext } from '../models/keyMatchMoment'
const rows=JSON.parse(readFileSync('docs/evidence/KMM-20260913/S0/baseline-results.json','utf8')) as Array<{id:string,raw:string,final:GameState,normalized:GameState}>
let mem:Map<string,string>,writes:number
beforeEach(()=>{mem=new Map();writes=0;vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{writes++;mem.set(k,v)},removeItem:(k:string)=>mem.delete(k)}});useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})})
afterEach(()=>vi.unstubAllGlobals())
const ctx=(g:GameState):MomentActionContext=>({careerSeed:g.careerSeed,playerId:g.player!.id,windowIndex:g.windowIndex,clubId:g.selectedClubId!,momentId:g.pendingKeyMatchMoment!.id,inputFingerprint:g.pendingKeyMatchMoment!.inputFingerprint})
function initial(id='young',position='CAM'):GameState {
 mem.set('career_save_current',rows.find(r=>r.id===id)!.raw);const g=loadGame()!;
 g.player!.primaryPosition=position as 'CAM';g.player!.secondaryPosition=position==='CB'?'CDM':'CM';g.player!.positionFamiliarity[g.player!.primaryPosition]=100;g.player!.positionFamiliarity[g.player!.secondaryPosition]=92;
 saveGame(g);return g
}
function enter(id='young',position='CAM') {const g=initial(id,position);useGameStore.setState({game:g});useGameStore.getState().continueCareer();const pending=useGameStore.getState().game!;expect(useGameStore.getState().error).toBeNull();expect(pending.phase).toBe('KEY_MATCH_MOMENT');return pending}
for(const row of rows)it(`OFF exactly matches frozen business state: ${row.id}`,()=>{
 mem.set('career_save_current',row.raw);const g=loadGame()!,result=runReadySimulation(g,{keyMatchMoments:false});expect(result).toEqual({...row.final,saveVersion:SAVE_VERSION,dataVersion:DATA_VERSION,pendingKeyMatchMoment:null});expect(mem.get('career_save_v12_backup')).toBe(row.raw)
})
for(const id of ['young','31-body','34-body','34-recovery','22-youth','consequence','terminal54'])it(`prepared pause and full successor exactly once: ${id}`,()=>{
 const p=enter(id),before=rows.find(r=>r.id===id)!.normalized;
 expect(p.player).toEqual(before.player);expect(p.contract).toEqual(before.contract);expect(p.cashEuro).toBe(before.cashEuro);expect(p.history).toEqual(before.history);expect(p.pendingConsequences).toEqual(before.pendingConsequences);expect(p.trainingQualityBonus).toBe(before.trainingQualityBonus)
 const e=ctx(p);useGameStore.getState().chooseKeyMatchMoment('A',e);const result=useGameStore.getState().game!;expect(result.phase).toBe('KEY_MATCH_MOMENT_RESULT');expect(result.player).toEqual(p.player);expect(loadGame()).toEqual(result)
 const n=writes;useGameStore.getState().chooseKeyMatchMoment('B',e);expect(writes).toBe(n)
 useGameStore.getState().finishKeyMatchMoment(e);const report=useGameStore.getState().game!;expect(useGameStore.getState().error).toBeNull();expect(report.phase).toBe('HALF_YEAR_REPORT');expect(report.history).toHaveLength(p.history.length+1);expect(report.history.slice(0,-1)).toEqual(p.history);expect(report.lastReport!.keyMatchMoment).toEqual(result.pendingKeyMatchMoment!.snapshot);expect(report.history.at(-1)!.keyMatchMoment).toEqual(report.lastReport!.keyMatchMoment);expect(report.contract!.remainingHalfYears).toBe(p.contract!.remainingHalfYears-1);expect(report.pendingKeyMatchMoment).toBeNull();expect(loadGame()).toEqual(report)
 const saved=writes;useGameStore.getState().finishKeyMatchMoment(e);useGameStore.getState().continueCareer();expect(writes).toBe(saved);expect(useGameStore.getState().game).toEqual(report)
})
it('all three templates match positions and one saved roll, invalid context is rejected without writes',()=>{
 for(const pos of ['ST','CAM','CB']){const g=enter('young',pos),e=ctx(g),n=writes;for(const bad of [{windowIndex:g.windowIndex+1},{careerSeed:'another-career'},{playerId:'another-player'},{clubId:'bad'},{momentId:'old'},{inputFingerprint:'bad'}])useGameStore.getState().chooseKeyMatchMoment('A',{...e,...bad});expect(writes).toBe(n);expect(g.pendingKeyMatchMoment!.choices).toHaveLength(3);for(const c of g.pendingKeyMatchMoment!.choices){expect(momentChances(g.pendingKeyMatchMoment!.prepared,c).positive).toBeGreaterThanOrEqual(.2);expect(resolveKeyMatchMoment(g.pendingKeyMatchMoment!,c.id)).toEqual(resolveKeyMatchMoment(loadGame()!.pendingKeyMatchMoment!,c.id))}}
})
it('youth report and zero actual appearances never trigger; existing old senior history is not debut',()=>{
 const g=initial('youth8'),r=prepareReadySimulation(g),report=simulateProfessionalHalfYear({state:r.simulationState,offer:r.offer}).report;expect(createKeyMatchMoment(g,report)).toBeNull();const adult=initial(),a=prepareReadySimulation(adult),ar=simulateProfessionalHalfYear({state:a.simulationState,offer:a.offer}).report;expect(createKeyMatchMoment(adult,{...ar,stats:{...ar.stats,appearances:0}})).toBeNull();adult.history=[{...rows[0]!.final.history[0]!,windowIndex:adult.windowIndex-1}];adult.careerSeed='kmm-fixed-0';adult.windowIndex=42;const m=createKeyMatchMoment(adult,ar);expect(m).not.toBeNull();expect(m!.debutMoment).toBe(false)
})
it('schema rejects illegal phase/choice/delta/rules and never falls back over an invalid Pending',()=>{
 const g=enter();for(const mutate of [(x:GameState)=>{x.phase='HALF_YEAR_REPORT'},(x:GameState)=>{x.pendingKeyMatchMoment!.rulesVersion=2 as 1},(x:GameState)=>{x.pendingKeyMatchMoment!.windowIndex++},(x:GameState)=>{x.pendingKeyMatchMoment!.choices[0]!.weights.attack=NaN},(x:GameState)=>{x.pendingKeyMatchMoment!.roll=.99999}]){const bad=structuredClone(g);mutate(bad);expect(()=>validateGameState(bad)).toThrow()}
 const raw=mem.get('career_save_current')!;mem.set('career_save_backup',rows[0]!.raw);mem.set('career_save_current',raw.replace('"rulesVersion":1','"rulesVersion":2'));expect(()=>loadGame()).toThrow();expect(mem.get('career_save_current')).not.toBe(rows[0]!.raw)
})
it('write failure leaves choice retryable; persisted choice with stale UI cannot be changed',()=>{
 const g=enter(),e=ctx(g),set=window.localStorage.setItem;window.localStorage.setItem=()=>{throw new Error('quota')};useGameStore.getState().chooseKeyMatchMoment('A',e);expect(useGameStore.getState().game).toEqual(g);window.localStorage.setItem=set;useGameStore.getState().chooseKeyMatchMoment('A',e);const selected=loadGame()!;useGameStore.setState({game:g});const n=writes;useGameStore.getState().chooseKeyMatchMoment('B',e);expect(writes).toBe(n);expect(useGameStore.getState().game).toEqual(selected)
})
it('READY resolved resumes after close, disk report wins over stale result and no storage refuses confirmation',()=>{
 const g=enter(),e=ctx(g);useGameStore.getState().chooseKeyMatchMoment('C',e);const result=loadGame()!;saveGame({...result,phase:'SIMULATION_READY'});useGameStore.setState({game:null});useGameStore.getState().continueCareer();const report=loadGame()!;expect(report.phase).toBe('HALF_YEAR_REPORT');useGameStore.setState({game:result});useGameStore.getState().finishKeyMatchMoment(e);expect(useGameStore.getState().game).toEqual(report);vi.stubGlobal('window',undefined);expect(()=>saveGame(result)).toThrow()
})
it('V12 backup failure leaves original current and V11 untouched; backup remains original across new writes and explicit delete clears it',()=>{
 const raw=rows[0]!.raw;mem.set('career_save_current',raw);mem.set('career_save_v11_backup','original v11');const set=window.localStorage.setItem;window.localStorage.setItem=(k,v)=>{if(k==='career_save_v12_backup')throw Error('quota');set(k,v)};expect(()=>loadGame()).toThrow();expect(mem.get('career_save_current')).toBe(raw);expect(mem.get('career_save_v11_backup')).toBe('original v11');window.localStorage.setItem=set;const g=loadGame()!;saveGame(g);saveGame({...g,cashEuro:g.cashEuro+1});expect(mem.get('career_save_v12_backup')).toBe(raw);deleteSavedCareer();expect(mem.size).toBe(0)
})
it('frozen snapshot survives template text copies and canonical object key ordering',()=>{
 const g=enter();validateMomentContext(g);const shuffled=Object.fromEntries(Object.entries(g).reverse()) as unknown as GameState;expect(canonicalMomentJSON(shuffled)).toBe(canonicalMomentJSON(g));const p=g.pendingKeyMatchMoment!,resolution=resolveKeyMatchMoment(p,'B');expect(momentSnapshot(g,p,resolution).choiceTitle).toBe(p.choices[1]!.title)
})

it('three templates times three choices times three synthetic tiers inject exactly once into original stats',()=>{
 for(const position of ['ST','CAM','CB']){
  const g=enter('young',position),p=g.pendingKeyMatchMoment!,ready=prepareReadySimulation(g),base=simulateProfessionalHalfYear({state:ready.simulationState,offer:ready.offer})
  for(const choice of p.choices)for(const [tier,roll] of [['EXCELLENT',0],['POSITIVE',.21],['NEGATIVE',.99]] as const){
   // Explicit resolver boundary construction, not a naturally generated/persisted roll.
   const resolution=resolveKeyMatchMoment({...p,roll},choice.id);expect(resolution.tier).toBe(tier)
   const actual=simulateProfessionalHalfYear({state:ready.simulationState,offer:ready.offer,momentResolution:resolution}),a=actual.report.stats,b=base.report.stats
   for(const k of ['appearances','starts','minutes','redCards'] as const)expect(a[k]).toBe(b[k])
   for(const k of ['goals','assists','yellowCards'] as const)expect(a[k]-b[k]).toBe(resolution.delta[k])
   expect(a.averageRating).toBeGreaterThanOrEqual(5.5);expect(a.averageRating).toBeLessThanOrEqual(8.5)
   expect(actual.contract).toEqual(base.contract);expect(actual.cashEuro).toBe(base.cashEuro);expect(actual.player.attributes).toEqual(base.player.attributes)
   expect(simulateProfessionalHalfYear({state:ready.simulationState,offer:ready.offer,momentResolution:resolution})).toEqual(actual)
  }
 }
})
it('write succeeds then read confirmation throws: first disk choice wins, including final report',()=>{
 const g=enter(),e=ctx(g),get=window.localStorage.getItem,set=window.localStorage.setItem;let fail=false
 window.localStorage.setItem=(k,v)=>{set(k,v);if(k==='career_save_current')fail=true}
 window.localStorage.getItem=k=>{if(k==='career_save_current'&&fail){fail=false;throw Error('read interrupted')}return get(k)}
 useGameStore.getState().chooseKeyMatchMoment('A',e);expect(useGameStore.getState().game).toEqual(g)
 window.localStorage.getItem=get;window.localStorage.setItem=set;const stored=loadGame()!;expect(stored.pendingKeyMatchMoment!.selectedChoiceId).toBe('A');useGameStore.getState().chooseKeyMatchMoment('B',e);expect(useGameStore.getState().game).toEqual(stored)
 useGameStore.getState().finishKeyMatchMoment(e);const report=loadGame()!;useGameStore.setState({game:stored});const n=writes;useGameStore.getState().finishKeyMatchMoment(e);expect(writes).toBe(n);expect(useGameStore.getState().game).toEqual(report)
})
it('keeps original v11 backup through the explicit 11 to12 to13 chain',()=>{
 const raw=readFileSync('docs/evidence/CEU-20260907/S0-v11-supplement/fixtures/READY_physical.json','utf8').trim();mem.set('career_save_current',raw);const loaded=loadGame()!;expect(loaded.saveVersion).toBe(13);expect(mem.get('career_save_v11_backup')).toBe(raw);expect(mem.has('career_save_v12_backup')).toBe(false);expect(loaded.history).toEqual(JSON.parse(raw).data.history)
})

it('rejects report/history snapshot mismatch without altering saved data',()=>{
 const g=enter(),e=ctx(g);useGameStore.getState().chooseKeyMatchMoment('A',e);useGameStore.getState().finishKeyMatchMoment(e);const report=loadGame()!,raw=mem.get('career_save_current')
 for(const mutate of [(x:GameState)=>{x.history.at(-1)!.keyMatchMoment!.windowIndex++},(x:GameState)=>{x.lastReport!.keyMatchMoment!.choiceTitle='changed'},(x:GameState)=>{x.history.at(-1)!.keyMatchMoment!.clubId='wrong'}]){const bad=structuredClone(report);mutate(bad);expect(()=>saveGame(bad)).toThrow();expect(mem.get('career_save_current')).toBe(raw)}
})
it('migration and backup recovery reject silently discarded current writes',()=>{
 const raw=rows[0]!.raw,set=window.localStorage.setItem
 window.localStorage.setItem=(k,v)=>{if(k!=='career_save_current')set(k,v)}
 mem.set('career_save_current',raw);expect(()=>loadGame()).toThrow('迁移写入未确认');expect(mem.get('career_save_current')).toBe(raw);expect(mem.get('career_save_v12_backup')).toBe(raw)
 mem.delete('career_save_current');mem.set('career_save_backup',raw);expect(()=>loadGame()).toThrow('恢复写入未确认');expect(mem.get('career_save_backup')).toBe(raw)
})

it('fixed veteran non-debut hit and miss both retain the original simulation contract',()=>{
 for(const [seed,hit] of [['kmm-fixed-0',true],['kmm-fixed-1',false]] as const){
 const g=initial('34-body');g.careerSeed=seed;g.history=[{...rows[0]!.final.history[0]!,windowIndex:41,teamLevel:'FIRST_TEAM'}];saveGame(g)
 const output=runReadySimulation(g);expect(output.phase).toBe(hit?'KEY_MATCH_MOMENT':'HALF_YEAR_REPORT');if(hit){expect(output.pendingKeyMatchMoment!.debutMoment).toBe(false);expect(output.history).toEqual(g.history)}else expect(output.history).toHaveLength(g.history.length+1)
 }
})
it('actual catalogue text edits do not rewrite a frozen pending, result or report',()=>{
 const pending=enter(),e=ctx(pending),template=KEY_MATCH_MOMENT_TEMPLATES.find(t=>t.id===pending.pendingKeyMatchMoment!.templateId)!,original=structuredClone(template)
 try {
 template.title='future catalogue title';template.scene='future catalogue scene';template.choices[0]!.title='future choice';template.choices[0]!.outcomes.POSITIVE.text='future result'
 expect(loadGame()).toEqual(pending);useGameStore.getState().chooseKeyMatchMoment('A',e);const result=loadGame()!;expect(result.pendingKeyMatchMoment!.snapshot!.title).toBe(original.title);expect(result.pendingKeyMatchMoment!.snapshot!.choiceTitle).toBe(original.choices[0]!.title)
 useGameStore.getState().finishKeyMatchMoment(e);const report=loadGame()!;expect(report.lastReport!.keyMatchMoment).toEqual(result.pendingKeyMatchMoment!.snapshot)
 }finally{Object.assign(template,original)}
})

for(const [stage,writeIndex] of [['READY',1],['REPORT',2]] as const)for(const fault of ['before-write','after-write-read'] as const)it(`${stage} ${fault}: durable recovery settles exactly once and protects original backups`,()=>{
 const p=enter(),e=ctx(p);useGameStore.getState().chooseKeyMatchMoment('A',e);const result=loadGame()!,v12=mem.get('career_save_v12_backup')!;mem.set('career_save_v11_backup','frozen-v11')
 const expected=runReadySimulation({...result,phase:'SIMULATION_READY'}),set=window.localStorage.setItem,get=window.localStorage.getItem;let writesToCurrent=0,failRead=false
 window.localStorage.setItem=(k,v)=>{if(k==='career_save_current'){writesToCurrent++;if(writesToCurrent===writeIndex&&fault==='before-write')throw Error('interrupted '+stage);set(k,v);if(writesToCurrent===writeIndex&&fault==='after-write-read')failRead=true}else set(k,v)}
 window.localStorage.getItem=k=>{if(k==='career_save_current'&&failRead){failRead=false;throw Error('confirmation interrupted '+stage)}return get(k)}
 useGameStore.getState().finishKeyMatchMoment(e);expect(useGameStore.getState().error).not.toBeNull()
 window.localStorage.setItem=set;window.localStorage.getItem=get
 const current=JSON.parse(mem.get('career_save_current')!).data as GameState,backup=JSON.parse(mem.get('career_save_backup')!).data as GameState
 expect(current.phase).toBe(stage==='READY'&&fault==='before-write'?'KEY_MATCH_MOMENT_RESULT':stage==='REPORT'&&fault==='after-write-read'?'HALF_YEAR_REPORT':'SIMULATION_READY')
 expect(['KEY_MATCH_MOMENT_RESULT','SIMULATION_READY']).toContain(backup.phase);expect(backup.history).toEqual(p.history);expect(mem.get('career_save_v12_backup')).toBe(v12);expect(mem.get('career_save_v11_backup')).toBe('frozen-v11')
 useGameStore.setState({game:null,error:null});useGameStore.getState().continueCareer();if(useGameStore.getState().game!.phase==='KEY_MATCH_MOMENT_RESULT')useGameStore.getState().finishKeyMatchMoment(e)
 const final=loadGame()!;expect(final).toEqual(expected);expect(final.history).toHaveLength(p.history.length+1);expect(final.history.slice(0,-1)).toEqual(p.history);const n=writes;useGameStore.getState().finishKeyMatchMoment(e);useGameStore.getState().continueCareer();expect(writes).toBe(n);expect(loadGame()).toEqual(final)
})
