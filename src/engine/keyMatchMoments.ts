import type { GameState, HalfYearStats } from '../models/game'
import type { MomentChoice, MomentResolution, MomentSnapshot, MomentTemplate, PendingKeyMatchMoment } from '../models/keyMatchMoment'
import { KEY_MATCH_MOMENT_TEMPLATES } from '../data/keyMatchMomentTemplates'
import { createRandom } from './random'
import { canonicalSimulationBase, prepareFirstTeamSimulation, prepareReadySimulation } from './simulationPreparation'
import { enforceAgeBasedFirstTeam } from './eligibility'
import { simulateProfessionalHalfYear } from './simulateProfessionalHalfYear'

export class MomentRecoveryError extends Error {
  constructor(detail='关键比赛时刻与当前进度不一致。'){super(`${detail} 原始存档已保留，请勿重新开档覆盖。`);this.name='MomentRecoveryError'}
}
export function canonicalMomentJSON(value:unknown):string {
  const normalize=(x:unknown):unknown=>{
    if(typeof x==='number'&&!Number.isFinite(x))throw new MomentRecoveryError('存档包含无效数值。')
    if(Array.isArray(x))return x.map(normalize)
    if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,normalize(v)]))
    return x
  }
  return JSON.stringify(normalize(value))
}
export function momentFingerprint(state:GameState):string {
  const {phase: _phase,pendingKeyMatchMoment:_pending,saveVersion:_save,dataVersion:_data,...base}=state
  const text=canonicalMomentJSON(base);let a=2166136261,b=2246822519
  for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489917)}
  return `${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`
}
export function momentChances(p:PendingKeyMatchMoment['prepared'],choice:MomentChoice) {
  const attribute=Object.entries(choice.weights).reduce((sum,[key,weight])=>sum+p.attributes[key as keyof typeof p.attributes]*weight,0)
  const effective=attribute*.82+(p.form*.45+p.fitness*.30+p.morale*.25)*.18
  const positive=Math.max(.2,Math.min(.85,.52+(effective-choice.difficulty)*.012))
  return {positive,excellent:Math.min(positive,Math.max(.04,Math.min(.2,.08+Math.max(0,effective-choice.difficulty)*.004)))}
}
function preparedContext(base:GameState) {
  const ready=prepareReadySimulation(base),state=enforceAgeBasedFirstTeam(ready.simulationState)
  const {workingPlayer}=prepareFirstTeamSimulation(state,state.trainingFocus!,state.developmentApproach)
  return {attributes:{...workingPlayer.attributes},form:workingPlayer.form,fitness:workingPlayer.fitness,morale:workingPlayer.morale,actualTeamLevel:'FIRST_TEAM' as const}
}
// Memory spans empty windows. Release oldest restrictions only when the legal pool is exhausted.
export function availableMomentTemplates(legal:readonly MomentTemplate[],history:GameState['history']):readonly MomentTemplate[] {
  const recent=[...history].reverse().flatMap(h=>h.keyMatchMoment?[h.keyMatchMoment.templateId]:[]).slice(0,4)
  let pool=legal.filter(t=>!recent.includes(t.id))
  while(!pool.length&&recent.length){recent.pop();pool=legal.filter(t=>!recent.includes(t.id))}
  return pool
}
export function createKeyMatchMoment(base:GameState,report:ReturnType<typeof simulateProfessionalHalfYear>['report']):PendingKeyMatchMoment|null {
  if(!base.contract||!base.player||base.pendingKeyMatchMoment||report.contract?.actualTeamLevel!=='FIRST_TEAM'||report.stats.appearances<=0)return null
  const legal=KEY_MATCH_MOMENT_TEMPLATES.filter(t=>t.positions.includes(base.player!.primaryPosition))
  if(!legal.length)return null
  const debut=!base.history.some(h=>h.teamLevel==='FIRST_TEAM'&&h.stats.appearances>0)
  const previous=base.history.find(h=>h.windowIndex===base.windowIndex-1)?.keyMatchMoment
  if(!debut&&createRandom(base.careerSeed,base.windowIndex,'key-match-moment-trigger').next()>=(previous ? .45 : .75))return null
  const pool=availableMomentTemplates(legal,base.history)
  const template=createRandom(base.careerSeed,base.windowIndex,'key-match-moment-template').pick(pool)
  const id=`${base.careerSeed}:${base.windowIndex}:${base.selectedClubId}:${template.id}:${template.revision}`
  const context=createRandom(id,'key-match-moment-context'),score=context.pick([[0,0],[1,1],[0,1],[1,0]] as const)
  return {id,windowIndex:base.windowIndex,clubId:base.selectedClubId!,templateId:template.id,templateRevision:template.revision,rulesVersion:1,fingerprintVersion:1,inputFingerprint:momentFingerprint(base),minute:context.pick([62,68,73,78,82,86,89]),ownScore:score[0],opponentScore:score[1],debutMoment:debut,title:template.title,scene:template.scene,choices:structuredClone(template.choices),prepared:preparedContext(base),baseStats:{...report.stats},roll:createRandom(id,'key-match-moment-outcome').next(),selectedChoiceId:null,resolution:null,snapshot:null}
}
export function resolveKeyMatchMoment(p:PendingKeyMatchMoment,choiceId:string):MomentResolution {
  if(p.rulesVersion!==1||p.fingerprintVersion!==1)throw new MomentRecoveryError('不支持这份关键比赛规则。')
  const c=p.choices.find(c=>c.id===choiceId);if(!c)throw new MomentRecoveryError('选择不属于这次机会。')
  const {positive,excellent}=momentChances(p.prepared,c),tier=p.roll<excellent?'EXCELLENT':p.roll<positive?'POSITIVE':'NEGATIVE'
  return {momentId:p.id,windowIndex:p.windowIndex,clubId:p.clubId,templateId:p.templateId,choiceId,tier,text:c.outcomes[tier].text,delta:{...c.outcomes[tier].delta}}
}
export function momentSnapshot(base:GameState,p:PendingKeyMatchMoment,resolution:MomentResolution):MomentSnapshot {
  const {simulationState,offer}=prepareReadySimulation(base),after=simulateProfessionalHalfYear({state:simulationState,offer,momentResolution:resolution}).report.stats
  const difference=(key:keyof Pick<HalfYearStats,'goals'|'assists'|'yellowCards'|'averageRating'>)=>Math.round((after[key]-p.baseStats[key])*10)/10
  return {id:p.id,windowIndex:p.windowIndex,clubId:p.clubId,templateId:p.templateId,templateRevision:p.templateRevision,rulesVersion:p.rulesVersion,minute:p.minute,ownScore:p.ownScore,opponentScore:p.opponentScore,debutMoment:p.debutMoment,title:p.title,scene:p.scene,choiceTitle:p.choices.find(c=>c.id===resolution.choiceId)!.title,result:resolution,appliedStatsDelta:{goals:difference('goals'),assists:difference('assists'),yellowCards:difference('yellowCards'),redCards:0,averageRating:difference('averageRating')}}
}
export function validateMomentContext(state:GameState):void {
  const p=state.pendingKeyMatchMoment,phase=state.phase
  if(!p){if(phase==='KEY_MATCH_MOMENT'||phase==='KEY_MATCH_MOMENT_RESULT')throw new MomentRecoveryError('比赛机会记录缺失。');return}
  if(!['KEY_MATCH_MOMENT','KEY_MATCH_MOMENT_RESULT','SIMULATION_READY'].includes(phase)||!state.player||!state.contract||!state.trainingFocus||state.pendingCareerEvent||state.history.some(h=>h.windowIndex===state.windowIndex))throw new MomentRecoveryError()
  if(p.rulesVersion!==1||p.fingerprintVersion!==1||p.windowIndex!==state.windowIndex||p.clubId!==state.selectedClubId||p.inputFingerprint!==momentFingerprint(state)||momentFingerprint(canonicalSimulationBase(state))!==p.inputFingerprint)throw new MomentRecoveryError()
  if(!KEY_MATCH_MOMENT_TEMPLATES.some(t=>t.id===p.templateId&&t.positions.includes(state.player!.primaryPosition)) || state.contract.remainingHalfYears<=0) throw new MomentRecoveryError('这份比赛机会不属于当前位置或合同。')
  if(p.id!==`${state.careerSeed}:${p.windowIndex}:${p.clubId}:${p.templateId}:${p.templateRevision}`||p.roll!==createRandom(p.id,'key-match-moment-outcome').next())throw new MomentRecoveryError()
  if(canonicalMomentJSON(preparedContext(state))!==canonicalMomentJSON(p.prepared))throw new MomentRecoveryError('比赛准备状态不匹配。')
  const ready=prepareReadySimulation(state),preview=simulateProfessionalHalfYear({state:ready.simulationState,offer:ready.offer}).report
  if(preview.contract?.actualTeamLevel!=='FIRST_TEAM'||preview.stats.appearances<=0||canonicalMomentJSON(preview.stats)!==canonicalMomentJSON(p.baseStats))throw new MomentRecoveryError('本窗比赛记录不匹配。')
  const selected=p.selectedChoiceId!==null
  if(selected!==Boolean(p.resolution)||selected!==Boolean(p.snapshot)||(phase==='KEY_MATCH_MOMENT'&&selected)||(phase!=='KEY_MATCH_MOMENT'&&!selected))throw new MomentRecoveryError()
  if(selected){const resolved=resolveKeyMatchMoment(p,p.selectedChoiceId!);if(canonicalMomentJSON(resolved)!==canonicalMomentJSON(p.resolution)||canonicalMomentJSON(momentSnapshot(state,p,resolved))!==canonicalMomentJSON(p.snapshot))throw new MomentRecoveryError('已保存的比赛结果不一致。')}
}
