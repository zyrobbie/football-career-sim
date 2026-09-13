import { completePendingMoment } from '../testing/keyMatchMomentTestSupport'
import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { useGameStore } from './gameStore'
import { loadGame, saveGame } from '../persistence/save'
import { trainingPlanView } from '../ui/trainingPlanView'
import { getCareerEvent, eligibleCareerEventChoices } from '../engine/careerEvents'
import { generateTransferOffers } from '../engine/transfers'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import type { GameState } from '../models/game'
const B='docs/evidence/CEU-20260907', O=`${B}/M-04`
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'))
const sha=(s:string)=>createHash('sha256').update(s).digest('hex')
const results:unknown[]=[]
const store=()=>useGameStore.getState()
function install(raw:string){
 const memory=new Map([['career_save_current',raw]])
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}})
 useGameStore.setState({game:null,error:null,hasSave:false,isReviewingReport:false})
 expect(memory.has('career_save_backup')).toBe(false);store().continueCareer();expect(store().game).not.toBeNull();return memory
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
it('matches every saved M-02 E-03 offer field for all three directions and 100 fixed seeds',()=>{
 const rows=json(`${B}/M-02/e03-directions.json`)
 for(const row of rows)for(const sample of row.samples){const offers=generateTransferOffers(sample.input).map(o=>({...o,country:getClubParametersByCompatibleId(o.clubId)!.country}));expect(offers).toEqual(sample.offers);expect(generateTransferOffers(sample.input)).toEqual(offers.map(({country,...o})=>o))}
 results.push({kind:'distribution',source:`${B}/M-02/e03-directions.json`,sha:sha(readFileSync(`${B}/M-02/e03-directions.json`,'utf8')),comparisons:300,rows:rows.map((r:{intent:string;domesticTotal:number;domesticPerWindow:unknown})=>({intent:r.intent,domestic:r.domesticTotal,domesticPerWindow:r.domesticPerWindow})),passed:true})
})
const plan=json(`${O}/observation-plan.json`)
it.each(plan.branches as Array<{seed:string;source:string;policy:string}>)('bounded public career $seed / $policy',({seed,source,policy})=>{
 const raw=readFileSync(source,'utf8');const memory=install(raw);const migrated=structuredClone(store().game!)
 // Explicit construction: only the seed is changed after the canonical v11 migration.
 const input={...migrated,careerSeed:seed};saveGame(input);store().continueCareer();expect(store().game).toEqual(input)
 const actions:unknown[]=[],markets:unknown[]=[],reports:unknown[]=[];let turns=0
 while(turns++<160){
  const g=structuredClone(store().game!);const n=g.history.length-input.history.length
  if(g.phase==='CAREER_RETIRED'||n===6&&g.phase==='HALF_YEAR_PLAN')break
  let action='',args:unknown[]=[]
  switch(g.phase){
   case 'HALF_YEAR_PLAN':{
    expect(n).toBeLessThan(6)
    const intent=policy==='switch'?(['STRONG','DOMESTIC','CONDITIONAL','DOMESTIC','STRONG','CONDITIONAL'] as const)[n]:policy==='domestic'?'DOMESTIC':'CONDITIONAL'
    store().updateCareerPreferences(intent,[]);expect(store().error).toBeNull()
    expect(store().game).toEqual({...g,player:{...g.player!,overseasIntent:intent,preferredLeagues:[]}})
    const m=trainingPlanView(store().game!);const focus=m.recovery?'BODY_CARE':m.defaultFocus
    action='updateCareerPreferences + chooseTraining';args=[intent,focus,'STEADY'];store().chooseTraining(focus,'STEADY');break
   }
   case 'SPECIAL_EVENT':{
    const p=g.pendingCareerEvent!,e=getCareerEvent(p.eventId)!,eligible=eligibleCareerEventChoices(g,e),route=e.setup?.options.find(o=>o.id===p.variantId)
    const id=e.setup&&p.stepIndex===0?e.setup.options.find(o=>o.choiceIds.some(id=>eligible.some(c=>c.id===id)))!.id:eligible.find(c=>!route||route.choiceIds.includes(c.id))!.id
    action='chooseCareerEvent';args=[id];store().chooseCareerEvent(id);break
   }
   case 'SPECIAL_EVENT_RESULT':action='continueAfterCareerEvent';store().continueAfterCareerEvent();break
   case 'KEY_MATCH_MOMENT': case 'KEY_MATCH_MOMENT_RESULT':action='completePendingMoment';completePendingMoment(store);break
   case 'SIMULATION_READY':action='continueCareer';store().continueCareer();break
   case 'HALF_YEAR_REPORT':action='advanceAfterReport';store().advanceAfterReport();break
   case 'PRO_STAGE_COMPLETE':{
    action='openTransferWindow';store().openTransferWindow()
    if(store().game!.phase===g.phase){actions.push({action,rejected:store().error,window:g.windowIndex});store().clearError();action='continueProfessionalCareer';store().continueProfessionalCareer()}break
   }
   case 'CAREER_DASHBOARD':action='openProfessionalContract';store().openProfessionalContract();break
   case 'PRO_CONTRACT_OFFER':action='acceptProfessionalContract';store().acceptProfessionalContract();break
   case 'PRO_CONTRACT_COMPLETE':action='startProfessionalCareer';store().startProfessionalCareer();break
   case 'TRANSFER_WINDOW':{
    const offer=g.transferOffers.find(o=>!o.withdrawn&&o.type!=='RENEWAL')??g.transferOffers.find(o=>!o.withdrawn)
    action='selectTransferChoice + confirmTransferChoice';args=[offer?.id??'STAY'];store().selectTransferChoice(offer?.id??'STAY');store().confirmTransferChoice();break
   }
   case 'TRANSFER_ARRIVAL':action='chooseTransferArrival';args=['NONE'];store().chooseTransferArrival('NONE');break
   case 'TRANSFER_STAGE_COMPLETE':action='continueAfterTransfer';store().continueAfterTransfer();break
   case 'RETIREMENT_DECISION':action='confirmRetirement';store().confirmRetirement();break
   default:throw Error(`Unhandled ${g.phase}`)
  }
  const after=structuredClone(store().game!);expect(store().error,`${action} @ ${g.phase}`).toBeNull()
  expect(after.history.length-g.history.length).toBeLessThanOrEqual(1);expect(after.history.slice(0,g.history.length)).toEqual(g.history)
  expect(Number.isFinite(after.cashEuro)).toBe(true)
  if(after.phase==='TRANSFER_WINDOW'&&g.phase!=='TRANSFER_WINDOW'){
   const external=after.transferOffers.filter(o=>o.type!=='RENEWAL');expect(external.length).toBeLessThanOrEqual(3);expect(after.transferOffers.length).toBeLessThanOrEqual(4)
   markets.push({action,input:g,generated:after,actualDirection:after.player!.overseasIntent})
  }
  if(after.history.length>g.history.length)reports.push({window:after.windowIndex,history:after.history.at(-1),report:after.lastReport,cashEuro:after.cashEuro})
  actions.push({action,args,beforePhase:g.phase,afterPhase:after.phase,windowBefore:g.windowIndex,windowAfter:after.windowIndex,historyBefore:g.history.length,historyAfter:after.history.length,cashBefore:g.cashEuro,cashAfter:after.cashEuro})
  saveGame(after);expect(loadGame()).toEqual(after);store().continueCareer();expect(store().game).toEqual(after)
 }
 const final=store().game!;expect(turns).toBeLessThan(160);expect(['HALF_YEAR_PLAN','CAREER_RETIRED']).toContain(final.phase)
 expect(reports.length).toBeLessThanOrEqual(6)
 results.push({kind:'continuous',seed,policy,source,sourceSha:sha(raw),construction:{careerSeed:{before:migrated.careerSeed,after:seed}},input,inputEnvelope:JSON.parse(memory.get('career_save_current')!),actions,markets,reports,final,passed:true})
})
afterAll(()=>{if(process.env.CEU_M04_EVIDENCE==='1'){
 const baseline=json(`${O}/before-hashes.json`)
 for(const [p,v]of Object.entries(baseline) as Array<[string,{sha256:string}]>)if(p.startsWith('src/')&&!p.includes('.test.'))expect(sha(readFileSync(p,'utf8'))).toBe(v.sha256)
 writeFileSync(`${O}/results.json`,JSON.stringify(results,null,2)+'\n',{flag:'wx'})
}})
