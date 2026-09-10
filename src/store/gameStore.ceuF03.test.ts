import {afterAll,afterEach,it,expect,vi} from 'vitest'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import type {GameState} from '../models/game'
import {useGameStore} from './gameStore'
import {professionalNextAction,type ProfessionalAction} from './professionalNextAction'
import {trainingPlanView} from '../ui/trainingPlanView'
import {getCareerEvent,eligibleCareerEventChoices} from '../engine/careerEvents'
import {loadGame,saveGame} from '../persistence/save'
import * as random from '../engine/random'
const B='docs/evidence/CEU-20260907',E=`${B}/F-03`,source=`${B}/F-01/results-final-r2.json`
const inputs=JSON.parse(readFileSync(source,'utf8')) as {name:string;raw:string;input:GameState;inputSHA:string;changes:unknown}[]
const rows:unknown[]=[],s=()=>useGameStore.getState(),sha=(x:string)=>createHash('sha256').update(x).digest('hex')
const facts=(g:GameState)=>({history:g.history,cashEuro:g.cashEuro,lastReport:g.lastReport,events:g.careerEventHistory,national:g.nationalTeam})
const cases:[string,ProfessionalAction,string][]=[['ordinary','PLAN','stay'],['opportunity','MARKET','stay'],['breach-no-opportunity','STAY','stay'],['K09-breach-opportunity','STAY','stay'],['expiry','MARKET','renewal'],['expiry','MARKET','external']]
it.each(cases)('one new settlement after %s %s %s',(name,action,choice)=>{
 const input=inputs.find(r=>r.name===name)!,m=new Map([['career_save_current',input.raw]]),writes:{key:string;value:string}[]=[]
 const write=vi.fn((key:string,value:string)=>{m.set(key,value);writes.push({key,value})})
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>m.get(k)??null,setItem:write,removeItem:(k:string)=>m.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null});expect(m.has('career_save_backup')).toBe(false)
 expect(sha(input.raw)).toBe(input.inputSHA);expect(loadGame()).toEqual(input.input);s().continueCareer();expect(s().game).toEqual(input.input)
 const start={...structuredClone(input.input),phase:'HALF_YEAR_REPORT' as const};saveGame(start);s().continueCareer();expect(s().game).toEqual(start)
 const steps:unknown[]=[]
 function run(label:string,fn:()=>void,settles=false,event=false){const before=structuredClone(s().game!),offset=writes.length;fn();expect(s().error,label).toBeNull();const after=structuredClone(s().game!);const saved=m.get('career_save_current')!;expect(JSON.parse(saved).data).toEqual(after)
  if(!settles&&!event)expect(facts(after)).toEqual(facts(before))
  expect(after.history.slice(0,before.history.length)).toEqual(before.history);expect(after.history.length-before.history.length).toBe(settles?1:0)
  steps.push({label,before,after,writes:writes.slice(offset),saved});return after}
 function stale(label:string,fn:()=>void){const before=structuredClone(s().game!),n=writes.length,rng=vi.spyOn(random,'createRandom');fn();expect(s().game).toEqual(before);expect(writes.length).toBe(n);expect(rng).not.toHaveBeenCalled();rng.mockRestore();s().clearError();steps.push({label,before,after:s().game,writes:[]})}
 stale('wrong-window',()=>s().advanceProfessionalReport(action,start.windowIndex-1,start.careerSeed));stale('wrong-career',()=>s().advanceProfessionalReport(action,start.windowIndex,'expired-career'))
 const offset=writes.length;run('report decision',()=>s().advanceProfessionalReport(action,start.windowIndex,start.careerSeed));expect(writes.slice(offset).filter(w=>w.key==='career_save_current')).toHaveLength(1)
 stale('repeat report/wrong phase',()=>s().advanceProfessionalReport(action,start.windowIndex,start.careerSeed))
 if(s().game!.phase==='TRANSFER_WINDOW'){
  const g=s().game!,id=choice==='stay'?'STAY':g.transferOffers.find(o=>!o.withdrawn&&(choice==='renewal'?o.type==='RENEWAL':o.type!=='RENEWAL'))!.id
  run('select '+id,()=>s().selectTransferChoice(id));run('confirm transfer',()=>s().confirmTransferChoice());stale('repeat confirmation',()=>s().confirmTransferChoice())
  if(s().game!.phase==='TRANSFER_ARRIVAL')run('arrival NONE',()=>s().chooseTransferArrival('NONE'))
  run('next plan',()=>s().continueAfterTransfer())
 }
 expect(s().game!.phase).toBe('HALF_YEAR_PLAN');const plan=structuredClone(s().game!),context={careerSeed:plan.careerSeed,windowIndex:plan.windowIndex}
 stale('stale training window',()=>s().chooseTraining('BALANCED','STEADY',{...context,windowIndex:start.windowIndex}));stale('stale training career',()=>s().chooseTraining('BALANCED','STEADY',{...context,careerSeed:'expired-career'}))
 const model=trainingPlanView(plan),focus=model.recovery?'BODY_CARE':model.defaultFocus
 // chooseTraining can synchronously settle only when no event was selected; inspect actual delta below.
 const beforeTrain=structuredClone(s().game!),n=writes.length;s().chooseTraining(focus,'STEADY',context);expect(s().error).toBeNull();steps.push({label:'chooseTraining',focus,before:beforeTrain,after:structuredClone(s().game!),writes:writes.slice(n),saved:m.get('career_save_current')})
 stale('repeat training',()=>s().chooseTraining(focus,'STEADY',context))
 for(let i=0;i<4&&s().game!.phase==='SPECIAL_EVENT';i++){
  const g=s().game!,p=g.pendingCareerEvent!,e=getCareerEvent(p.eventId),eligible=eligibleCareerEventChoices(g,e),route=e.setup?.options.find(o=>o.id===p.variantId)
  const id=e.setup&&p.stepIndex===0?e.setup.options.find(o=>o.choiceIds.some(id=>eligible.some(c=>c.id===id)))!.id:eligible.find(c=>!route||route.choiceIds.includes(c.id))!.id
  run('event '+id,()=>s().chooseCareerEvent(id),false,true)
 }
 if(s().game!.phase==='SPECIAL_EVENT_RESULT'){
  const event=structuredClone(s().game!);s().continueCareer();expect(s().game).toEqual(event);stale('report cannot skip RESULT',()=>s().advanceProfessionalReport('PLAN',event.windowIndex,event.careerSeed))
  run('event result continue/simulation',()=>s().continueAfterCareerEvent(),true)
  stale('repeat event result',()=>s().continueAfterCareerEvent())
 }
 const report=structuredClone(s().game!);expect(report.phase).toBe('HALF_YEAR_REPORT');expect(report.history.length).toBe(start.history.length+1);expect(report.history.slice(0,start.history.length)).toEqual(start.history);expect(report.history.at(-1)!.windowIndex).toBe(plan.windowIndex)
 expect(report.careerEventHistory.slice(0,start.careerEventHistory.length)).toEqual(start.careerEventHistory);expect(Number.isFinite(report.cashEuro)).toBe(true)
 s().continueCareer();expect(s().game).toEqual(report);s().continueCareer();expect(s().game).toEqual(report)
 const next=professionalNextAction(report).primary!;expect(next).not.toBeNull();run('new report legal next '+next.action,()=>s().advanceProfessionalReport(next.action,report.windowIndex,report.careerSeed))
 const final=structuredClone(s().game!);s().continueCareer();expect(s().game).toEqual(final);expect(JSON.parse(m.get('career_save_current')!).data).toEqual(final)
 rows.push({name,choice,source,sourceFileSHA:sha(readFileSync(source,'utf8')),rawSHA:sha(input.raw),sourceConstruction:input.changes,phaseConstruction:{before:input.input.phase,after:start.phase},seed:start.careerSeed,start,steps,report,final,finalRaw:m.get('career_save_current'),newSettlements:1})
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
afterAll(()=>{if(process.env.CEU_F03_EVIDENCE==='1')writeFileSync(`${E}/results.json`,JSON.stringify(rows,null,2)+'\n',{flag:'wx'})})
