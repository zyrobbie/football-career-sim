import {
  CLUBS,
  DOMESTIC_CLUBS,
  YOUTH_BENCHMARKS,
  YOUTH_STIPENDS,
} from '../data/balance'
import type {
  AcademyOffer,
  Club,
  Player,
  YouthRole,
} from '../models/game'
import { calculateOverall } from './player'
import { createRandom } from './random'

export function youthRoleFromDifference(difference: number): YouthRole {
  if (difference >= 4) return 'CORE'
  if (difference >= -1) return 'STARTER'
  return 'ROTATION'
}

export function calculateYouthSelectionScore(player: Player): number {
  return (
    calculateOverall(player.attributes, player.primaryPosition) +
    (player.form - 50) * 0.06 +
    (player.coachRelation - 50) * 0.04 +
    (player.morale - 50) * 0.02
  )
}

function chooseClub(
  seed: string,
  profile: Club['profile'],
): Club {
  const candidates = DOMESTIC_CLUBS.filter(
    (club) => club.profile === profile,
  )
  return createRandom(seed, 'academy-offer', profile).pick(candidates)
}

export function generateAcademyOffers(
  player: Player,
  careerSeed: string,
): AcademyOffer[] {
  const selectionScore = calculateYouthSelectionScore(player)
  return (['ELITE', 'BALANCED', 'SMALL'] as const).map((profile) => {
    const club = chooseClub(careerSeed, profile)
    const difference = selectionScore - YOUTH_BENCHMARKS[club.tier]
    return {
      club,
      expectedRole: youthRoleFromDifference(difference),
      firstTeamChance:
        profile === 'ELITE' ? 'HARD' : profile === 'BALANCED' ? 'NORMAL' : 'FAST',
      annualStipendEuro: YOUTH_STIPENDS[club.tier],
    }
  })
}

export function buildClubSimulationOffer(
  clubId: string,
  expectedRole: YouthRole = 'ROTATION',
): AcademyOffer | null {
  const club = CLUBS.find((candidate) => candidate.id === clubId)
  if (!club) return null
  return {
    club,
    expectedRole,
    firstTeamChance:
      club.profile === 'ELITE'
        ? 'HARD'
        : club.profile === 'BALANCED'
          ? 'NORMAL'
          : 'FAST',
    annualStipendEuro: YOUTH_STIPENDS[club.tier],
  }
}
