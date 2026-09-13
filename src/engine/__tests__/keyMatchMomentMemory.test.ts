import {expect,it,vi} from 'vitest'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {gunzipSync,gzipSync} from 'node:zlib'
import {availableMomentTemplates} from '../keyMatchMoments'
import {KEY_MATCH_MOMENT_TEMPLATES as catalogue} from '../../data/keyMatchMomentTemplates'
import {createRandom} from '../random'
import {loadGame,saveGame} from '../../persistence/save'
import {useGameStore} from '../../store/gameStore'
import type {GameState} from '../../models/game'
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex')
// Explicit selector-only histories; not game saves or natural careers.
const history=(ids:Array<string|null>)=>ids.map((id,i)=>({windowIndex:i*2,keyMatchMoment:id?{templateId:id}:null})) as unknown as GameState['history']
it('100 synthetic 24-draw paths keep recent four across empty windows and meet coverage budgets',()=>{
 const results=[]
 for(const position of ['ST','CAM','CM','LB','CB'] as const)for(let seed=0;seed<20;seed++){
  const legal=catalogue.filter(t=>t.positions.includes(position)),ids:string[]=[],steps=[]
  for(let n=0;n<24;n++){
   const h=history(ids.flatMap(id=>[id,null])),pool=availableMomentTemplates(legal,h),W=4+n*2
   const selected=createRandom(`kmm-p1c-${position}-${seed}`,W,'key-match-moment-template').pick(pool).id
   steps.push({W,legal:legal.map(t=>t.id),recent:ids.slice(-4),pool:pool.map(t=>t.id),selected});ids.push(selected)
  }
  const counts=Object.fromEntries(legal.map(t=>[t.id,ids.filter(id=>id===t.id).length]));results.push({position,seed,steps,counts,unique:new Set(ids).size,max:Math.max(...Object.values(counts))})
 }
 if(process.env.KMM_P1C_COLLECT==='1'){
  expect(sha(readFileSync('src/engine/keyMatchMoments.ts'))).toBe(process.env.KMM_P1C_SOURCE_SHA)
  writeFileSync('docs/evidence/KMM-20260913/P1-C/synthetic.json',JSON.stringify(results,null,2),{flag:'wx'})
 }
 expect(results).toHaveLength(100);expect(results.filter(r=>r.unique>=7).length).toBeGreaterThanOrEqual(90)
 for(const r of results){expect(r.max).toBeLessThanOrEqual(6);for(const s of r.steps){expect(s.legal).toContain(s.selected);expect(s.recent).not.toContain(s.selected)}}
 for(const position of ['ST','CAM','CM','LB','CB'])expect(new Set(results.filter(r=>r.position===position).flatMap(r=>r.steps.map(s=>s.selected))).size).toBe(8)
})
it('degrades oldest first for pools one to four, retains latest exclusion when possible, and never borrows another position',()=>{
 const legal=catalogue.filter(t=>t.positions.includes('ST')),ids=legal.slice(0,4).map(t=>t.id)
 for(let size=1;size<=4;size++){const pool=legal.slice(0,size);expect(availableMomentTemplates(pool,history(pool.map(t=>t.id))).map(t=>t.id)).toEqual([pool[0]!.id])}
 expect(availableMomentTemplates(legal,history([ids[0]!,null,ids[1]!,null,ids[2]!,null,ids[3]!,null])).map(t=>t.id)).toEqual(legal.slice(4).map(t=>t.id))
 expect(availableMomentTemplates(legal.slice(0,2),history([ids[0]!,ids[1]!,ids[0]!,ids[1]!])).map(t=>t.id)).toEqual([ids[0]])
 const creative=catalogue.filter(t=>t.positions.includes('CAM'));expect(availableMomentTemplates(creative,history(ids))).toEqual(creative)
 expect(availableMomentTemplates([],history(ids))).toEqual([])
})
const fixtures=JSON.parse(readFileSync('docs/evidence/KMM-20260913/P1-C/legacy-fixtures/index.json','utf8')) as Array<{id:string,pending:string,pendingSHA:string,choice:string,result:{path:string,sha256:string},report:{path:string,sha256:string}}>
for(const fixture of fixtures)it(`frozen ${fixture.id} Pending/Result/actual READY finish preserves original complete report`,()=>{
 const raw=readFileSync(fixture.pending,'utf8');expect(sha(raw)).toBe(fixture.pendingSHA)
 const read=(f:{path:string,sha256:string})=>{const b=readFileSync(f.path);expect(sha(b)).toBe(f.sha256);return gunzipSync(b).toString()}
 const expectedResult=read(fixture.result),expectedReport=read(fixture.report);let ready:string|null=null
 const install=(initial:string)=>{const m=new Map<string,string>([['career_save_current',initial]]);vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>m.get(k)??null,removeItem:(k:string)=>m.delete(k),setItem:(k:string,v:string)=>{m.set(k,v);if(k==='career_save_current'&&JSON.parse(v).data.phase==='SIMULATION_READY')ready=v}}});useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null});return m}
 try{
  const memory=install(raw),g=loadGame()!,p=g.pendingKeyMatchMoment!;expect(g).toEqual(JSON.parse(raw).data);useGameStore.setState({game:g});const ctx={careerSeed:g.careerSeed,playerId:g.player!.id,windowIndex:g.windowIndex,clubId:p.clubId,momentId:p.id,inputFingerprint:p.inputFingerprint}
  useGameStore.getState().chooseKeyMatchMoment(fixture.choice,ctx);expect(loadGame()).toEqual(JSON.parse(expectedResult).data)
  saveGame(loadGame()!);useGameStore.setState({game:null});useGameStore.getState().continueCareer();expect(loadGame()).toEqual(JSON.parse(expectedResult).data)
  useGameStore.getState().finishKeyMatchMoment(ctx);expect(useGameStore.getState().error).toBeNull();expect(loadGame()).toEqual(JSON.parse(expectedReport).data);expect(ready).not.toBeNull()
  const actualReady=ready!;install(actualReady);useGameStore.getState().continueCareer();expect(loadGame()).toEqual(JSON.parse(expectedReport).data);saveGame(loadGame()!);expect(loadGame()).toEqual(JSON.parse(expectedReport).data)
  install(expectedResult);useGameStore.getState().continueCareer();useGameStore.getState().finishKeyMatchMoment(ctx);expect(loadGame()).toEqual(JSON.parse(expectedReport).data)
  if(process.env.KMM_P1C_COLLECT==='1'){mkdirSync('docs/evidence/KMM-20260913/P1-C/ready-fixtures',{recursive:true});writeFileSync(`docs/evidence/KMM-20260913/P1-C/ready-fixtures/${fixture.id}.json.gz`,gzipSync(actualReady),{flag:'wx'})}
  expect(memory.has('career_save_current')).toBe(true)
 }finally{vi.unstubAllGlobals()}
})
