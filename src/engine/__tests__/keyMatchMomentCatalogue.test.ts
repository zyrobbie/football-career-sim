import { expect,it,vi } from 'vitest'
import { installTestStorage } from '../../testing/keyMatchMomentTestSupport'
import { useGameStore } from '../../store/gameStore'
import { readFileSync,writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { KEY_MATCH_MOMENT_TEMPLATES as catalogue } from '../../data/keyMatchMomentTemplates'
import { momentChances,resolveKeyMatchMoment,createKeyMatchMoment,canonicalMomentJSON } from '../keyMatchMoments'
import { prepareReadySimulation } from '../simulationPreparation'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
import { loadGame,saveGame,validateGameState } from '../../persistence/save'
import type { GameState } from '../../models/game'
import type { MomentChoice } from '../../models/keyMatchMoment'
const baseline=JSON.parse(readFileSync('docs/evidence/KMM-20260913/S0/baseline-results.json','utf8'))
const metrics=(c:MomentChoice,ch:ReturnType<typeof momentChances>)=>{const weights=[ch.excellent,ch.positive-ch.excellent,1-ch.positive];const deltas=[c.outcomes.EXCELLENT.delta,c.outcomes.POSITIVE.delta,c.outcomes.NEGATIVE.delta];return{success:ch.positive,goals:deltas.reduce((s,d,i)=>s+d.goals*weights[i]!,0),assists:deltas.reduce((s,d,i)=>s+d.assists*weights[i]!,0),rating:deltas.reduce((s,d,i)=>s+d.averageRating*weights[i]!,0),safety:-deltas.reduce((s,d,i)=>s+d.yellowCards*weights[i]!,0)}}
it('40 templates cover 11 positions with 120 actions and 360 bounded outcomes',()=>{
 expect(catalogue).toHaveLength(40);expect(new Set(catalogue.map(t=>t.id)).size).toBe(40);expect(new Set(catalogue.flatMap(t=>t.positions)).size).toBe(11)
 for(const t of catalogue){expect(t.choices).toHaveLength(3);expect(new Set(t.choices.map(c=>c.id)).size).toBe(3);for(const c of t.choices){expect(Object.values(c.weights).reduce((s,v)=>s+v,0)).toBeCloseTo(1);expect(Object.keys(c.outcomes)).toEqual(['EXCELLENT','POSITIVE','NEGATIVE']);for(const [tier,o]of Object.entries(c.outcomes)){expect(o.delta.goals+o.delta.assists).toBeLessThanOrEqual(1);expect(Math.abs(o.delta.averageRating)).toBeLessThanOrEqual(.15);if(o.delta.yellowCards){expect(tier).toBe('NEGATIVE');expect(o.text).toContain('黄牌');expect(c.risk).toBe('HIGH')}if(o.delta.goals)expect(o.text).toMatch(/进球|破门|得分|入网|打进一球|送进空门|送入球门|飞入球门|打进球门|直入球门|一球/);if(o.delta.assists)expect(o.text).toMatch(/助攻|队友|前锋接球破门/)} }}
})
it('runs 1800 preparation/choice rows with exact original-engine rating differences and rejects always-dominated actions',()=>{
 const records:Array<any>=[]
 for(const t of catalogue)for(const specialty of ['balanced','attack','defense','physical','mental'])for(const status of [35,65,90]){
 const game=validateGameState(JSON.parse(baseline[0].raw).data) as GameState;game.player!.primaryPosition=t.positions[0]!;game.player!.attributes={attack:55,defense:55,physical:55,mental:55};if(specialty==='balanced')game.player!.attributes={attack:65,defense:65,physical:65,mental:65};else game.player!.attributes[specialty as 'attack']=85;game.player!.form=game.player!.fitness=game.player!.morale=status
 const ready=prepareReadySimulation(game),base=simulateProfessionalHalfYear({state:ready.simulationState,offer:ready.offer}),generated=createKeyMatchMoment(game,base.report)!;expect(generated).not.toBeNull()
 for(const c of t.choices){const p={...generated,templateId:t.id,templateRevision:t.revision,choices:t.choices},ch=momentChances(p.prepared,c),m=metrics(c,ch);const outcomes=([['EXCELLENT',0],['POSITIVE',(ch.excellent+ch.positive)/2],['NEGATIVE',.99999]] as const).map(([tier,roll])=>{const resolution=resolveKeyMatchMoment({...p,roll},c.id);expect(resolution.tier).toBe(tier);const result=simulateProfessionalHalfYear({state:ready.simulationState,offer:ready.offer,momentResolution:resolution});return{tier,probability:tier==='EXCELLENT'?ch.excellent:tier==='POSITIVE'?ch.positive-ch.excellent:1-ch.positive,ruleDelta:resolution.delta,appliedRatingDelta:Number((result.report.stats.averageRating-base.report.stats.averageRating).toFixed(1))}});records.push({template:t.id,choice:c.id,specialty,status,prepared:p.prepared,chances:ch,metrics:m,outcomes})}
 }
 expect(records).toHaveLength(1800)
 const dominated=[]
 for(const t of catalogue)for(const a of t.choices)for(const b of t.choices){if(a.id===b.id)continue;const pairs=records.filter(r=>r.template===t.id&&r.choice===a.id).map(r=>[r,records.find(x=>x.template===t.id&&x.choice===b.id&&x.specialty===r.specialty&&x.status===r.status)!]);if(pairs.every(([x,y])=>Object.keys(x.metrics).every(k=>y.metrics[k]>=x.metrics[k]-1e-10))&&pairs.some(([x,y])=>Object.keys(x.metrics).some(k=>y.metrics[k]>x.metrics[k]+1e-10)))dominated.push({template:t.id,dominated:a.id,by:b.id})}
 if(process.env.KMM_P1B_COLLECT==='1'){
 const sourceHash=createHash('sha256').update(readFileSync('src/data/keyMatchMomentTemplates.ts')).digest('hex');expect(sourceHash).toBe(process.env.KMM_P1B_SOURCE_SHA);writeFileSync('docs/evidence/KMM-20260913/P1-B/matrix.json',JSON.stringify({sourceHash,records,dominated,catalogue},null,2),{flag:'wx'})
 }
 expect(dominated).toEqual([])
})
it('old S1 pending and saved report preserve complete snapshots after expanding to forty',()=>{
 for(const id of ['forward','creative','defender','narrow-recovery','wide-defender'])for(const phase of ['pending','result','report']){const raw=JSON.parse(readFileSync(`docs/evidence/KMM-20260913/S1/review-fixtures/${id}-${phase}.json`,'utf8')).data;expect(canonicalMomentJSON(validateGameState(raw))).toBe(canonicalMomentJSON(raw))}
})

it('direct old raw load, public choice and finish still match original S1 complete saved report',()=>{
 try{for(const id of ['forward','creative','defender','narrow-recovery','wide-defender']){
 const memory=installTestStorage(),prefix=`docs/evidence/KMM-20260913/S1/review-fixtures/${id}-`,raw=readFileSync(prefix+'pending.json','utf8'),oldResult=JSON.parse(readFileSync(prefix+'result.json','utf8')).data as GameState,oldReport=JSON.parse(readFileSync(prefix+'report.json','utf8')).data as GameState
 memory.set('career_save_current',raw);const g=loadGame()!,p=g.pendingKeyMatchMoment!;expect(g).toEqual(JSON.parse(raw).data);useGameStore.setState({game:g,error:null});const e={careerSeed:g.careerSeed,playerId:g.player!.id,windowIndex:g.windowIndex,clubId:p.clubId,momentId:p.id,inputFingerprint:p.inputFingerprint}
 useGameStore.getState().chooseKeyMatchMoment(oldResult.pendingKeyMatchMoment!.selectedChoiceId!,e);expect(loadGame()).toEqual(oldResult);useGameStore.getState().finishKeyMatchMoment(e);expect(loadGame()).toEqual(oldReport);saveGame(loadGame()!);expect(loadGame()).toEqual(oldReport)
 }}finally{vi.unstubAllGlobals()}
})
