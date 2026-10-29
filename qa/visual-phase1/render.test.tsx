import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { test, expect, vi } from 'vitest'
import { createEntertainmentV3Game } from '../../src/testing/createEntertainmentV3Game'
import { getCareerEvent } from '../../src/engine/careerEvents'
import { generateTransferOffers } from '../../src/engine/transfers'
import { simulateProfessionalHalfYear } from '../../src/engine/simulateProfessionalHalfYear'
import { TrainingPlanScreen } from '../../src/screens/TrainingPlanScreen'
import { SpecialEventScreen } from '../../src/screens/SpecialEventScreen'
import { HalfYearReportScreen } from '../../src/screens/HalfYearReportScreen'
import { TransferWindowScreen } from '../../src/screens/TransferWindowScreen'
import { CareerNavigationProvider } from '../../src/app/careerNavigation'
import { ClubVisualThemeProvider } from '../../src/app/ClubVisualThemeProvider'
import type { GameState } from '../../src/models/game'
const holder = vi.hoisted(() => ({ game: null as unknown }))
vi.mock('../../src/store/gameStore', () => ({ useGameStore: (select: (s: unknown) => unknown) => select(new Proxy({game: holder.game}, {get:(o,k)=>k==='game'?o.game:()=>{}})) }))
const output=resolve('qa/visual-phase1/generated')
function write(name:string, game:GameState, node:React.ReactNode) {
 holder.game=game
 const css=['src/styles/main.css','src/styles/phase1.css','src/styles/phase1-report-transfer.css'].filter(existsSync).map(p=>readFileSync(p,'utf8')).join('\n')
 const markup=renderToStaticMarkup(<CareerNavigationProvider careerKey="isolated-layout-test"><ClubVisualThemeProvider game={game}>{node}</ClubVisualThemeProvider></CareerNavigationProvider>)
 expect(markup.length).toBeGreaterThan(1000)
 if(name==='report'){expect(markup).not.toContain('请先完成当前进度');expect(markup).toContain('button--primary')}
 writeFileSync(resolve(output,name+'.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anonymous component layout QA</title><style>${css}</style></head><body><div id="root">${markup}</div></body></html>`)
}
test('generate only fresh anonymous server-rendered component layouts, never user saves',()=>{
 mkdirSync(output,{recursive:true})
 const base=()=>{const g=createEntertainmentV3Game(26,'eng_arsenal','PHASE1-SSR-20261029');g.player!.name='测试球员甲';return g}
 write('training',base(),<TrainingPlanScreen />)
 const capped=createEntertainmentV3Game(35,'eng_arsenal','PHASE1-SSR-CAPPED');capped.player!.name='测试球员乙';capped.player!.form=95;capped.player!.morale=95;write('training-capped',capped,<TrainingPlanScreen />)
 const recovery=createEntertainmentV3Game(37,'eng_arsenal','PHASE1-SSR-RECOVERY');recovery.player!.name='测试球员丙';recovery.player!.fitness=30;write('training-recovery',recovery,<TrainingPlanScreen />)
 for(const [name,id] of [['event-three','V3_E04_FAN_SCHEDULE'],['event-long','V3_C01A_LOCAL_CAR'],['event-two','DEADLINE_DAY_SPECULATION']]){
  const g=base(),event=getCareerEvent(id,g);expect(event).toBeTruthy();g.phase='SPECIAL_EVENT';g.pendingCareerEvent={eventId:id,interactionKind:event.interactionKind,stepIndex:0,selections:[],variantId:null};write(name,g,<SpecialEventScreen />)
 }
 const transfer=base();transfer.phase='TRANSFER_WINDOW';transfer.transferOffers=generateTransferOffers({player:transfer.player!,currentClubId:transfer.selectedClubId!,currentTeamLevel:transfer.teamLevel,latestReport:null,careerSeed:transfer.careerSeed,windowIndex:transfer.windowIndex});expect(transfer.transferOffers.length).toBeGreaterThan(0);write('transfer',transfer,<TransferWindowScreen />)
 const report=base();report.trainingFocus='BALANCED';report.developmentApproach='STEADY';const result=simulateProfessionalHalfYear({state:report,offer:report.academyOffers[0]!});Object.assign(report,result,{lastReport:result.report,phase:'HALF_YEAR_REPORT'});report.history=[{windowIndex:report.windowIndex,clubId:report.selectedClubId!,clubName:report.academyOffers[0]!.club.name,role:result.report.contract?.actualRole??result.report.roleBefore,stats:result.report.stats,arrivalChoice:null,trainingFocus:report.trainingFocus,developmentApproach:report.developmentApproach,endingAttributes:{...result.player.attributes},firstTeamAttention:result.firstTeamProgress.attention,teamLevel:result.teamLevel}];write('report',report,<HalfYearReportScreen />)
 const long=base();long.player!.name='测试这是很长的中文球员姓名用来检测换行';long.cashEuro=1234567890;write('training-long',long,<TrainingPlanScreen />)
 writeFileSync(resolve(output,'cases.json'),JSON.stringify(['training','training-capped','training-recovery','event-three','event-long','event-two','transfer','report','training-long']))
})
