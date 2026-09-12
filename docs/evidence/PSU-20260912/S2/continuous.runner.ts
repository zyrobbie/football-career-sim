import {expect,it,vi} from 'vitest'
import {readFileSync,writeFileSync} from 'node:fs'
import {gzipSync,gunzipSync} from 'node:zlib'
import {saveGame} from '../../../../src/persistence/save'
import {useGameStore} from '../../../../src/store/gameStore'
import {professionalNextAction} from '../../../../src/store/professionalNextAction'
import {eligibleCareerEventChoices,getCareerEvent} from '../../../../src/engine/careerEvents'
import {trainingPlanView,trainingSubmission} from '../../../../src/ui/trainingPlanView'
import * as training from '../../../../src/engine/trainingPlan'
import type {GameState} from '../../../../src/models/game'
const D='docs/evidence/PSU-20260912/S2',fixture=JSON.parse(readFileSync('docs/evidence/PSU-20260912/S1/inputs-valid.json','utf8'))
it('observes at most48 half-years using public store actions and actual permitted training',()=>{
 const groups=[{id:'young',age:24,role:'ROTATION',seed:0,focus:'BALANCED'},{id:'mature',age:28,role:'STARTER',seed:1,focus:'BALANCED'},{id:'veteran-body',age:35,role:'ROTATION',seed:2,focus:'BODY_CARE'},{id:'veteran-sharp',age:35,role:'ROTATION',seed:2,focus:'MATCH_SHARPNESS'}] as const,rows:any[]=[]
 let probe:any;const original=training.applyTrainingMaintenance;const spy=vi.spyOn(training,'applyTrainingMaintenance').mockImplementation((...a)=>{const r=original(...a);probe={before:structuredClone(a[0]),prepared:structuredClone(a[1]),execution:structuredClone(r)};return r})
 for(const g of groups)for(const approach of ['PUSH','STEADY','TEAM_FIRST'] as const){const map=new Map<string,string>();vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)}});const input=structuredClone(fixture.base.state) as GameState;input.windowIndex=(g.age-13)*2;input.phase='HALF_YEAR_PLAN';input.careerSeed=fixture.mainSeeds[g.seed];input.firstTeamRole=g.role;input.contract!.promisedRole=g.role;input.trainingFocus=null;input.developmentApproach=null;saveGame(input);useGameStore.setState({game:null,error:null,hasSave:true});useGameStore.getState().continueCareer();expect(useGameStore.getState().error).toBeNull();const r:any={group:g,approach,input,actions:[],windows:[]};rows.push(r);const state=()=>useGameStore.getState().game!;function act(label:string,fn:()=>void){const before=structuredClone(state());fn();expect(useGameStore.getState().error,label).toBeNull();r.actions.push({label,before,after:structuredClone(state()),raw:map.get('career_save_current')})}
 for(let step=0;step<4;step++){expect(state().phase).toBe('HALF_YEAR_PLAN');const old=structuredClone(state()),view=trainingPlanView(old),desired=g.focus;const focus=view.options.find(x=>x.id===desired&&!x.disabledReason)?desired:'BODY_CARE';const selection=trainingSubmission(old,{focus,approach});expect(selection).not.toBeNull();act('training '+JSON.stringify(selection),()=>useGameStore.getState().chooseTraining(selection!.focus,selection!.approach,{careerSeed:old.careerSeed,windowIndex:old.windowIndex}));for(let n=0;n<10&&['SPECIAL_EVENT','SPECIAL_EVENT_RESULT'].includes(state().phase);n++){if(state().phase==='SPECIAL_EVENT_RESULT')act('confirm event result',()=>useGameStore.getState().continueAfterCareerEvent());else{const e=getCareerEvent(state().pendingCareerEvent!.eventId);const choice=e.setup&&state().pendingCareerEvent!.stepIndex===0?e.setup.options[0]!.id:eligibleCareerEventChoices(state(),e)[0]!.id;act('event '+e.id+'/'+choice,()=>useGameStore.getState().chooseCareerEvent(choice))}}
 expect(state().phase).toBe('HALF_YEAR_REPORT');expect(state().history.slice(0,-1)).toEqual(old.history);expect(state().history).toHaveLength(old.history.length+1);r.windows.push({before:old,selection,probe:structuredClone(probe),after:structuredClone(state())});const settled=structuredClone(state());act('reload report',()=>useGameStore.getState().continueCareer());expect(state()).toEqual(settled)
 for(let n=0;n<12&&state().phase!=='HALF_YEAR_PLAN'&&state().phase!=='CAREER_RETIRED';n++){
 const s=state();if(s.phase==='HALF_YEAR_REPORT'||s.phase==='PRO_STAGE_COMPLETE'){const m=professionalNextAction(s),action=m.secondary.find(x=>x.action==='STAY')??m.primary;expect(action).not.toBeNull();act('report '+action!.action,()=>useGameStore.getState().advanceProfessionalReport(action!.action,s.windowIndex,s.careerSeed))}
 else if(s.phase==='TRANSFER_WINDOW'){const id=s.contract!.remainingHalfYears>0?'STAY':s.transferOffers.find(x=>x.type==='RENEWAL'&&!x.withdrawn)?.id??s.transferOffers.find(x=>!x.withdrawn)?.id;expect(id).toBeTruthy();act('select '+id,()=>useGameStore.getState().selectTransferChoice(id!));act('confirm transfer',()=>useGameStore.getState().confirmTransferChoice())}
 else if(s.phase==='TRANSFER_ARRIVAL')act('arrival NONE',()=>useGameStore.getState().chooseTransferArrival('NONE'))
 else if(s.phase==='TRANSFER_STAGE_COMPLETE')act('next plan',()=>useGameStore.getState().continueAfterTransfer())
 else if(s.phase==='RETIREMENT_DECISION')act('retirement',()=>useGameStore.getState().confirmRetirement())
 else throw Error('unplanned phase '+s.phase)
 }
 if(state().phase==='CAREER_RETIRED')break;expect(state().phase).toBe('HALF_YEAR_PLAN')
 }
 r.final=structuredClone(state());r.finalRaw=map.get('career_save_current');expect(r.windows.length).toBeLessThanOrEqual(4)
 }
 spy.mockRestore();vi.unstubAllGlobals();expect(rows.reduce((n,r)=>n+r.windows.length,0)).toBeLessThanOrEqual(48);if(process.env.PSU_S2_COLLECT==='1')writeFileSync(`${D}/continuous.json.gz`,gzipSync(JSON.stringify(rows)),{flag:'wx'});else expect(rows).toEqual(JSON.parse(gunzipSync(readFileSync(`${D}/continuous.json.gz`)).toString()))
},120000)
