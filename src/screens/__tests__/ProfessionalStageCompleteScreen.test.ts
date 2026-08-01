import { describe, expect, it } from 'vitest'
import { professionalStageHeading } from '../ProfessionalStageCompleteScreen'

describe('professional stage completion copy', () => {
  it('uses the first-half setback title only in the first professional window', () => {
    expect(professionalStageHeading(false, true)).toBe(
      '第一个职业半年并不轻松。',
    )
    expect(professionalStageHeading(false, false)).toBe(
      '本次职业半年未达预期。',
    )
  })

  it('keeps the fulfilled title independent of career age', () => {
    expect(professionalStageHeading(true, true)).toBe(
      '合同、训练与比赛已经开始联动。',
    )
    expect(professionalStageHeading(true, false)).toBe(
      '合同、训练与比赛已经开始联动。',
    )
  })
})
