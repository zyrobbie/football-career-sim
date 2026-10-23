import { it, expect, vi, afterEach } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { useGameStore } from './gameStore'
import { loadGame, saveGame } from '../persistence/save'
import { professionalNextAction } from '../store/professionalNextAction'
import { eligibleCareerEventChoices, getCareerEvent } from '../engine/careerEvents'
import { resolveClubCity } from '../data/clubCities'
import { quotePersonalArrangement, activePersonalArrangements } from '../engine/personalArrangements'
import { trainingPlanView,trainingSubmission } from '../ui/trainingPlanView'
import type { GameState } from '../models/game'
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const s=()=>useGameStore.getState()
it('first loop: constructed market, then ONLY public actions through same-city/different-city, three periods and cross-year overlap',()=>{
 const rows=JSON.parse(readFileSync('docs/evidence/FUN-V3-20261023/public-flows/public-flow-starts.json','utf8'))
 const chosen=rows.find((r:any)=>r.same.length)
 expect(chosen.seed).toBe('FUNV3-STAGE-SAMECITY-00')
 const mem=new Map<string,string>();vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>mem.set(k,v),removeItem:(k:string)=>mem.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
 saveGame(chosen.state);s().continueCareer();expect(s().error).toBeNull()
 const initialRaw=mem.get('career_save_current')!,steps:any[]=[],reports:any[]=[],transfers:any[]=[],nodes=new Set<string>()
 let sameCityDone=false,differentCityDone=false,settleBought=false,mentalBought=false
 function act(label:string,fn:()=>void){const before=s().game!;fn();const after=s().game!;expect(s().error,`${label} W${before.windowIndex} ${before.phase}`).toBeNull();expect(loadGame()).toEqual(after);steps.push({label,before:{W:before.windowIndex,phase:before.phase,cash:before.cashEuro,club:before.selectedClubId},after:{W:after.windowIndex,phase:after.phase,cash:after.cashEuro,club:after.selectedClubId},sha:sha(after),raw:mem.get('career_save_current')});expect(steps.length).toBeLessThan(500)}
 for(let step=0;step<500;step++){
  const g=s().game!;
  if(g.phase==='CAREER_RETIRED')break
  switch(g.phase){
   case 'TRANSFER_WINDOW':{
    const offers=g.transferOffers.filter(o=>!o.withdrawn)
    const origin=resolveClubCity(g.selectedClubId).cityId
    let selected:string='STAY'
    if(!sameCityDone)selected=offers.find(o=>o.clubId!==g.selectedClubId&&resolveClubCity(o.clubId).cityId===origin)!.id
    else if(!differentCityDone)selected=offers.find(o=>o.clubId!==g.selectedClubId&&resolveClubCity(o.clubId).cityId!==origin)!.id
    else if(g.contract!.remainingHalfYears===0)selected=offers.find(o=>o.type==='RENEWAL'&&o.clubId===g.selectedClubId)?.id??offers[0]!.id
    if(g.selectedTransferChoiceId!==selected)act('selectTransferChoice',()=>s().selectTransferChoice(selected))
    act('confirmTransferChoice',()=>s().confirmTransferChoice())
    const after=s().game!,dest=resolveClubCity(after.selectedClubId).cityId
    if(after.selectedClubId!==g.selectedClubId){transfers.push({W:g.windowIndex,from:g.selectedClubId,to:after.selectedClubId,fromCity:origin,toCity:dest,moveId:after.entertainmentV3!.livingCity.eligibilityMoveId});if(!sameCityDone){expect(dest).toBe(origin);expect(after.entertainmentV3!.livingCity.moves).toHaveLength(0);sameCityDone=true}else if(!differentCityDone){expect(dest).not.toBe(origin);expect(after.entertainmentV3!.livingCity.moves).toHaveLength(1);differentCityDone=true}}
    break
   }
   case 'TRANSFER_ARRIVAL':act('chooseTransferArrival',()=>s().chooseTransferArrival('NONE'));break
   case 'TRANSFER_STAGE_COMPLETE':act('continueAfterTransfer',()=>s().continueAfterTransfer());break
   case 'HALF_YEAR_PLAN':{
    const model=trainingPlanView(g),focus=model.options.find(o=>o.id==='BODY_CARE'&&!o.disabledReason)?.id??model.options.find(o=>!o.disabledReason)?.id??'BODY_CARE'
    const selection=trainingSubmission(g,{focus,approach:'STEADY'})!
    if(!sameCityDone)throw Error('samecity missing')
    if(!differentCityDone)expect(quotePersonalArrangement(g,'SETTLE','BASIC',{focus:selection.focus,approach:selection.approach}).disabledReason).not.toBeNull()
    if(differentCityDone&&!settleBought){const q=quotePersonalArrangement(g,'SETTLE','PREMIUM',selection);expect(q.disabledReason).toBeNull();act('buySETTLE',()=>s().purchasePersonalArrangement(q.request));settleBought=true;continue}
    if(settleBought&&!mentalBought&&activePersonalArrangements(g).some(a=>a.category==='SETTLE')){const q=quotePersonalArrangement(g,'MENTAL','PLUS',selection);if(!q.disabledReason){act('buyMENTAL',()=>s().purchasePersonalArrangement(q.request));mentalBought=true;continue}}
    act('chooseTraining',()=>s().chooseTraining(selection.focus,selection.approach,{careerSeed:g.careerSeed,windowIndex:g.windowIndex}));break
   }
   case 'SPECIAL_EVENT':{
    const p=g.pendingCareerEvent!,event=getCareerEvent(p.eventId,g),eligible=eligibleCareerEventChoices(g,event),route=event.setup?.options.find(o=>o.id===p.variantId)
    let choice=event.setup&&p.stepIndex===0?event.setup.options.find(o=>o.choiceIds.some(id=>eligible.some(c=>c.id===id)))!.id:eligible.find(c=>!route||route.choiceIds.includes(c.id))!.id
    if(p.eventId==='V3_C01A_LOCAL_CAR')choice='SHORT'
    if(p.eventId.startsWith('V3_'))nodes.add(p.eventId)
    act('chooseCareerEvent',()=>s().chooseCareerEvent(choice));break
   }
   case 'SPECIAL_EVENT_RESULT':act('continueAfterCareerEvent',()=>s().continueAfterCareerEvent());break
   case 'KEY_MATCH_MOMENT':case 'KEY_MATCH_MOMENT_RESULT':{
    const p=g.pendingKeyMatchMoment!,ctx={careerSeed:g.careerSeed,playerId:g.player!.id,windowIndex:g.windowIndex,clubId:g.selectedClubId!,momentId:p.id,inputFingerprint:p.inputFingerprint}
    if(g.phase==='KEY_MATCH_MOMENT')act('chooseKeyMatchMoment',()=>s().chooseKeyMatchMoment('A',ctx));else act('finishKeyMatchMoment',()=>s().finishKeyMatchMoment(ctx));break
   }
   case 'HALF_YEAR_REPORT':case 'PRO_STAGE_COMPLETE':{
    if(g.lastReport)reports.push({W:g.windowIndex,report:g.lastReport,arrangements:g.entertainmentV3!.arrangements})
    const model=professionalNextAction(g);expect(model.primary).not.toBeNull();act('advanceProfessionalReport',()=>s().advanceProfessionalReport(model.primary!.action,g.windowIndex,g.careerSeed));break
   }
   case 'RETIREMENT_DECISION':act('confirmRetirement',()=>s().confirmRetirement());break
   default:throw Error('unexpected '+g.phase)
  }
 }
 const final=s().game!,a=final.entertainmentV3!.arrangements
 const result={kind:'one anonymous constructed initial market, then public store APIs only; not natural complete career',seed:chosen.seed,initialRaw,steps,reports,transfers,nodes:[...nodes],final}
 process.env.FUNV3_COLLECT_PUBLIC === '1' && writeFileSync('outputs/FUN-V3-20261023/first-loop-public-flow.json',JSON.stringify(result,null,2)+'\n')
 expect(sameCityDone).toBe(true);expect(differentCityDone).toBe(true);expect(settleBought).toBe(true);expect(mentalBought).toBe(true)
 expect(a.find(a=>a.category==='SETTLE')!.periods.map(p=>p.status)).toEqual(['EXECUTED','EXECUTED','EXECUTED'])
 expect(a.find(a=>a.category==='MENTAL')!.periods.map(p=>p.status)).toEqual(['EXECUTED','EXECUTED'])
 expect(reports.some(r=>r.report.personalArrangements?.receipts.length===2)).toBe(true)
 expect(final.phase).toBe('CAREER_RETIRED')
},30000)
afterEach(()=>vi.unstubAllGlobals())
