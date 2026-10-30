/** Entirely new deterministic CI games. No saved JSON, screenshot, user data or external input is read. */
import { it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRetirementVisualAuditGame } from '../../src/testing/createRetirementVisualAuditGame'
import { generatePlayer } from '../../src/engine/player'
import { CLUBS } from '../../src/data/clubs/runtimeClubCatalog'
import { validateGameState } from '../../src/persistence/save'
import { buildCareerPosterSvg, careerPosterAssetPaths } from '../../src/export/careerPosterSvg'
import { careerPosterSingleImageDimensions } from '../../src/export/careerPosterExport'
import { buildRetirementSummary } from '../../src/engine/careerSummary'

it('generates fresh anonymous CI cases from public game code and explicit constants only', () => {
 const out=resolve('qa/career-viewer/generated-fixtures');mkdirSync(out,{recursive:true})
 const clubIds=[...CLUBS].sort((a,b)=>a.id.localeCompare(b.id)).slice(0,32).map(club=>club.id)
 for(const count of [8,32]){
  const game=createRetirementVisualAuditGame(clubIds.slice(0,count))
  const seed=`ci-viewer-release-example-${count}`,name=`DemoPlayer${count}`
  game.careerSeed=seed;game.startYear=2040
  game.draft={...game.draft,name,jerseyNumber:17}
  const generated=generatePlayer(game.draft,seed)
  game.player={...generated,attributes:{attack:62,defense:46,physical:65,mental:63},potentials:{attack:80,defense:70,physical:82,mental:81}}
  game.cashEuro=0
  if(game.contract)game.contract={...game.contract,annualSalaryEuro:1200}
  game.history=game.history.map(entry=>({...entry,clubName:CLUBS.find(club=>club.id===entry.clubId)!.name,stats:{appearances:7,starts:5,minutes:420,goals:2,assists:1,yellowCards:0,redCards:0,averageRating:6.8},endingAttributes:{...game.player!.attributes}}))
  const valid=validateGameState(game)
  expect(buildRetirementSummary(valid).clubs).toHaveLength(count)
  expect(valid.careerEventHistory).toEqual([])
  const assets=Object.fromEntries(careerPosterAssetPaths(valid).map(path=>[path,'data:image/svg+xml;base64,PHN2Zy8+']))
  const poster=buildCareerPosterSvg(valid,assets),image=careerPosterSingleImageDimensions(poster)
  expect(image.width).toBeGreaterThanOrEqual(975);expect(image.height).toBe(Math.floor(poster.height*image.scale))
  console.log({count,width:poster.width,height:poster.height,imageWidth:image.width,imageHeight:image.height})
  writeFileSync(resolve(out,`retired-${count}clubs.json`),JSON.stringify(valid,null,2)+'\n')
 }
 writeFileSync(resolve(out,'provenance.json'),JSON.stringify({synthetic:true,source:'generate-fixtures.test.ts; existing createRetirementVisualAuditGame/generatePlayer/CLUBS only',externalInputs:[],gameCurrencyOnly:true,notUserSave:true},null,2))
})
