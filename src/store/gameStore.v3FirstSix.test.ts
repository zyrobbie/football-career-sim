import { it, expect, vi, afterEach } from 'vitest'
import { readFileSync,writeFileSync } from 'node:fs'
import { useGameStore } from './gameStore'
import { loadGame,saveGame } from '../persistence/save'
import { professionalNextAction } from '../store/professionalNextAction'
import { getCareerEvent,eligibleCareerEventChoices } from '../engine/careerEvents'
import { createOffPitchStoryState } from '../models/offPitchStories'
import type { GameState,CareerEventId } from '../models/game'
const s=()=>useGameStore.getState();const evidence:any[]=[]
function install(g:GameState){const mem=new Map<string,string>();vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>mem.set(k,v),removeItem:(k:string)=>mem.delete(k)}});useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null});saveGame(g);s().continueCareer();expect(s().error).toBeNull();return mem}
function act(label:string,fn:()=>void,steps:any[]){const before=s().game!;fn();expect(s().error,`${label} ${before.phase} W${before.windowIndex}`).toBeNull();expect(loadGame()).toEqual(s().game);steps.push({label,before:{phase:before.phase,W:before.windowIndex},after:structuredClone(s().game)})}
function completeReport(steps:any[]){for(let i=0;i<8;i++){const g=s().game!;if(g.phase==='HALF_YEAR_REPORT')return;if(g.phase==='SPECIAL_EVENT_RESULT')act('continueAfterCareerEvent',()=>s().continueAfterCareerEvent(),steps);else if(g.pendingKeyMatchMoment){const p=g.pendingKeyMatchMoment,e={careerSeed:g.careerSeed,playerId:g.player!.id,windowIndex:g.windowIndex,clubId:g.selectedClubId!,momentId:p.id,inputFingerprint:p.inputFingerprint};if(g.phase==='KEY_MATCH_MOMENT')act('chooseKeyMatchMoment',()=>s().chooseKeyMatchMoment('A',e),steps);else act('finishKeyMatchMoment',()=>s().finishKeyMatchMoment(e),steps)}else throw Error('completeReport '+g.phase)}throw Error('report bound')}
function base():GameState{const flow=JSON.parse(readFileSync('docs/evidence/FUN-V3-20261023/public-flows/first-loop-public-flow.json','utf8'));const raw=flow.steps.find((x:any)=>x.after.phase==='HALF_YEAR_PLAN'&&x.after.W===42).raw;const g=JSON.parse(raw).data;return {...g,careerEventHistory:g.careerEventHistory.filter((h:any)=>!h.eventId.startsWith('V3_')),entertainmentV3:{...g.entertainmentV3,stories:createOffPitchStoryState()},pendingCareerEvent:null,pendingKeyMatchMoment:null,trainingFocus:'BALANCED',developmentApproach:'STEADY'}}
function pending(g:GameState,id:CareerEventId):GameState{const d=getCareerEvent(id,g);expect(d.isEligible(g),id+' constructed eligibility').toBe(true);return {...g,trainingFocus:g.trainingFocus??'BALANCED',developmentApproach:g.developmentApproach??'STEADY',phase:'SPECIAL_EVENT',pendingCareerEvent:{eventId:id,interactionKind:d.interactionKind,stepIndex:0,selections:[],variantId:null}}}
it('six-node constructed-entry public actions preserve choices; C01 followup is actually scheduled within three windows',()=>{
 const covered=new Set<string>();let commercialPlan:GameState|undefined
 for(const id of ['V3_E01_PRESS_DRINK','V3_E03_INTERVIEW_CLIP','V3_E04_FAN_SCHEDULE'] as CareerEventId[]){const g=pending(base(),id),mem=install(g),raw=mem.get('career_save_current')!,steps:any[]=[];const choice=eligibleCareerEventChoices(g,getCareerEvent(id,g))[0]!.id;act('chooseCareerEvent',()=>s().chooseCareerEvent(choice),steps);completeReport(steps);expect(s().game!.lastReport!.offPitchSummary).toContain(s().game!.careerEventHistory.at(-1)!.choiceTitle);covered.add(id);evidence.push({kind:'explicit synthetic eligible pending-event entry, public choice/result/simulation/reload',id,initialRaw:raw,steps})}
 const first='V3_C01A_LOCAL_CAR' as CareerEventId,g=pending(base(),first),mem=install(g),raw=mem.get('career_save_current')!,steps:any[]=[]
 act('chooseC01A_SHORT',()=>s().chooseCareerEvent('SHORT'),steps);covered.add(first);completeReport(steps)
 const firstW=g.windowIndex
 for(let n=0;n<60;n++){
  const current=s().game!
  if(current.phase==='HALF_YEAR_REPORT' && current.entertainmentV3!.stories.closedChains.some(c=>c.chainId==='C01'&&c.reason==='COMPLETED'))break
  if(current.windowIndex>firstW+3)break
  switch(current.phase){
   case 'HALF_YEAR_REPORT':case 'PRO_STAGE_COMPLETE':{const m=professionalNextAction(current);act('advanceProfessionalReport',()=>s().advanceProfessionalReport(m.primary!.action,current.windowIndex,current.careerSeed),steps);break}
   case 'TRANSFER_WINDOW':{const renew=current.transferOffers.find(o=>o.type==='RENEWAL'&&!o.withdrawn),id=current.contract!.remainingHalfYears>0?'STAY':renew?.id??current.transferOffers[0]!.id;if(id!==current.selectedTransferChoiceId)act('selectTransferChoice',()=>s().selectTransferChoice(id),steps);act('confirmTransferChoice',()=>s().confirmTransferChoice(),steps);break}
   case 'TRANSFER_STAGE_COMPLETE':act('continueAfterTransfer',()=>s().continueAfterTransfer(),steps);break
   case 'TRANSFER_ARRIVAL':act('chooseTransferArrival',()=>s().chooseTransferArrival('NONE'),steps);break
   case 'HALF_YEAR_PLAN':if(!commercialPlan)commercialPlan=structuredClone(current);act('chooseTraining',()=>s().chooseTraining('BALANCED','STEADY'),steps);break
   case 'SPECIAL_EVENT':{const p=current.pendingCareerEvent!,d=getCareerEvent(p.eventId,current),eligible=eligibleCareerEventChoices(current,d),route=d.setup?.options.find(o=>o.id===p.variantId);let choice=d.setup&&p.stepIndex===0?d.setup.options.find(o=>o.choiceIds.some(id=>eligible.some(c=>c.id===id)))!.id:eligible.find(c=>!route||route.choiceIds.includes(c.id))!.id;if(p.eventId==='V3_C01B_LOCAL_CAR_RETURN'){expect(d.description).toContain('只接一小时的简短拍摄');choice='SHORT';covered.add(p.eventId)}act('chooseCareerEvent',()=>s().chooseCareerEvent(choice),steps);break}
   case 'SPECIAL_EVENT_RESULT':case 'KEY_MATCH_MOMENT':case 'KEY_MATCH_MOMENT_RESULT':completeReport(steps);break
   default:throw Error('unexpected '+current.phase)
  }
 }
 const closed=s().game!.entertainmentV3!.stories.closedChains.find(c=>c.chainId==='C01');process.env.FUNV3_COLLECT_PUBLIC === '1' && writeFileSync('outputs/FUN-V3-20261023/c01-first-attempt-trace.json',JSON.stringify({initialRaw:raw,steps,closed},null,2));expect(closed?.reason).toBe('COMPLETED');expect(closed!.closedAtWindowIndex).toBeGreaterThan(firstW);expect(closed!.closedAtWindowIndex).toBeLessThanOrEqual(firstW+3);expect(closed!.firstChoiceId).toBe('SHORT');expect(closed!.followupOutcomeSummary).toContain('只接一小时的简短拍摄');evidence.push({kind:'synthetic eligible C01A entry then public actions and naturally scheduled B in original slot',id:'C01',initialRaw:raw,steps,closed})
 const ad='V3_E02_AD_TEAMMATE' as CareerEventId,adGame=pending(commercialPlan!,ad),adMem=install(adGame),adRaw=adMem.get('career_save_current')!,adSteps:any[]=[];act('chooseE02_LAUGH',()=>s().chooseCareerEvent('LAUGH'),adSteps);completeReport(adSteps);covered.add(ad);evidence.push({kind:'synthetic eligible E02 pending entry derived from publicly completed C01A evidence',id:ad,initialRaw:adRaw,steps:adSteps})
 process.env.FUNV3_COLLECT_PUBLIC === '1' && writeFileSync('outputs/FUN-V3-20261023/first-six-story-public-flows.json',JSON.stringify({kind:'constructed scenarios + actual public successor operations; not six naturally triggered events in one career',covered:[...covered],cases:evidence},null,2)+'\n')
 expect(covered.size).toBe(6)
},30000)
afterEach(()=>vi.unstubAllGlobals())
