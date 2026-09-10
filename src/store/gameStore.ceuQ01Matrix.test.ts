import {afterAll,afterEach,expect,it,vi} from 'vitest'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import type {GameState} from '../models/game'
import {useGameStore} from './gameStore'
import {loadGame,saveGame} from '../persistence/save'
import {normalizePendingTraining} from '../engine/trainingPlan'
import {restoreMarketContext} from './marketContext'
import {professionalNextAction} from './professionalNextAction'
import {trainingPlanView,trainingSubmission} from '../ui/trainingPlanView'
import {getCareerEvent,eligibleCareerEventChoices} from '../engine/careerEvents'
const E='docs/evidence/CEU-20260907/Q-01',s=()=>useGameStore.getState(),sha=(x:string)=>createHash('sha256').update(x).digest('hex')
const matrix=JSON.parse(readFileSync(`${E}/raw-matrix.json`,'utf8')) as {raws:{sha256:string;raw:string}[];branches:{id:number;name:string;rawSHA:string;policy:string}[]},rows:unknown[]=[]
it.each(matrix.branches)('direct raw chain $id $name',b=>{
 const raw=matrix.raws.find(x=>x.sha256===b.rawSHA)!.raw;expect(sha(raw)).toBe(b.rawSHA)
 const old=JSON.parse(raw).data as GameState,memory=new Map([['career_save_current',raw]]),writes:{key:string;value:string}[]=[]
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(key:string,value:string)=>{memory.set(key,value);writes.push({key,value})},removeItem:(k:string)=>memory.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null});expect(memory.has('career_save_backup')).toBe(false)
 const loaded=loadGame()!;expect(loaded).toEqual({...old,saveVersion:12,dataVersion:12});const canonical=normalizePendingTraining(restoreMarketContext(loaded))
 s().continueCareer();expect(s().error).toBeNull();const first=structuredClone(s().game!)
 if(old.phase==='SIMULATION_READY'){expect(first.history.length).toBe(old.history.length+1);expect(first.history.at(-1)!.trainingFocus).toBe(canonical.trainingFocus)}else expect(first).toEqual(canonical)
 expect(first.history.slice(0,old.history.length)).toEqual(old.history)
 const steps:unknown[]=[]
 function act(label:string,fn:()=>void){const before=structuredClone(s().game!),offset=writes.length;fn();expect(s().error,label).toBeNull();const after=structuredClone(s().game!);expect(JSON.parse(memory.get('career_save_current')!).data).toEqual(after);expect(after.history.slice(0,before.history.length)).toEqual(before.history);expect(after.history.length-before.history.length).toBeLessThanOrEqual(1);steps.push({label,before,after,writes:writes.slice(offset)})}
 if(b.policy==='legacy-voluntary'){
  act('request legacy voluntary',()=>s().requestRetirement());expect(s().game!.phase).toBe('RETIREMENT_DECISION')
  const intermediate=memory.get('career_save_current')!;memory.clear();memory.set('career_save_current',intermediate);useGameStore.setState({game:null});expect(memory.has('career_save_backup')).toBe(false);expect(loadGame()).toEqual(JSON.parse(intermediate).data);s().continueCareer();act('cancel legacy voluntary',()=>s().cancelRetirement());expect(s().game!.phase).toBe('PRO_STAGE_COMPLETE')
 }else for(let n=0;n<25;n++){
  const g=s().game!
  if(g.phase==='CAREER_RETIRED'||(b.policy==='settle'&&g.history.length>old.history.length))break
  if(n>0&&b.policy!=='settle'&&['HALF_YEAR_PLAN','HALF_YEAR_REPORT'].includes(g.phase))break
  switch(g.phase){
   case 'HALF_YEAR_PLAN':{const model=trainingPlanView(g),focus=model.recovery?'BODY_CARE':model.initialFocus,selection=trainingSubmission(g,{focus,approach:'STEADY'})!;act('chooseTraining',()=>s().chooseTraining(selection.focus,selection.approach,{windowIndex:g.windowIndex,careerSeed:g.careerSeed}));break}
   case 'SPECIAL_EVENT':{const p=g.pendingCareerEvent!,e=getCareerEvent(p.eventId),eligible=eligibleCareerEventChoices(g,e),route=e.setup?.options.find(o=>o.id===p.variantId);const id=e.setup&&p.stepIndex===0?e.setup.options.find(o=>o.choiceIds.some(id=>eligible.some(c=>c.id===id)))!.id:eligible.find(c=>!route||route.choiceIds.includes(c.id))!.id;act('chooseCareerEvent',()=>s().chooseCareerEvent(id));break}
   case 'SPECIAL_EVENT_RESULT':act('continueAfterCareerEvent',()=>s().continueAfterCareerEvent());break
   case 'HALF_YEAR_REPORT':case 'PRO_STAGE_COMPLETE':{
    if(!g.contract){act('advanceAfterReport',()=>s().advanceAfterReport());break}
    const model=professionalNextAction(g),action=b.policy==='stay'&&model.secondary.some(x=>x.action==='STAY')?'STAY':model.primary!.action;act('advanceProfessionalReport',()=>s().advanceProfessionalReport(action,g.windowIndex,g.careerSeed));break
   }
   case 'CAREER_DASHBOARD':act('openProfessionalContract',()=>s().openProfessionalContract());break
   case 'PRO_CONTRACT_OFFER':act('acceptProfessionalContract',()=>s().acceptProfessionalContract());break
   case 'PRO_CONTRACT_COMPLETE':act('startProfessionalCareer',()=>s().startProfessionalCareer());break
   case 'TRANSFER_WINDOW':{
    const valid=g.transferOffers.filter(o=>!o.withdrawn)
    const choice=b.policy==='external'?valid.find(o=>o.clubId!==g.selectedClubId)!.id:b.policy==='renewal'?valid.find(o=>o.type==='RENEWAL')!.id:g.selectedTransferChoiceId??(g.contract!.remainingHalfYears>0?'STAY':valid[0]!.id)
    act('selectTransferChoice',()=>s().selectTransferChoice(choice));act('confirmTransferChoice',()=>s().confirmTransferChoice());break
   }
   case 'TRANSFER_ARRIVAL':act('chooseTransferArrival NONE',()=>s().chooseTransferArrival('NONE'));break
   case 'TRANSFER_STAGE_COMPLETE':act('continueAfterTransfer',()=>s().continueAfterTransfer());break
   case 'RETIREMENT_DECISION':act('confirmRetirement',()=>s().confirmRetirement());break
   default:throw new Error(`unhandled ${g.phase}`)
  }
 }
 const final=structuredClone(s().game!);expect(['HALF_YEAR_PLAN','HALF_YEAR_REPORT','CAREER_RETIRED',...(b.policy==='legacy-voluntary'?['PRO_STAGE_COMPLETE']:[])]).toContain(final.phase)
 expect(final.draft).toEqual(old.draft);expect(final.history.slice(0,old.history.length)).toEqual(old.history);expect(final.careerEventHistory.slice(0,old.careerEventHistory.length)).toEqual(old.careerEventHistory)
 saveGame(final);const saved=memory.get('career_save_current')!;expect(JSON.parse(saved).data).toEqual(final)
 useGameStore.setState({game:null});memory.delete('career_save_backup');expect(loadGame()).toEqual(final);s().continueCareer();expect(s().game).toEqual(final);s().continueCareer();expect(s().game).toEqual(final)
 rows.push({...b,loaded,first,steps,final,saved,storage:Object.fromEntries(memory),newHistory:final.history.length-old.history.length})
})
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()})
afterAll(()=>{if(process.env.CEU_Q01_CAPTURE==='1')writeFileSync(`${E}/matrix-results.json`,JSON.stringify(rows,null,2)+'\n',{flag:'wx'})})
