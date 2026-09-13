import type { Attributes, HalfYearStats, Position } from './game'

export type MomentTier = 'EXCELLENT' | 'POSITIVE' | 'NEGATIVE'
export interface MomentDelta { goals: number; assists: number; yellowCards: number; redCards: 0; averageRating: number }
export interface MomentChoice {
  id: string; title: string; explanation: string; risk: 'LOW' | 'MEDIUM' | 'HIGH'
  weights: Attributes; difficulty: number
  outcomes: Record<MomentTier, { text: string; delta: MomentDelta }>
}
export interface MomentTemplate {
  id: string; revision: number; title: string; scene: string; positions: Position[]
  choices: MomentChoice[]
}
export interface MomentResolution {
  momentId: string; windowIndex: number; clubId: string; templateId: string
  choiceId: string; tier: MomentTier; text: string; delta: MomentDelta
}
export interface MomentSnapshot {
  id: string; windowIndex: number; clubId: string; templateId: string; templateRevision: number; rulesVersion: 1
  minute: number; ownScore: number; opponentScore: number; debutMoment: boolean
  title: string; scene: string; choiceTitle: string; result: MomentResolution; appliedStatsDelta: MomentDelta
}
export interface PendingKeyMatchMoment {
  id: string; windowIndex: number; clubId: string; templateId: string; templateRevision: number; rulesVersion: 1
  fingerprintVersion: 1; inputFingerprint: string
  minute: number; ownScore: number; opponentScore: number; debutMoment: boolean
  title: string; scene: string; choices: MomentChoice[]
  prepared: { attributes: Attributes; form: number; fitness: number; morale: number; actualTeamLevel: 'FIRST_TEAM' }
  baseStats: HalfYearStats; roll: number
  selectedChoiceId: string | null; resolution: MomentResolution | null; snapshot: MomentSnapshot | null
}
export interface MomentActionContext { careerSeed: string; playerId: string; windowIndex: number; clubId: string; momentId: string; inputFingerprint: string }
