import {expect,it} from 'vitest'
import {createEntertainmentV3Game} from '../../testing/createEntertainmentV3Game'
import {careerEventIsEligible,getCareerEvent,resolveCareerEventChoice,selectCareerEvent} from '../careerEvents'
import {recordV3StoryChoice} from '../offPitchStories'
import type {GameState} from '../../models/game'
const urgent=['FITNESS_WARNING','KEY_MATCH_PAIN','CONTRACT_ROLE_TALK']
const historyEntry=(g:GameState,w:number):GameState['history'][number]=>({windowIndex:w,clubId:g.selectedClubId!,clubName:'匿名构造球队',role:'STARTER',stats:{appearances:12,starts:9,minutes:810,goals:2,assists:2,yellowCards:0,redCards:0,averageRating:6.8},arrivalChoice:null,trainingFocus:'BALANCED',developmentApproach:'STEADY',endingAttributes:{...g.player!.attributes},firstTeamAttention:100,teamLevel:'FIRST_TEAM'})
it('merely-eligible health events cannot preempt an active B or manufacture a different urgent winner',()=>{
 let checked=0
 // A finite selector-only seed matrix, not natural career/playtest evidence.
 for(let n=0;n<32;n++){
  let game=createEntertainmentV3Game(31,'eng_arsenal',`FUNV3-SCHEDULER-${n}`)
  game.history=[historyEntry(game,34),historyEntry(game,35)]
  game.phase='SIMULATION_READY';game.trainingFocus='BALANCED';game.developmentApproach='STEADY'
  const resolved=resolveCareerEventChoice({state:game,eventId:'V3_C01A_LOCAL_CAR',choiceId:'SHORT'})
  game={...game,player:resolved.player,careerEventHistory:[resolved.record],entertainmentV3:{...game.entertainmentV3!,stories:recordV3StoryChoice(game,resolved.record)}}
  game={...game,windowIndex:37,phase:'SIMULATION_READY',history:[...game.history,historyEntry(game,36)]}
  const legacy={...game,entertainmentV3:{...game.entertainmentV3!,activationWindowIndex:56,cashPolicy:'LEGACY_CAP' as const}}
  const winner=selectCareerEvent(legacy)
  if(!winner||urgent.includes(winner)||getCareerEvent(winner).timing==='TRANSITION')continue
  expect(careerEventIsEligible(game,getCareerEvent('KEY_MATCH_PAIN'))).toBe(true)
  expect(selectCareerEvent(game)).toBe('V3_C01B_LOCAL_CAR_RETURN')
  const withoutChain={...game,entertainmentV3:{...game.entertainmentV3!,stories:{...game.entertainmentV3!.stories,activeChain:null}}}
  expect(urgent).not.toContain(selectCareerEvent(withoutChain))
  checked++
 }
 expect(checked).toBeGreaterThan(0)
})
it('an actually selected urgent legacy winner still takes precedence over B',()=>{
 let checked=0
 for(let n=0;n<64;n++){
  let game=createEntertainmentV3Game(31,'eng_arsenal',`FUNV3-URGENT-WINNER-${n}`)
  game.history=[historyEntry(game,34),historyEntry(game,35)]
  const resolved=resolveCareerEventChoice({state:game,eventId:'V3_C01A_LOCAL_CAR',choiceId:'SHORT'})
  game={...game,windowIndex:37,phase:'SIMULATION_READY',trainingFocus:'BALANCED',developmentApproach:'STEADY',careerEventHistory:[resolved.record],history:[...game.history,historyEntry(game,36)],entertainmentV3:{...game.entertainmentV3!,stories:recordV3StoryChoice(game,resolved.record)}}
  const winner=selectCareerEvent({...game,entertainmentV3:{...game.entertainmentV3!,activationWindowIndex:56}})
  if(winner&&urgent.includes(winner)){expect(selectCareerEvent(game)).toBe(winner);checked++}
 }
 expect(checked).toBeGreaterThan(0)
})
