import { createEntertainmentV3State, migrationActivationWindow } from '../engine/entertainmentV3'
import { vi } from 'vitest'
import { SAVE_VERSION, DATA_VERSION, type GameState } from '../models/game'
import type { useGameStore } from '../store/gameStore'
/** Only schema additions, never rewrites frozen inputs or changes business expectations. */
export function currentSchemaExpected<T extends object>(old:T):T & Pick<GameState,'saveVersion'|'dataVersion'|'pendingKeyMatchMoment'|'entertainmentV3'> {
  return {...old,entertainmentV3:(old as Partial<GameState>).entertainmentV3??createEntertainmentV3State((old as Partial<GameState>).selectedClubId??null,migrationActivationWindow(old as GameState)),saveVersion:SAVE_VERSION,dataVersion:DATA_VERSION,pendingKeyMatchMoment:(old as Partial<GameState>).pendingKeyMatchMoment??null}
}
export function installTestStorage() {
  const memory=new Map<string,string>()
  vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}})
  return memory
}
/** Explicit real public actions for the new two-step phase, not a feature bypass. */
export function completePendingMoment(get:()=>ReturnType<typeof useGameStore.getState>) {
  for(let n=0;n<2;n++){
    const g=get().game,p=g?.pendingKeyMatchMoment
    if(!g?.player||!p||!['KEY_MATCH_MOMENT','KEY_MATCH_MOMENT_RESULT'].includes(g.phase))return
    const expected={careerSeed:g.careerSeed,playerId:g.player.id,windowIndex:g.windowIndex,clubId:p.clubId,momentId:p.id,inputFingerprint:p.inputFingerprint}
    if(g.phase==='KEY_MATCH_MOMENT')get().chooseKeyMatchMoment(p.choices[0]!.id,expected)
    else get().finishKeyMatchMoment(expected)
    if(get().error)throw new Error(get().error!)
  }
}

/** Only the newly added root is excluded. Every V2 business field remains exact. */
export function legacyBusinessProjection<T>(value: T): T {
  if (!value || typeof value !== 'object') return value
  const {entertainmentV3: _v3, ...business} = value as T & {entertainmentV3?: unknown}
  return business as T
}
