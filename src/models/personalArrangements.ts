import type { LivingCityState } from '../engine/livingCity'
import type { OffPitchStoryState } from './offPitchStories'
import type { DevelopmentApproach, TrainingFocus } from './game'

export type PersonalArrangementCategory = 'BODY' | 'MENTAL' | 'SETTLE'
export type PersonalArrangementTier = 'BASIC' | 'PLUS' | 'PREMIUM'
export type ArrangementGain = { fitness: number; morale: number; squadRelation: number }
export interface PersonalArrangementOffer {
  category: PersonalArrangementCategory
  tier: PersonalArrangementTier
  title: string
  description: string
  priceEuro: number
  periods: 1 | 2 | 3
  gain: ArrangementGain
}
export interface ArrangementPeriod {
  windowIndex: number
  status: 'PENDING' | 'EXECUTED' | 'TERMINATED'
  planned: ArrangementGain
  actual: ArrangementGain | null
  reason: string | null
}
export interface PersonalArrangement {
  id: string
  rulesVersion: 1
  cap: 85
  careerSeed: string
  category: PersonalArrangementCategory
  tier: PersonalArrangementTier
  title: string
  priceEuro: number
  purchaseYear: number
  purchaseWindowIndex: number
  moveId: string | null
  periods: ArrangementPeriod[]
  refundEuro: number
  refundReceipts: { id: string; windowIndex: number; amountEuro: number; reason: string }[]
  quotaRestored: boolean
  terminationCause: 'MOVE' | 'CITY_UNKNOWN' | 'RETIREMENT' | null
}
export interface EntertainmentV3State {
  rulesVersion: 1
  activationWindowIndex: number
  cashPolicy: 'UNCAPPED' | 'LEGACY_CAP'
  arrangements: PersonalArrangement[]
  ledger: { id: string; arrangementId: string; windowIndex: number; kind: 'PAYMENT' | 'REFUND'; amountEuro: number; reason: string }[]
  livingCity: LivingCityState
  stories: OffPitchStoryState
}
export interface ArrangementPurchaseRequest {
  careerSeed: string
  playerId: string
  windowIndex: number
  purchaseYear: number
  category: PersonalArrangementCategory
  tier: PersonalArrangementTier
  quoteId: string
  purchaseId: string
  trainingFocus: TrainingFocus
  developmentApproach: DevelopmentApproach | null
}
export interface ArrangementWindowReceipt {
  arrangementId: string
  windowIndex: number
  planned: ArrangementGain
  actual: ArrangementGain
  reason: string | null
}
