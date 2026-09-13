import { completePendingMoment } from '../testing/keyMatchMomentTestSupport'
import { currentSchemaExpected } from '../testing/keyMatchMomentTestSupport'
import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { useGameStore } from './gameStore'
import { loadGame, saveGame } from '../persistence/save'
import { retirementAvailabilityAfterWindow, canOpenTransferMarketAfterWindow, shouldRetireAtContractExpiry } from '../engine/careerTime'
import { retireFromNationalTeamIfConfirmed } from '../components/ProfessionalReportActions'
import type { GameState } from '../models/game'
const rows = JSON.parse(readFileSync('docs/evidence/CEU-20260907/F-01/results-final-r2.json', 'utf8')) as {name:string;raw:string;inputSHA?:string;input:GameState}[]
const s = () => useGameStore.getState()
// F-01 capture is permanently read-only; current expectations follow approved F-02.
if (process.env.CEU_F01_EVIDENCE === '1') throw new Error('F-01 frozen evidence is read-only')
function install(raw:string) {
 const memory = new Map([['career_save_current',raw]])
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
 expect(memory.has('career_save_backup')).toBe(false)
 const before=loadGame()!;s().continueCareer();return before
}
function facts(g:GameState){return {history:g.history,cash:g.cashEuro,report:g.lastReport,events:g.careerEventHistory,national:g.nationalTeam}}
it.each(rows.filter(r=>r.input))('continues frozen F-01 input $name using approved F-02 actions',r=>{
 expect(createHash('sha256').update(r.raw).digest('hex')).toBe(r.inputSHA)
 install(r.raw);expect(s().game).toEqual(currentSchemaExpected(r.input))
 const before=structuredClone(s().game!),name=r.name
 if(name.startsWith('national')){
  expect(retireFromNationalTeamIfConfirmed(()=>false,()=>s().retireFromNationalTeam())).toBe(false);expect(s().game).toEqual(before)
  retireFromNationalTeamIfConfirmed(()=>true,()=>s().retireFromNationalTeam())
  if(name==='national-confirm'){
   expect(s().game).toEqual({...before,nationalTeam:{...before.nationalTeam,retired:true,currentRole:null}})
   s().retireFromNationalTeam();s().clearError();s().continueProfessionalCareer();expect(s().game!.phase).toBe('HALF_YEAR_PLAN')
  }else expect(s().game).toEqual(before)
 }else if(name.startsWith('optional')){
  s().requestRetirement();expect(s().game!.phase).toBe('RETIREMENT_DECISION')
  if(name==='optional-cancel')s().cancelRetirement();else s().confirmRetirement()
  expect(s().game!.phase).toBe(name==='optional-cancel'?'PRO_STAGE_COMPLETE':'CAREER_RETIRED')
 }else if(name==='young-retire-denied'){
  s().requestRetirement();expect(s().game).toEqual(before)
 }else if(name.includes('late-expiry')||name==='mandatory-55'){
  if(before.phase==='HALF_YEAR_REPORT')s().advanceAfterReport()
  s().cancelRetirement();expect(s().game!.phase).toBe('RETIREMENT_DECISION');expect(s().game!.retirementReason).toBe('AGE_LIMIT')
 }else if(name==='breach-no-opportunity'||name==='K09-breach-opportunity'){
  s().continueProfessionalCareer();expect(s().game!.phase).toBe(name.startsWith('K09')?'TRANSFER_WINDOW':'HALF_YEAR_PLAN')
  if(name.startsWith('K09'))expect(s().game!.selectedTransferChoiceId).toBe('STAY')
 }else if(name==='expiry'){
  s().continueProfessionalCareer();expect(s().game).toEqual(before);s().openTransferWindow();expect(s().game!.phase).toBe('TRANSFER_WINDOW')
 }else{
  if(before.phase==='HALF_YEAR_REPORT')s().advanceAfterReport();else s().continueProfessionalCareer()
  expect(s().game!.phase).toBe(name==='opportunity'||name==='breach-request'?'TRANSFER_WINDOW':name==='youth-4'?'CAREER_DASHBOARD':'HALF_YEAR_PLAN')
  if(name==='youth-4'){s().openProfessionalContract();s().acceptProfessionalContract();s().startProfessionalCareer();expect(s().game!.phase).toBe('HALF_YEAR_PLAN')}
 }
 if(!name.startsWith('national'))expect(facts(s().game!)).toEqual(facts(before))
 const final=structuredClone(s().game!);saveGame(final);expect(loadGame()).toEqual(final);s().continueCareer();expect(s().game).toEqual(final)
})
it.each(rows.filter(r=>r.name==='SPECIAL_EVENT_RESULT'||r.name==='READY_attack'))('restores frozen $name with exactly one simulation',r=>{
 const before=install(r.raw)
 if(r.name==='SPECIAL_EVENT_RESULT'){expect(s().game).toEqual(before);s().advanceAfterReport();expect(s().game).toEqual(before);s().continueAfterCareerEvent()}
 completePendingMoment(s);
 const after=structuredClone(s().game!);expect(after.history.length).toBe(before.history.length+1);expect(after.history.slice(0,before.history.length)).toEqual(before.history);expect(after.phase).toBe('HALF_YEAR_REPORT')
 s().continueAfterCareerEvent();s().continueCareer();expect(s().game).toEqual(after)
})
it('keeps the finite retirement age table',()=>{
 expect([33,34,38,40,41,46,47,48,52,53,54,55].map(retirementAvailabilityAfterWindow)).toEqual(['UNAVAILABLE','OPTIONAL','OPTIONAL','UNAVAILABLE','OPTIONAL','UNAVAILABLE','OPTIONAL','OPTIONAL','OPTIONAL','OPTIONAL','OPTIONAL','MANDATORY'])
 expect([52,53,54,55].map(canOpenTransferMarketAfterWindow)).toEqual([true,false,false,false]);expect([52,53,54,55].map(shouldRetireAtContractExpiry)).toEqual([false,true,true,false])
})
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()})
