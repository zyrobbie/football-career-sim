import { it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { useGameStore } from './gameStore'
import { loadGame } from '../persistence/save'
import type { GameState } from '../models/game'
const input=JSON.parse(readFileSync('docs/evidence/FUN-V3-20261023/compatibility/v13-frozen-process-fixtures.json','utf8'))
const business=(g:any)=>{const {saveVersion,dataVersion,entertainmentV3,...rest}=g;return rest}
for(const row of input.cases)for(const [index,fixture] of row.states.entries())it(`preserves V13 ${row.id} ${fixture.phase} #${index}`,()=>{
 const mem=new Map<string,string>([['career_save_current',fixture.raw],['career_save_v11_backup','do-not-touch11'],['career_save_v12_backup','do-not-touch12']]);
 vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>mem.set(k,v),removeItem:(k:string)=>mem.delete(k)}})
 useGameStore.setState({game:null,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
 const migrated=loadGame()!;expect(migrated.saveVersion).toBe(14);expect(mem.get('career_save_v13_backup')).toBe(fixture.raw);expect(mem.get('career_save_v11_backup')).toBe('do-not-touch11');expect(mem.get('career_save_v12_backup')).toBe('do-not-touch12');expect(business(migrated)).toEqual(business(JSON.parse(fixture.raw).data));
 useGameStore.getState().continueCareer();expect(useGameStore.getState().error).toBeNull()
 for(let n=0;n<3;n++){
  const g=useGameStore.getState().game!,p=g.pendingKeyMatchMoment
  if(!p||g.phase==='HALF_YEAR_REPORT')break
  const ctx={careerSeed:g.careerSeed,playerId:g.player!.id,windowIndex:g.windowIndex,clubId:g.selectedClubId!,momentId:p.id,inputFingerprint:p.inputFingerprint}
  if(g.phase==='KEY_MATCH_MOMENT')useGameStore.getState().chooseKeyMatchMoment('A',ctx)
  else if(g.phase==='KEY_MATCH_MOMENT_RESULT')useGameStore.getState().finishKeyMatchMoment(ctx)
  else throw Error('unexpected '+g.phase)
  expect(useGameStore.getState().error).toBeNull()
 }
 const actual=useGameStore.getState().game!;expect(actual.phase).toBe('HALF_YEAR_REPORT');expect(business(actual)).toEqual(business(row.expectedReport));expect(loadGame()).toEqual(actual)
 expect(mem.get('career_save_v13_backup')).toBe(fixture.raw)
})
afterEach(()=>vi.unstubAllGlobals())
