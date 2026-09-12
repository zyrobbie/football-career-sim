import { expect, it, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { simulateProfessionalHalfYear } from '../../../../src/engine/simulateProfessionalHalfYear'
import { saveGame, loadGame } from '../../../../src/persistence/save'
import { useGameStore } from '../../../../src/store/gameStore'
import { eligibleCareerEventChoices,getCareerEvent } from '../../../../src/engine/careerEvents'
import { trainingSubmission,trainingPlanView } from '../../../../src/ui/trainingPlanView'
import { professionalNextAction } from '../../../../src/store/professionalNextAction'
import type { GameState } from '../../../../src/models/game'
const D='docs/evidence/PSU-20260912/S3', sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex')
function storage(raw?:string){const m=new Map<string,string>();if(raw)m.set('career_save_current',raw);vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>m.set(k,v),removeItem:(k:string)=>m.delete(k)}});return m}
function record(name:string,data:unknown){if(process.env.PSU_S3_COLLECT==='1')writeFileSync(`${D}/${name}`,JSON.stringify(data,null,2),{flag:'wx'})}
it('preserves all1562 S2 numeric outputs; only newly generated first-team summaries change',()=>{
 const fixture=JSON.parse(readFileSync('docs/evidence/PSU-20260912/S1/inputs-valid.json','utf8'))
 const rows=JSON.parse(gunzipSync(readFileSync('docs/evidence/PSU-20260912/S2/outputs.json.gz')).toString());let textChanges=0;const examples:any[]=[]
 for(const row of rows){const input=structuredClone(fixture.base.state)
 for(const change of row.inputChanges){const keys=change.path.split('/').slice(1),last=keys.pop();let parent=input;for(const k of keys)parent=parent[k];parent[last]=change.after}
 expect(sha(JSON.stringify(input))).toBe(row.inputSHA);storage();saveGame(input)
 const actual=simulateProfessionalHalfYear({state:loadGame()!,offer:fixture.base.academy}),old=structuredClone(row.output)
 if(actual.report.eventSummary!==old.report.eventSummary){textChanges++;expect(actual.report.contract?.actualTeamLevel).toBe('FIRST_TEAM');if(examples.length<3||row.group==='boundary')examples.push({id:row.id,before:old.report.eventSummary,after:actual.report.eventSummary})}
 const projection=structuredClone(actual);projection.report.eventSummary=old.report.eventSummary;expect(projection,row.id).toEqual(old)
 }
 vi.unstubAllGlobals();record('numeric-equivalence.json',{inputs:rows.length,exactExceptNewSummary:true,textChanges,examples,sourceSHA:sha(readFileSync('docs/evidence/PSU-20260912/S2/outputs.json.gz'))})
})
it('loads30 frozen raw independently without backup, follows legal actions, preserves old records and v11 backups',()=>{
 const sources=JSON.parse(readFileSync('docs/evidence/PSU-20260912/S1/old-save-inventory.json','utf8')),results:any[]=[]
 for(const source of sources){const raw=readFileSync(source.path,'utf8');expect(sha(raw)).toBe(source.sha);const m=storage(raw);expect(m.has('career_save_backup')).toBe(false);const original=JSON.parse(raw).data;const loaded=loadGame();expect(loaded,source.path).not.toBeNull();expect(loaded!.history).toEqual(original.history);expect(loaded!.lastReport).toEqual(original.lastReport);expect(loaded!.transferOffers).toEqual(original.transferOffers);expect(loaded!.selectedTransferChoiceId).toEqual(original.selectedTransferChoiceId);expect(loaded!.cashEuro).toBe(original.cashEuro);expect(loaded!.draft).toEqual(original.draft);expect(loaded!.careerEventHistory).toEqual(original.careerEventHistory);expect(loaded!.nationalTeam).toEqual(original.nationalTeam)
 const r:any={source,actions:[]};results.push(r);const state=()=>useGameStore.getState().game!;const act=(label:string,fn:()=>void)=>{const before=structuredClone(state());fn();expect(useGameStore.getState().error,label+' '+source.path).toBeNull();r.actions.push({label,before,after:structuredClone(state()),raw:m.get('career_save_current')})}
 useGameStore.setState({game:null,error:null,hasSave:true});act('continue original raw',()=>useGameStore.getState().continueCareer());const initial=structuredClone(state());expect(initial.history.slice(0,loaded!.history.length)).toEqual(loaded!.history)
 if(initial.phase==='HALF_YEAR_PLAN'){const model=trainingPlanView(initial);const selection=trainingSubmission(initial,{focus:model.initialFocus,approach:initial.developmentApproach??'STEADY'})!;act('choose valid plan',()=>useGameStore.getState().chooseTraining(selection.focus,selection.approach,{careerSeed:initial.careerSeed,windowIndex:initial.windowIndex}))}
 for(let n=0;n<12&&['SPECIAL_EVENT','SPECIAL_EVENT_RESULT'].includes(state().phase);n++){if(state().phase==='SPECIAL_EVENT_RESULT')act('confirm event result',()=>useGameStore.getState().continueAfterCareerEvent());else{const e=getCareerEvent(state().pendingCareerEvent!.eventId),id=e.setup&&state().pendingCareerEvent!.stepIndex===0?e.setup.options[0]!.id:eligibleCareerEventChoices(state(),e)[0]!.id;act('event '+e.id+'/'+id,()=>useGameStore.getState().chooseCareerEvent(id))}}
 const afterEvents=structuredClone(state());const simulates=['HALF_YEAR_PLAN','SPECIAL_EVENT','SPECIAL_EVENT_RESULT','SIMULATION_READY'].includes(source.phase)
 expect(afterEvents.history.length).toBe(loaded!.history.length+(simulates?1:0));expect(afterEvents.history.slice(0,loaded!.history.length)).toEqual(loaded!.history)
 if(!simulates){expect(afterEvents.lastReport).toEqual(loaded!.lastReport);expect(afterEvents.cashEuro).toBe(loaded!.cashEuro);expect(afterEvents.careerEventHistory).toEqual(loaded!.careerEventHistory)}
 if(['HALF_YEAR_REPORT','PRO_STAGE_COMPLETE'].includes(state().phase)){const s=state(),model=professionalNextAction(s),action=model.secondary.find(x=>x.action==='STAY')??model.primary;if(action)act('report '+action.action,()=>useGameStore.getState().advanceProfessionalReport(action.action,s.windowIndex,s.careerSeed))}
 if(state().phase==='TRANSFER_WINDOW'){const s=state();expect(s.transferOffers).toEqual(source.phase==='TRANSFER_WINDOW'?loaded!.transferOffers:s.transferOffers);const id=s.contract!.remainingHalfYears>0?'STAY':s.transferOffers.find(x=>x.type==='RENEWAL'&&!x.withdrawn)?.id??s.transferOffers.find(x=>!x.withdrawn)?.id;if(id){act('select '+id,()=>useGameStore.getState().selectTransferChoice(id));act('confirm',()=>useGameStore.getState().confirmTransferChoice())}}
 if(state().phase==='TRANSFER_ARRIVAL')act('arrival NONE',()=>useGameStore.getState().chooseTransferArrival('NONE'))
 if(state().phase==='TRANSFER_STAGE_COMPLETE')act('next plan',()=>useGameStore.getState().continueAfterTransfer())
 if(state().phase==='RETIREMENT_DECISION')act('confirm retirement',()=>useGameStore.getState().confirmRetirement())
 const final=structuredClone(state());saveGame(final);act('reload final',()=>useGameStore.getState().continueCareer());expect(state()).toEqual(final);expect(loadGame()).toEqual(final);expect(final.history.slice(0,loaded!.history.length)).toEqual(loaded!.history)
 if(original.saveVersion===11)expect(m.get('career_save_v11_backup')).toBe(raw)
 expect(final.careerEventHistory.slice(0,loaded!.careerEventHistory.length)).toEqual(loaded!.careerEventHistory);expect(final.nationalTeam.history.slice(0,loaded!.nationalTeam.history.length)).toEqual(loaded!.nationalTeam.history);r.finalRaw=m.get('career_save_current');r.v11BackupPreserved=original.saveVersion===11?m.get('career_save_v11_backup')===raw:null
 }
 vi.unstubAllGlobals();record('old-raw-results-r2.json',{count:results.length,results})
})
