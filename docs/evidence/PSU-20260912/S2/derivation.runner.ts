import {it,expect} from 'vitest'
import {writeFileSync,readFileSync} from 'node:fs'
import {CLUBS,POSITION_WEIGHTS} from '../../../../src/data/balance'
import {growthPoolAtAge} from '../../../../src/data/ageCurve'
import {trainingQualityScore,developmentMultiplierFromTraining,developmentMultiplierWithMatchExperience,firstTeamMatchExperienceBonusForRuntimeClub} from '../../../../src/engine/trainingQuality'
import {createRandom} from '../../../../src/engine/random'
it('derives Ajax changed rounding from unchanged growth formula, independently of professional output',()=>{
 const club=CLUBS.find(x=>x.id==='ned_ajax')!, quality=trainingQualityScore({club,coachRelation:50,teamLevel:'FIRST_TEAM',bonus:0}),rows=[]
 for(const [fitness,minutes] of [[71,497],[72,499]]){const multiplier=developmentMultiplierWithMatchExperience(developmentMultiplierFromTraining({trainingQuality:quality,roleExposure:60,squadRelation:50,fitness:fitness!,morale:70,focus:'BALANCED'}),firstTeamMatchExperienceBonusForRuntimeClub({club,minutes:minutes!}));const randomFactor=createRandom('professional-minutes-growth-wiring:window:8','professional-growth').float(.9,1.1);const unrounded=42+growthPoolAtAge(17)*multiplier*POSITION_WEIGHTS.CAM.attack*1.08*randomFactor;rows.push({fitness,minutes,quality,multiplier,growthPool:growthPoolAtAge(17),share:POSITION_WEIGHTS.CAM.attack,randomFactor,unrounded,attack:Math.round(unrounded*10)/10})}
 expect(rows.map(x=>x.attack)).toEqual([45.9,46]);const p='docs/evidence/PSU-20260912/S2/ajax-derivation.json';if(process.env.PSU_S2_COLLECT==='1')writeFileSync(p,JSON.stringify(rows,null,2),{flag:'wx'});else expect(rows).toEqual(JSON.parse(readFileSync(p,'utf8')))
})
