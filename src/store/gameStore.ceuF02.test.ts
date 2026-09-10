import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { GamePhase, GameState } from '../models/game'
import { useGameStore } from './gameStore'
import { professionalNextAction, type ProfessionalAction } from './professionalNextAction'
import * as persistence from '../persistence/save'
import * as transfers from '../engine/transfers'
import * as random from '../engine/random'
import { getCareerEvent } from '../engine/careerEvents'
const B='docs/evidence/CEU-20260907', E=`${B}/F-02`
const inputs=JSON.parse(readFileSync(`${B}/F-01/results-final-r2.json`,'utf8')) as {name:string;raw:string;input:GameState;inputSHA?:string;changes:unknown[]}[]
const s=()=>useGameStore.getState(), rows:unknown[]=[]
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex')
const facts=(g:GameState)=>({history:g.history,cashEuro:g.cashEuro,lastReport:g.lastReport,careerEventHistory:g.careerEventHistory,nationalTeam:g.nationalTeam})
function install(name:string,phase?:GamePhase){
 const source=inputs.find(r=>r.name===name)!,raw=source.raw
 expect(sha(raw)).toBe(source.inputSHA)
 const memory=new Map([['career_save_current',raw]])
 const write=vi.fn((k:string,v:string)=>memory.set(k,v))
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:write,removeItem:(k:string)=>memory.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
 expect(memory.has('career_save_backup')).toBe(false)
 expect(persistence.loadGame()).toEqual(source.input);s().continueCareer();expect(s().game).toEqual(source.input)
 if(phase){useGameStore.setState({game:{...s().game!,phase}})} // Explicit phase-only construction AFTER direct original raw load.
 write.mockClear()
 return {source,memory,write}
}
function roundtrip(){const game=structuredClone(s().game!);expect(persistence.loadGame()).toEqual(game);useGameStore.setState({game:null});s().continueCareer();expect(s().game).toEqual(game);persistence.saveGame(game);expect(persistence.loadGame()).toEqual(game);s().continueCareer();expect(s().game).toEqual(game)}
const flowCases: [string,ProfessionalAction,GamePhase][]=[['ordinary','PLAN','HALF_YEAR_PLAN'],['opportunity','MARKET','TRANSFER_WINDOW'],['expiry','MARKET','TRANSFER_WINDOW'],['breach-no-opportunity','STAY','HALF_YEAR_PLAN'],['K09-breach-opportunity','STAY','TRANSFER_WINDOW'],['breach-request','REQUEST_TRANSFER','TRANSFER_WINDOW'],['last-valid-53','PLAN','HALF_YEAR_PLAN'],['last-valid-54','PLAN','HALF_YEAR_PLAN'],['late-expiry-53','AGE_LIMIT','RETIREMENT_DECISION'],['late-expiry-54','AGE_LIMIT','RETIREMENT_DECISION'],['mandatory-55','AGE_LIMIT','RETIREMENT_DECISION']]
it.each(flowCases.flatMap(([name,action,target])=>['HALF_YEAR_REPORT','PRO_STAGE_COMPLETE'].map(phase=>({name,action,target,phase:phase as GamePhase}))))('$name from $phase commits once without resettlement',({name,action,target,phase})=>{
 const env=install(name,phase),before=structuredClone(s().game!),W=before.windowIndex
 const rng=vi.spyOn(random,'createRandom'),save=vi.spyOn(persistence,'saveGame')
 s().advanceProfessionalReport(action,W,before.careerSeed)
 const after=structuredClone(s().game!)
 expect(after.phase).toBe(target);expect(after.windowIndex).toBe(target==='RETIREMENT_DECISION'?W:W+1)
 expect(facts(after)).toEqual(facts(before));expect(save).toHaveBeenCalledTimes(1)
 expect(env.write.mock.calls.filter(([k])=>k==='career_save_current')).toHaveLength(1)
 const firstRaw=env.memory.get('career_save_current')!
 expect(JSON.parse(firstRaw).data).toEqual(after)
 const calls=rng.mock.calls.length
 s().advanceProfessionalReport(action,W,before.careerSeed);s().advanceAfterReport();s().openTransferWindow();s().continueProfessionalCareer()
 expect(s().game).toEqual(after);expect(save).toHaveBeenCalledTimes(1);expect(rng.mock.calls).toHaveLength(calls)
 if(target==='TRANSFER_WINDOW')expect(after.selectedTransferChoiceId).toBe(name==='expiry'?after.transferOffers[0]!.id:'STAY')
 roundtrip()
 rows.push({kind:'single-commit',name,source:`${B}/F-01/results-final-r2.json`,sourceSHA:sha(env.source.raw),construction:{phase:{before:env.source.input.phase,after:phase}},action,before,after,firstRaw,randomCalls:calls})
})
it.each(['cancel','refresh','confirm','navigation','new-career','home','reopen'] as const)('ephemeral retirement %s keeps report until final confirmation',mode=>{
 const env=install('optional-cancel','HALF_YEAR_REPORT'),before=structuredClone(s().game!)
 // Persist this explicitly constructed REPORT starting point, before testing the click.
 persistence.saveGame(before);env.write.mockClear()
 s().requestRetirement();const token=s().voluntaryRetirementConfirmation!;expect(token).not.toBeNull();expect(s().game).toEqual(before);expect(env.write).not.toHaveBeenCalled()
 expect(persistence.loadGame()).toEqual(before)
 if(mode==='cancel')s().cancelRetirement()
 if(mode==='refresh')s().continueCareer()
 if(mode==='navigation'){s().closeReportReview();s().reviewReport();expect(s().voluntaryRetirementConfirmation).toBeNull()}
 if(mode==='new-career')s().startNewCareer()
 if(mode==='home')s().returnToHome()
 if(mode==='reopen'){s().cancelRetirement();s().requestRetirement();expect(s().voluntaryRetirementConfirmation).not.toBe(token)}
 const current=structuredClone(s().game!),writeCount=env.write.mock.calls.length
 s().confirmVoluntaryRetirement(token)
 if(mode==='confirm'){
  expect(s().game).toEqual({...before,phase:'CAREER_RETIRED',retirementReason:'VOLUNTARY'});expect(env.write.mock.calls.filter(([k])=>k==='career_save_current')).toHaveLength(1);roundtrip()
 }else{expect(s().game).toEqual(current);expect(env.write.mock.calls).toHaveLength(writeCount)}
 rows.push({kind:'voluntary',mode,before,after:s().game,token})
})
it.each(['wrong-window','wrong-career','unsettled','missing-history','event','PLAN','READY','ARRIVAL','review'] as const)('rejects %s report actions without writes or random',kind=>{
 const env=install('opportunity'),base=structuredClone(s().game!)
 if(kind==='unsettled')useGameStore.setState({game:{...base,windowIndex:base.windowIndex+2}})
 if(kind==='missing-history')useGameStore.setState({game:{...base,history:[]}})
 if(kind==='event')useGameStore.setState({game:{...base,pendingCareerEvent:{eventId:'COACH_TACTICAL_MEETING',interactionKind:'DIALOGUE',stepIndex:0,selections:[],variantId:null}}})
 const phases={PLAN:'HALF_YEAR_PLAN',READY:'SIMULATION_READY',ARRIVAL:'TRANSFER_ARRIVAL'} as const
 if(kind in phases)useGameStore.setState({game:{...base,phase:phases[kind as keyof typeof phases]}})
 if(kind==='review')s().reviewReport()
 const before=structuredClone(s().game!),rng=vi.spyOn(random,'createRandom')
 s().advanceProfessionalReport('MARKET',kind==='wrong-window'?base.windowIndex-1:base.windowIndex,kind==='wrong-career'?'another-career':base.careerSeed)
 expect(s().game).toEqual(before);expect(env.write).not.toHaveBeenCalled();expect(rng).not.toHaveBeenCalled()
 rows.push({kind:'invalid-context',case:kind,before,after:s().game})
})
it.each(['national-confirm','national-mandatory-store','late-expiry-53','late-expiry-54'])('national eligibility shared for $name',name=>{
 const env=install(name,'HALF_YEAR_REPORT'),before=structuredClone(s().game!),allowed=name==='national-confirm'
 expect(professionalNextAction(before).secondary.some(a=>a.action==='NATIONAL')).toBe(allowed)
 s().retireFromNationalTeam()
 expect(s().game).toEqual(allowed?{...before,nationalTeam:{...before.nationalTeam,retired:true,currentRole:null}}:before)
 if(!allowed)expect(env.write).not.toHaveBeenCalled()
 if(allowed){roundtrip();s().advanceAfterReport();expect(s().game!.phase).toBe('HALF_YEAR_PLAN');expect(s().game!.history).toEqual(before.history)}
 rows.push({kind:'national',name,allowed,before,after:s().game})
})
it('only trains a current PLAN; wrong phase and stale callbacks cannot simulate',()=>{
 const env=install('ordinary'),report=structuredClone(s().game!),context={careerSeed:report.careerSeed,windowIndex:report.windowIndex}
 const rng=vi.spyOn(random,'createRandom')
 s().chooseTraining('BALANCED','STEADY',context);expect(s().game).toEqual(report);expect(env.write).not.toHaveBeenCalled();expect(rng).not.toHaveBeenCalled()
 s().advanceAfterReport();const plan=structuredClone(s().game!)
 s().chooseTraining('BALANCED','STEADY',context);expect(s().game).toEqual(plan)
 s().chooseTraining('BALANCED','STEADY',{careerSeed:'old-career',windowIndex:plan.windowIndex});expect(s().game).toEqual(plan)
 const current={careerSeed:plan.careerSeed,windowIndex:plan.windowIndex};s().chooseTraining('BALANCED','STEADY',current)
 const chosen=structuredClone(s().game!);s().chooseTraining('BALANCED','STEADY',current);expect(s().game).toEqual(chosen)
 while(s().game!.phase==='SPECIAL_EVENT'){
  const pending=s().game!.pendingCareerEvent!,event=getCareerEvent(pending.eventId)
  const route=event.setup?.options.find(o=>o.id===pending.variantId)
  s().chooseCareerEvent(event.setup&&pending.stepIndex===0?event.setup.options[0]!.id:route?.choiceIds[0]??event.choices[0]!.id)
 }
 if(s().game!.phase==='SPECIAL_EVENT_RESULT')s().continueAfterCareerEvent()
 expect(s().game!.phase).toBe('HALF_YEAR_REPORT');expect(s().game!.history).toHaveLength(plan.history.length+1);expect(s().game!.history.slice(0,plan.history.length)).toEqual(plan.history)
 const final=structuredClone(s().game!);s().chooseTraining('BALANCED','STEADY',current);s().continueAfterCareerEvent();expect(s().game).toEqual(final);roundtrip()
 rows.push({kind:'training-guard',before:report,plan,chosen,final})
})
it('rechecks retirement eligibility at confirmation and invalidates old window',()=>{
 install('optional-cancel','HALF_YEAR_REPORT');s().requestRetirement();const token=s().voluntaryRetirementConfirmation!,g=s().game!
 useGameStore.setState({game:{...g,windowIndex:g.windowIndex+1}});const before=s().game;s().confirmVoluntaryRetirement(token);expect(s().game).toBe(before)
})
const marketRows = JSON.parse(readFileSync(`${B}/M-03/store-results.json`,'utf8')) as {kind:string;name:string;raw:string;sourceSha:string;before:GameState;after:GameState}[]
const legacySuccessors = JSON.parse(readFileSync(`${B}/M-03/legacy-successors.json`,'utf8')) as {raw:string;expected:GameState;constructedChange:unknown}[]
const recoveryRows = [
 ...marketRows.filter(r=>r.kind==='raw-restore-and-successor').map(r=>({name:r.name,raw:r.raw,hash:r.sourceSha,expected:r.before,source:'M-03/store-results.json',kind:'original-market',construction:null})),
 ...marketRows.filter(r=>r.kind==='legacy-phase-recovery').map(r=>({name:r.name+'-'+r.before.phase,raw:r.raw,hash:sha(r.raw),expected:r.after,source:'M-03/store-results.json',kind:'legacy-phase',construction:{phase:r.before.phase}})),
 ...legacySuccessors.map((r,i)=>({name:'successor-'+i,raw:r.raw,hash:sha(r.raw),expected:r.expected,source:'M-03/legacy-successors.json',kind:'legacy-successor',construction:r.constructedChange})),
]
it.each(recoveryRows)('direct raw recovery $kind $name and legal successor',entry=>{
 expect(sha(entry.raw)).toBe(entry.hash)
 const memory=new Map([['career_save_current',entry.raw]])
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
 expect(memory.has('career_save_backup')).toBe(false)
 const loaded=persistence.loadGame()!;expect(loaded).toEqual(JSON.parse(entry.raw).data)
 const rng=vi.spyOn(random,'createRandom'),generator=vi.spyOn(transfers,'generateTransferOffers'),expiry=vi.spyOn(transfers,'generateContractExpiryOffers')
 s().continueCareer();expect(s().game).toEqual(entry.expected)
 const before=structuredClone(s().game!)
 s().reviewReport();s().advanceProfessionalReport('MARKET',before.windowIndex,before.careerSeed);s().requestRetirement();s().retireFromNationalTeam();s().closeReportReview()
 s().openTransferWindow();s().advanceAfterReport();s().continueProfessionalCareer();expect(s().game).toEqual(before)
 expect(rng).not.toHaveBeenCalled();expect(generator).not.toHaveBeenCalled();expect(expiry).not.toHaveBeenCalled();roundtrip()
 if(s().game!.phase==='TRANSFER_WINDOW'){
  const g=s().game!,selected=g.transferOffers.find(o=>o.id===g.selectedTransferChoiceId&&!o.withdrawn)
  if(g.selectedTransferChoiceId!=='STAY'&&!selected)s().selectTransferChoice(g.transferOffers.find(o=>!o.withdrawn)!.id)
  s().confirmTransferChoice()
 }
 const signed=structuredClone(s().game!)
 if(s().game!.phase==='TRANSFER_ARRIVAL')s().chooseTransferArrival('NONE')
 if(s().game!.phase==='TRANSFER_STAGE_COMPLETE')s().continueAfterTransfer()
 expect(s().game!.phase).toBe('HALF_YEAR_PLAN');expect(s().game!.windowIndex).toBe(before.windowIndex);expect(facts(s().game!)).toEqual(facts(before));roundtrip()
 rows.push({...entry,rawSHA:sha(entry.raw),loaded,before,signed,final:s().game})
})
afterEach(()=>{useGameStore.setState({voluntaryRetirementConfirmation:null,isReviewingReport:false});vi.unstubAllGlobals();vi.restoreAllMocks()})
afterAll(()=>{if(process.env.CEU_F02_EVIDENCE==='1')writeFileSync(`${E}/store-results.json`,JSON.stringify(rows,null,2)+'\n',{flag:'wx'})})
