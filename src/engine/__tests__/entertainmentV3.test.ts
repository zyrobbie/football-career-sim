import {afterEach,expect,it,vi} from 'vitest'
import {createEntertainmentV3Game} from '../../testing/createEntertainmentV3Game'
import {finalizeEntertainmentWindow} from '../entertainmentV3'
import {personalArrangementCapContribution, purchasePersonalArrangement, quotePersonalArrangement} from '../personalArrangements'
import {runReadySimulation} from '../../store/gameStore'
import {loadGame, saveGame, validateGameState} from '../../persistence/save'
import {installTestStorage} from '../../testing/keyMatchMomentTestSupport'
import {createLivingCityState} from '../livingCity'
afterEach(()=>vi.unstubAllGlobals())
it('assembling the same finalized report twice never adds its purchase expense twice',()=>{
  let game=createEntertainmentV3Game()
  game=purchasePersonalArrangement(game,quotePersonalArrangement(game,'BODY','PLUS').request)
  const report=runReadySimulation({...game,phase:'SIMULATION_READY',trainingFocus:'BALANCED',developmentApproach:'STEADY'},{keyMatchMoments:false})
  expect(report.lastReport!.expenseEuro).toBe(10000)
  expect(finalizeEntertainmentWindow(report)).toEqual(report)
  expect(finalizeEntertainmentWindow(finalizeEntertainmentWindow(report))).toEqual(report)
})
it('a known current-club city cannot be replaced with another well-typed city',()=>{
  const game=createEntertainmentV3Game()
  expect(validateGameState(game)).toEqual(game)
  game.entertainmentV3!.livingCity=createLivingCityState('eng_liverpool')
  expect(()=>validateGameState(game)).toThrow()
})
it('corrupt V14 paid progress never silently falls back over an older valid backup',()=>{
  const memory=installTestStorage(), original=createEntertainmentV3Game()
  saveGame(original,{strict:true})
  const old=memory.get('career_save_current')!
  const paid=purchasePersonalArrangement(original,quotePersonalArrangement(original,'MENTAL','PLUS').request)
  saveGame(paid,{strict:true})
  memory.set('career_save_backup',old)
  const envelope=JSON.parse(memory.get('career_save_current')!);envelope.data.cashEuro++
  const corrupt=JSON.stringify(envelope);memory.set('career_save_current',corrupt)
  expect(()=>loadGame()).toThrow('V3存档校验和')
  expect(memory.get('career_save_current')).toBe(corrupt)
  expect(memory.get('career_save_backup')).toBe(old)
})
it.each([80,85,90])('finite cap alternative %i preserves high values and limits combined contributions',cap=>{
  for(const state of [40,cap-5,cap-.1,cap,cap+5])for(const planned of [1,2,3,4,8]){
    const actual=personalArrangementCapContribution(planned,state,cap)
    expect(actual).toBeGreaterThanOrEqual(0);expect(actual).toBeLessThanOrEqual(planned)
    expect(state+actual).toBeLessThanOrEqual(Math.max(state,cap))
    if(state>=cap)expect(actual).toBe(0)
  }
  const first=personalArrangementCapContribution(4,cap-5,cap), second=personalArrangementCapContribution(4,cap-5+first,cap)
  expect([first,second]).toEqual([4,1])
})
it('paid preparation is pure across repeated key-moment previews and only final public settlement consumes one period',async()=>{
  const {useGameStore}=await import('../../store/gameStore')
  const {completePendingMoment}=await import('../../testing/keyMatchMomentTestSupport')
  installTestStorage()
  let game=createEntertainmentV3Game(31,'eng_arsenal','FUNV3-PAID-MOMENT-ONCE')
  game=purchasePersonalArrangement(game,quotePersonalArrangement(game,'MENTAL','PLUS').request)
  const ready={...game,phase:'SIMULATION_READY' as const,trainingFocus:'BALANCED' as const,developmentApproach:'STEADY' as const}
  const noMoment=runReadySimulation(ready,{keyMatchMoments:false})
  const paused=runReadySimulation(ready)
  expect(paused.phase).toBe('KEY_MATCH_MOMENT')
  for(let n=0;n<3;n++)expect(runReadySimulation(ready)).toEqual(paused)
  expect(paused.entertainmentV3!.arrangements[0]!.periods.map(p=>p.status)).toEqual(['PENDING','PENDING'])
  saveGame(paused,{strict:true});useGameStore.setState({game:paused,error:null,isReviewingReport:false,voluntaryRetirementConfirmation:null})
  completePendingMoment(useGameStore.getState)
  const after=useGameStore.getState().game!
  expect(useGameStore.getState().error).toBeNull()
  expect(after.phase).toBe('HALF_YEAR_REPORT')
  expect(after.lastReport!.personalArrangements!.receipts).toEqual(noMoment.lastReport!.personalArrangements!.receipts)
  expect(after.entertainmentV3!.arrangements[0]!.periods.map(p=>p.status)).toEqual(['EXECUTED','PENDING'])
  expect(after.entertainmentV3!.ledger.filter(l=>l.kind==='PAYMENT')).toHaveLength(1)
  expect(after.cashEuro).toBe(noMoment.cashEuro)
})
