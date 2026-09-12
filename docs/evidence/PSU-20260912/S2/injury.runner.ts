import { expect,it,vi } from 'vitest'
import { readFileSync,writeFileSync } from 'node:fs'
import { gzipSync,gunzipSync } from 'node:zlib'
import { simulateProfessionalHalfYear } from '../../../../src/engine/simulateProfessionalHalfYear'
import * as plans from '../../../../src/engine/trainingPlan'
import { prepareProfessionalWindow,professionalInjuryRisk } from '../../../../src/engine/professionalApproach'
import { createRandom } from '../../../../src/engine/random'
const D='docs/evidence/PSU-20260912/S2',fixture=JSON.parse(readFileSync('docs/evidence/PSU-20260912/S1/inputs-valid.json','utf8'))
it('pairs 1000 fixed injury seeds across five input groups, uses actual prepared state and original random stream',()=>{
 const expanded=process.env.PSU_INJURY_EXTEND==='1',prefix=expanded?'injury-maintenance-10000':'injury';const seeds=expanded?Array.from({length:10000},(_,i)=>`psu-injury-${String(i).padStart(4,'0')}`):fixture.injurySeedsForS2;const rows:any[]=[],summary:any[]=[];let prepared:any;const original=plans.applyTrainingMaintenance;const spy=vi.spyOn(plans,'applyTrainingMaintenance').mockImplementation((...a)=>{const r=original(...a);prepared=structuredClone(a[1]);return r})
 for(const group of (expanded?['maintenance']:['normal','threshold','high','recovery','maintenance']))for(const approach of ['PUSH','STEADY','TEAM_FIRST'] as const){const inputs:any[]=[]
 for(const seed of seeds){const state=structuredClone(fixture.base.state);state.careerSeed=seed;state.developmentApproach=approach;if(group==='threshold')state.player.fitness=46;if(group==='high'){state.player.form=state.player.fitness=state.player.morale=100;state.player.attributes={attack:90,defense:90,physical:90,mental:90}}if(group==='recovery')state.player.form=45;if(group==='maintenance'){state.windowIndex=44;state.trainingFocus='BODY_CARE'}
 const execution=prepareProfessionalWindow(state.player,approach);const output=simulateProfessionalHalfYear({state,offer:fixture.base.academy});const risk=professionalInjuryRisk(prepared,execution.matchModifiers,execution.recovery);expect(Boolean(output.report.injury)).toBe(createRandom(`${seed}:window:${state.windowIndex}`,'professional-injury').next()<risk);const row={group,approach,seed,prepared,execution:{recovery:execution.recovery,modifiers:execution.matchModifiers},risk,output};inputs.push(row);rows.push(row)}
 summary.push({group,approach,n:inputs.length,preparedFitness:inputs[0].prepared.fitness,risk:inputs[0].risk,injuries:inputs.filter(r=>r.output.report.injury).length,rate:inputs.filter(r=>r.output.report.injury).length/inputs.length})}
 spy.mockRestore();if(process.env.PSU_S2_COLLECT==='1'){writeFileSync(`${D}/${prefix}-outputs.json.gz`,gzipSync(JSON.stringify(rows)),{flag:'wx'});writeFileSync(`${D}/${prefix}-summary.json`,JSON.stringify(summary,null,2),{flag:'wx'})}else expect(rows).toEqual(JSON.parse(gunzipSync(readFileSync(`${D}/${prefix}-outputs.json.gz`)).toString()))
},120000)
