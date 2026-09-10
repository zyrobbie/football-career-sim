import { expect, it } from 'vitest'
import { trainingEventSummary, type TrainingExecution } from '../engine/trainingPlan'
it('formats saved training copy without internal terms, preserving exact execution and young text', () => {
  const execution: TrainingExecution = { focus:'BODY_CARE', recovery:false, before:{fitness:80,form:80,morale:80}, gains:{fitness:4,form:0,morale:0},costs:{fitness:0,form:2,morale:0},declineFitness:81,physicalDeclineMultiplier:0.8,physicalDeclineSaved:0.13062,saturated:false }
  const before=structuredClone(execution)
  const text=trainingEventSummary('准备完成。',execution)
  expect(text).toContain('\n本期训练：身体维护')
  expect(text).toContain('身体衰退减少约0.13')
  expect(text).not.toMatch(/取整|下限|ADAPTATION|旧适应/)
  expect(execution).toEqual(before)
  expect(trainingEventSummary('原年轻摘要\n不变',null)).toBe('原年轻摘要\n不变')
})
