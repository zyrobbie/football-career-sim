import { describe, expect, it } from 'vitest'
import { isCompletedRenewal } from '../TransferWindowScreen'

describe('transfer completion copy', () => {
  it('does not describe an in-contract stay as a new renewal', () => {
    expect(
      isCompletedRenewal({
        decisionKind: 'STAY',
        contractType: 'RENEWAL',
        selectedTransferChoiceId: 'STAY',
      }),
    ).toBe(false)
  })

  it('recognizes accepting the current club renewal offer', () => {
    expect(
      isCompletedRenewal({
        decisionKind: 'STAY',
        contractType: 'RENEWAL',
        selectedTransferChoiceId: 'renewal-offer-id',
      }),
    ).toBe(true)
  })

  it('never describes a transfer as a renewal', () => {
    expect(
      isCompletedRenewal({
        decisionKind: 'TRANSFER',
        contractType: 'PERMANENT_TRANSFER',
        selectedTransferChoiceId: 'transfer-offer-id',
      }),
    ).toBe(false)
  })
})
