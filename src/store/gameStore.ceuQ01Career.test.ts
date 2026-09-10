import { afterEach, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const seeds=vi.hoisted(()=>({current:''}))
vi.mock('../engine/random',async original=>({...await original<typeof import('../engine/random')>(),createCareerSeed:()=>seeds.current}))
import { useGameStore } from './gameStore'
import { professionalNextAction } from './professionalNextAction'
import { trainingPlanView, trainingSubmission } from '../ui/trainingPlanView'
import { getCareerEvent, eligibleCareerEventChoices } from '../engine/careerEvents'
import { playerAgeAtWindow, shouldRetireAtContractExpiry } from '../engine/careerTime'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import { generateTransferOffers, generateContractExpiryOffers } from '../engine/transfers'
import { loadGame } from '../persistence/save'
import type { GameState, Position, TrainingFocus, OverseasIntent } from '../models/game'
const E='docs/evidence/CEU-20260907/Q-01',s=()=>useGameStore.getState(),sha=(v:unknown)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex')
function drive(index:number){
 seeds.current=`ceu-q01-current-${index}`
 const memory=new Map<string,string>(),writes:{key:string;sha:string}[]=[],steps:unknown[]=[],keySaves:unknown[]=[],training:unknown[]=[],preferences:unknown[]=[],markets:unknown[]=[]
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);writes.push({key:k,sha:sha(v)})},removeItem:(k:string)=>memory.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
 let count=0,adult=false,veteran=false,marketEdit=false
 function act(label:string,fn:()=>void){
  expect(count).toBeLessThan(1000);const before=s().game,offset=writes.length;fn();count++;const after=s().game!;expect(s().error,label).toBeNull();expect(after).not.toBeNull()
  const raw=memory.get('career_save_current')!;expect(JSON.parse(raw).data).toEqual(after)
  if(before){
   expect(after.history.slice(0,before.history.length)).toEqual(before.history)
   const added=after.history.length-before.history.length;expect([0,1]).toContain(added)
   if(added){expect(['chooseTraining','continueAfterCareerEvent','chooseCareerEvent']).toContain(label);expect(after.history.at(-1)!.windowIndex).toBe(before.windowIndex)}
   else if(!['chooseCareerEvent','chooseArrival','chooseTransferArrival'].includes(label))expect(after.cashEuro).toBe(before.cashEuro)
  }
  expect(Number.isFinite(after.cashEuro)).toBe(true);expect(after.cashEuro).toBeGreaterThanOrEqual(0)
  expect(after.windowIndex).toBeLessThanOrEqual(55)
  if(after.contract){expect(after.contract.clubId).toBe(after.selectedClubId);expect(after.contract.remainingHalfYears).toBeGreaterThanOrEqual(0);expect(after.firstTeamProgress.clubId).toBe(after.selectedClubId)}
  for(const v of Object.values(after.player?.attributes??{}))expect(Number.isFinite(v)).toBe(true)
  steps.push({n:count,label,before:before?{phase:before.phase,W:before.windowIndex,H:before.history.length,cash:before.cashEuro}:null,after:{phase:after.phase,W:after.windowIndex,H:after.history.length,cash:after.cashEuro},stateSHA:sha(after),writes:writes.slice(offset),savedSHA:sha(raw)})
  if(['advanceProfessionalReport','confirmTransferChoice','confirmRetirement','updateCareerPreferences'].includes(label)||after.phase==='HALF_YEAR_PLAN'&&[30,31,33,34,35].includes(playerAgeAtWindow(after.windowIndex)))keySaves.push({n:count,label,raw})
  return after
 }
 function edit(intent:OverseasIntent,label:string){const before=structuredClone(s().game!),leagues=intent==='DOMESTIC'?[]:['意大利'];act('updateCareerPreferences',()=>s().updateCareerPreferences(intent,leagues));expect(s().game).toEqual({...before,player:{...before.player!,overseasIntent:intent,preferredLeagues:leagues}});preferences.push({label,before,after:s().game});}
 act('startNewCareer',()=>s().startNewCareer());act('submitIdentity',()=>s().submitIdentity({name:`Q01匿名${index}`,jerseyNumber:8,preferredFoot:'RIGHT'}))
 const positions:[Position,Position][]=[['ST','CAM'],['CM','CDM'],['CB','LB']]
 act('submitPosition',()=>s().submitPosition(...positions[index]!));act('submitPriorities',()=>s().submitPriorities(['PLAYING_TIME','COMPETITIVE_LEVEL','STABILITY','SALARY']));act('submitPreferences',()=>s().submitPreferences('CONDITIONAL',['意大利']));act('confirmPlayer',()=>s().confirmPlayer())
 while(count<1000){const g=s().game!,age=playerAgeAtWindow(g.windowIndex)
  if(g.phase==='CAREER_RETIRED'){
   expect(g.retirementReason).toBe('AGE_LIMIT');expect(g.windowIndex===55||(g.contract!.remainingHalfYears===0&&shouldRetireAtContractExpiry(g.windowIndex))).toBe(true)
   const final=structuredClone(g),raw=memory.get('career_save_current')!;useGameStore.setState({game:null});s().continueCareer();expect(s().game).toEqual(final);expect(loadGame()).toEqual(final)
   return {seed:seeds.current,index,count,steps,keySaves,training,preferences,markets,final,finalRaw:raw,writes,overseas35:g.history.filter(h=>playerAgeAtWindow(h.windowIndex)===35&&getClubParametersByCompatibleId(h.clubId)?.country!=='中国'),countries:[...new Set(g.history.map(h=>getClubParametersByCompatibleId(h.clubId)?.country))]}
  }
  switch(g.phase){
   case 'ACADEMY_OFFERS':act('selectAcademy',()=>s().selectAcademy(g.academyOffers[0]!.club.id));break
   case 'ARRIVAL_EVENT':act('chooseArrival',()=>s().chooseArrival('COACH'));break
   case 'HALF_YEAR_PLAN':{
    if(g.contract&&age>=18&&!adult){edit('STRONG','first adult plan');adult=true;continue}
    if(g.contract&&age>=31&&!veteran){edit('DOMESTIC','first veteran plan');veteran=true;continue}
    const model=trainingPlanView(g),cycle:TrainingFocus[]=age>=34?['BODY_CARE','MATCH_SHARPNESS','MENTAL_RESET']:['BODY_CARE','MENTAL_RESET']
    const desired:TrainingFocus=age<=30?'BALANCED':cycle[(g.windowIndex+index)%cycle.length]!
    const available=model.options.find(o=>o.id===desired&&!o.disabledReason),focus=model.recovery?'BODY_CARE':available?.id??model.options.find(o=>!o.disabledReason)!.id
    const submission=trainingSubmission(g,{focus,approach:'STEADY'})!;expect(submission).not.toBeNull()
    const after=act('chooseTraining',()=>s().chooseTraining(submission.focus,submission.approach,{careerSeed:g.careerSeed,windowIndex:g.windowIndex}))
    training.push({W:g.windowIndex,age,desired,chosen:submission.focus,recovery:model.recovery,fallback:focus!==desired,storedFocus:after.trainingFocus});expect(after.trainingFocus).toBe(submission.focus);break
   }
   case 'SPECIAL_EVENT':{const p=g.pendingCareerEvent!,e=getCareerEvent(p.eventId),eligible=eligibleCareerEventChoices(g,e),route=e.setup?.options.find(o=>o.id===p.variantId);const id=e.setup&&p.stepIndex===0?e.setup.options.find(o=>o.choiceIds.some(id=>eligible.some(c=>c.id===id)))!.id:eligible.find(c=>!route||route.choiceIds.includes(c.id))!.id;act('chooseCareerEvent',()=>s().chooseCareerEvent(id));break}
   case 'SPECIAL_EVENT_RESULT':act('continueAfterCareerEvent',()=>s().continueAfterCareerEvent());break
   case 'HALF_YEAR_REPORT':{
    if(!g.contract){act('advanceAfterReport',()=>s().advanceAfterReport());break}
    if(age>=31)expect(g.lastReport!.eventSummary).toContain('本期训练：')
    const model=professionalNextAction(g);expect(model.primary).not.toBeNull()
    const after=act('advanceProfessionalReport',()=>s().advanceProfessionalReport(model.primary!.action,g.windowIndex,g.careerSeed))
    if(after.phase==='TRANSFER_WINDOW'){
     const args={player:g.player!,currentClubId:g.selectedClubId!,currentTeamLevel:g.teamLevel,latestReport:g.lastReport,careerSeed:g.careerSeed,windowIndex:g.windowIndex+1}
     const expected=g.contract.remainingHalfYears===0?generateContractExpiryOffers({...args,currentRole:(g.teamLevel==='FIRST_TEAM'?g.firstTeamRole:g.youthRole)!,currentContract:g.contract}):generateTransferOffers(args)
     expect(after.transferOffers).toEqual(expected);markets.push({W:after.windowIndex,intent:g.player!.overseasIntent,leagues:g.player!.preferredLeagues,input:args,offers:after.transferOffers})
    }
    break
   }
   case 'CAREER_DASHBOARD':act('openProfessionalContract',()=>s().openProfessionalContract());break
   case 'PRO_CONTRACT_OFFER':act('acceptProfessionalContract',()=>s().acceptProfessionalContract());break
   case 'PRO_CONTRACT_COMPLETE':act('startProfessionalCareer',()=>s().startProfessionalCareer());break
   case 'TRANSFER_WINDOW':{
    const offers=g.transferOffers.filter(o=>!o.withdrawn),external=offers.filter(o=>o.clubId!==g.selectedClubId).sort((a,b)=>a.clubId.localeCompare(b.clubId)),id=external[0]?.id??offers.find(o=>o.type==='RENEWAL')?.id??'STAY'
    if(g.selectedTransferChoiceId!==id)act('selectTransferChoice',()=>s().selectTransferChoice(id))
    if(age>=18&&!marketEdit){
     if(id!=='STAY'&&!s().game!.transferOffers.find(o=>o.id===id)!.counterUsed)act('counterTransferOffer',()=>s().counterTransferOffer('SALARY'))
     edit('CONDITIONAL','existing adult market after negotiation');marketEdit=true;continue
    }
    act('confirmTransferChoice',()=>s().confirmTransferChoice());break
   }
   case 'TRANSFER_ARRIVAL':act('chooseTransferArrival',()=>s().chooseTransferArrival('NONE'));break
   case 'TRANSFER_STAGE_COMPLETE':act('continueAfterTransfer',()=>s().continueAfterTransfer());break
   case 'RETIREMENT_DECISION':act('confirmRetirement',()=>s().confirmRetirement({careerSeed:g.careerSeed,windowIndex:g.windowIndex}));break
   default:throw new Error(`unexpected phase ${g.phase} seed ${seeds.current}`)
  }
 }
 throw new Error(`1000 actions exceeded ${seeds.current}`)
}
it.each([0,1,2])('current entry complete career %i and exact replay',index=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-08-16T00:00:00Z'))
 const first=drive(index),second=drive(index);expect(second).toEqual(first)
 if(process.env.CEU_Q01_CAPTURE==='1')writeFileSync(`${E}/career-${index}.json`,JSON.stringify({first,replay:{entireResultEqual:true,sha:sha(second),finalSHA:sha(second.final),steps:second.steps}},null,2)+'\n',{flag:'wx'})
},30000)
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
