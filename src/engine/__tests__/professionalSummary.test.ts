import { expect, it } from 'vitest'
import { createTrainingBaselineState } from './ceuTrainingBaselineFixture'
import { simulateProfessionalHalfYear } from '../simulateProfessionalHalfYear'
const source = () => {
 const f = createTrainingBaselineState('psu-summary')
 Object.assign(f.state, { windowIndex: 22, firstTeamRole: 'CORE', teamLevel: 'FIRST_TEAM', trainingFocus: 'BALANCED' })
 Object.assign(f.state.player!, { form: 100, fitness: 100, morale: 100, coachRelation: 100, squadRelation: 100 })
 f.state.player!.attributes.physical = 65
 return f
}
it('reports executed capped preparation, opportunity bounds and risk floor without promising appearances', () => {
 const f = source(); f.state.developmentApproach = 'PUSH'
 const r = simulateProfessionalHalfYear({state:f.state,offer:f.academy}).report
 expect(r.eventSummary).toContain('身体状态-4')
 expect(r.eventSummary).not.toContain('教练关系+3')
 expect(r.eventSummary).toContain('受状态或关系边界限制')
 expect(r.eventSummary).not.toMatch(/\d+%/)
 expect(r.eventSummary).toContain('已触及边界')
 expect(r.eventSummary).toContain('风险仍处于下限')
 expect(r.eventSummary).not.toContain('承担更高伤病风险')
 expect(r.eventSummary).not.toContain('抽取')
})
it('reports recovery strategy suppression at all ages and retains veteran maintenance explanation', () => {
 for (const w of [22,44]) {
 const f = source(); f.state.windowIndex=w; f.state.player!.fitness=41;f.state.developmentApproach='TEAM_FIRST';f.state.trainingFocus=w===44?'BODY_CARE':'BALANCED'
 const summary=simulateProfessionalHalfYear({state:f.state,offer:f.academy}).report.eventSummary
 expect(summary).toContain('策略未执行');expect(summary).toContain('身体状态+10');expect(summary).not.toContain('本期策略：');expect(summary).not.toContain('队内关系实际增加')
 if(w===44)expect(summary).toContain('恢复')
 }
})
it('reports actual team relationship gain without stacking the ordinary reward and does not leak hidden ability', () => {
 const f = source();f.state.developmentApproach='TEAM_FIRST'
 const summary=simulateProfessionalHalfYear({state:f.state,offer:f.academy}).report.eventSummary
 expect(summary).toContain('减少首发诉求');expect(summary).not.toContain('队内关系+');expect(summary).not.toContain('赛后队内关系另')
 expect(summary).not.toMatch(/potential|潜力|TEAM_FIRST|PUSH|STEADY/)
})
