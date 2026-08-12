import { describe, expect, it } from 'vitest'
import type { GameState } from '../../models/game'
import {
  CAREER_EVENTS,
  careerEventIsEligible,
  careerEventIsOnCooldown,
  consumeCareerConsequences,
  eligibleCareerEventChoices,
  getCareerEvent,
  leastSeenCareerEventPool,
  resolveCareerEventChoice,
  selectCareerEvent,
  validateCareerEventDefinitions,
} from '../careerEvents'
import { createCareerStoryState } from '../careerStory'
import { createFirstTeamProgress } from '../firstTeamPath'
import { generateAcademyOffers } from '../offers'
import { generatePlayer } from '../player'
import { validateGameState } from '../../persistence/save'
import { createDraft } from './testFixtures'

function createState(windowIndex = 1): GameState {
  const careerSeed = 'career-event-test-seed'
  const draft = createDraft('ST')
  const player = generatePlayer(draft, careerSeed)
  const academyOffers = generateAcademyOffers(player, careerSeed)
  const offer = academyOffers[0]!
  return {
    saveVersion: 11,
    dataVersion: 11,
    phase: 'HALF_YEAR_PLAN',
    careerSeed,
    startYear: 2026,
    windowIndex,
    draft,
    player,
    academyOffers,
    selectedClubId: offer.club.id,
    teamLevel: 'YOUTH',
    youthRole: offer.expectedRole,
    firstTeamRole: null,
    contract: null,
    professionalOffer: null,
    transferOffers: [],
    selectedTransferChoiceId: null,
    transferDecision: null,
    arrivalChoice: 'COACH',
    transferArrivalChoice: null,
    pendingCareerEvent: null,
    careerEventHistory: [],
    pendingConsequences: [],
    careerStory: createCareerStoryState(offer.club.id),
    trainingFocus: 'BALANCED',
    developmentApproach: null,
    trainingQualityBonus: 0,
    firstTeamProgress: createFirstTeamProgress(offer.club.id),
    cashEuro: 1_000,
    nationalTeam: {
      retired: false,
      currentRole: null,
      caps: 0,
      goals: 0,
      assists: 0,
      debutWindowIndex: null,
      history: [],
    },
    retirementReason: null,
    lastReport: null,
    history: [],
  }
}

function establishFirstTeamRole(
  state: GameState,
  role: NonNullable<GameState['firstTeamRole']>,
  windows = 0,
) {
  state.teamLevel = 'FIRST_TEAM'
  state.youthRole = null
  state.firstTeamRole = role
  state.history = Array.from({ length: windows }, (_, index) => ({
    windowIndex: state.windowIndex - windows + index,
    clubId: state.selectedClubId!,
    clubName: '测试俱乐部',
    role,
    stats: {
      appearances: 12,
      starts: role === 'STARTER' || role === 'CORE' ? 10 : 3,
      minutes: 720,
      goals: 2,
      assists: 2,
      yellowCards: 1,
      redCards: 0,
      averageRating: 6.9,
    },
    arrivalChoice: null,
    trainingFocus: 'BALANCED',
    developmentApproach: 'STEADY',
    endingAttributes: { ...state.player!.attributes },
    firstTeamAttention: 70,
    teamLevel: 'FIRST_TEAM' as const,
    clubSeason: null,
    honors: [],
  }))
}

function syncLastReportToLatestHistory(state: GameState) {
  const latest = state.history.at(-1)
  if (!latest) {
    state.lastReport = null
    return
  }
  state.lastReport = {
    clubId: latest.clubId,
    clubName: latest.clubName ?? '测试俱乐部',
    stats: latest.stats,
    honors: latest.honors ?? [],
    clubSeason: latest.clubSeason ?? null,
  } as NonNullable<GameState['lastReport']>
}

function establishProfessionalContract(state: GameState) {
  state.contract = {
    type: 'RENEWAL',
    clubId: state.selectedClubId!,
    remainingHalfYears: 4,
    annualSalaryEuro: 300_000,
    promisedTeamLevel: 'FIRST_TEAM',
    promisedRole: 'STARTER',
    releaseClauseEuro: null,
    clubOptionYears: 0,
    parentClubId: null,
    brokenPromiseWindows: 0,
  }
}

function establishFourthBatchState(
  mode: 'STRUGGLING' | 'STRONG' | 'NATIONAL' = 'STRUGGLING',
) {
  const state = createState(20)
  state.selectedClubId = 'ita_inter'
  state.careerStory = createCareerStoryState('ita_inter')
  establishFirstTeamRole(state, 'STARTER', 4)
  establishProfessionalContract(state)
  state.player!.squadRelation = 70
  state.player!.coachRelation = 70
  state.player!.fitness = 68
  const strong = mode === 'STRONG'
  const national = mode === 'NATIONAL'
  state.lastReport = {
    stats: {
      appearances: 12,
      starts: 8,
      minutes: 820,
      goals: strong ? 5 : 1,
      assists: strong ? 3 : 1,
      yellowCards: 1,
      redCards: 0,
      averageRating: strong ? 7.3 : 6.7,
    },
    nationalTeam: national
      ? {
          windowIndex: 20,
          calledUp: true,
          role: 'STARTER',
          competition: 'ASIAN_CUP',
          stage: 'GROUP_STAGE',
          appearances: 3,
          starts: 2,
          minutes: 210,
          goals: 0,
          assists: 1,
          averageRating: 6.6,
          selectionScore: 72,
          selectionBenchmark: 64,
          debut: false,
          summary: '国家队小组赛出局',
        }
      : null,
  } as NonNullable<GameState['lastReport']>
  return state
}

describe('career events', () => {
  it('skips the arrival window and deterministically selects the next event', () => {
    expect(selectCareerEvent(createState(0))).toBeNull()
    const first = selectCareerEvent(createState(1))
    const second = selectCareerEvent(createState(1))
    expect(first).not.toBeNull()
    expect(first).toBe(second)
  })

  it('keeps every registered event definition structurally valid', () => {
    expect(validateCareerEventDefinitions()).toEqual([])
    expect(CAREER_EVENTS).toHaveLength(84)
  })

  it('routes multi-stage events through valid setup choices', () => {
    const event = getCareerEvent('COACH_TACTICAL_MEETING')
    expect(event.interactionKind).toBe('DIALOGUE')
    expect(event.setup?.options).toHaveLength(2)
    expect(event.setup?.options[0]?.choiceIds).toEqual(['A', 'B'])
    expect(event.setup?.options[1]?.choiceIds).toEqual(['C', 'D'])
  })

  it('stops the captain review invitation after the player becomes captain', () => {
    const state = createState(12)
    state.careerStory.club.leadership = 'CAPTAIN'
    expect(getCareerEvent('CAPTAIN_VIDEO_REVIEW').isEligible(state)).toBe(false)
    expect(getCareerEvent('CAPTAIN_ARMBAND_OFFER').isEligible(state)).toBe(false)
  })

  it('never offers the captain armband to an 18-year-old substitute', () => {
    const state = createState(10)
    establishFirstTeamRole(state, 'SUBSTITUTE', 4)
    state.careerStory.club.leadership = 'CANDIDATE'
    state.careerStory.tendencies.leadership = 5
    state.player!.squadRelation = 90
    state.player!.coachRelation = 90

    expect(getCareerEvent('CAPTAIN_ARMBAND_OFFER').isEligible(state)).toBe(false)
  })

  it('offers the captain armband only to an established mature regular', () => {
    const state = createState(22)
    establishFirstTeamRole(state, 'STARTER', 4)
    state.careerStory.club.leadership = 'CANDIDATE'
    state.careerStory.tendencies.leadership = 2
    state.player!.squadRelation = 74
    state.player!.coachRelation = 68

    expect(getCareerEvent('CAPTAIN_ARMBAND_OFFER').isEligible(state)).toBe(true)
  })

  it('blocks senior match and leadership events for youth players', () => {
    const state = createState(12)
    state.player!.attributes.attack = 70
    state.player!.attributes.mental = 70

    expect(getCareerEvent('CAPTAIN_VIDEO_REVIEW').isEligible(state)).toBe(false)
    expect(getCareerEvent('PENALTY_SHOOTOUT_ORDER').isEligible(state)).toBe(false)
    expect(getCareerEvent('CUP_ROTATION_START').isEligible(state)).toBe(false)
  })

  it('does not let a substitute act as a senior mentor', () => {
    const state = createState(22)
    establishFirstTeamRole(state, 'SUBSTITUTE', 4)

    expect(getCareerEvent('YOUNG_TEAMMATE_MENTOR').isEligible(state)).toBe(false)

    establishFirstTeamRole(state, 'STARTER', 4)
    expect(getCareerEvent('YOUNG_TEAMMATE_MENTOR').isEligible(state)).toBe(true)
  })

  it('requires real national-team context for every national event', () => {
    const state = createState(20)
    establishFirstTeamRole(state, 'STARTER', 4)
    state.nationalTeam.history = [
      {
        windowIndex: 10,
        calledUp: true,
        role: 'STARTER',
        competition: 'ASIAN_CUP',
        stage: 'CHAMPION',
        appearances: 6,
        starts: 6,
        minutes: 500,
        goals: 2,
        assists: 1,
        averageRating: 7.2,
        selectionScore: 80,
        selectionBenchmark: 64,
        debut: true,
        summary: '旧国家队记录',
      },
    ]

    for (const event of CAREER_EVENTS.filter((entry) => entry.category === 'NATIONAL')) {
      expect(event.isEligible(state), event.id).toBe(false)
    }
  })

  it('applies cooldown across related events in the same story group', () => {
    const state = createState(20)
    state.careerEventHistory = [
      {
        eventId: 'TRANSFER_RUMOR',
        choiceId: 'A',
        windowIndex: 19,
        choiceTitle: '明确否认传闻',
        outcomeSummary: '测试记录',
        appliedDelta: {},
        cashDeltaEuro: 0,
      },
    ]

    expect(
      careerEventIsOnCooldown(
        state,
        getCareerEvent('DEADLINE_DAY_SPECULATION'),
      ),
    ).toBe(true)
  })

  it('prioritizes eligible events that have appeared least often', () => {
    const state = createState(20)
    const repeated = getCareerEvent('COACH_DEFENSIVE_TASK')
    const seenOnce = getCareerEvent('TEAMMATE_RIVALRY')
    const unseen = getCareerEvent('MEDIA_BREAKTHROUGH')
    state.careerEventHistory = [
      ...Array.from({ length: 3 }, (_, index) => ({
        eventId: repeated.id,
        choiceId: 'A',
        windowIndex: index + 1,
        choiceTitle: '测试',
        outcomeSummary: '测试',
        appliedDelta: {},
        cashDeltaEuro: 0,
      })),
      {
        eventId: seenOnce.id,
        choiceId: 'A',
        windowIndex: 4,
        choiceTitle: '测试',
        outcomeSummary: '测试',
        appliedDelta: {},
        cashDeltaEuro: 0,
      },
    ]

    expect(
      leastSeenCareerEventPool(state, [repeated, seenOnce, unseen]).map(
        (event) => event.id,
      ),
    ).toEqual([unseen.id])
  })

  it('does not repeat a seen event while unseen eligible events remain', () => {
    const state = createState(20)
    state.careerEventHistory = [
      {
        eventId: 'COACH_DEFENSIVE_TASK',
        choiceId: 'A',
        windowIndex: 15,
        choiceTitle: '测试',
        outcomeSummary: '测试',
        appliedDelta: {},
        cashDeltaEuro: 0,
      },
    ]
    const selected = selectCareerEvent(state)

    expect(selected).not.toBeNull()
    expect(selected).not.toBe('COACH_DEFENSIVE_TASK')
  })

  it('makes every new match-performance event reachable from real history', () => {
    const milestone = createState(20)
    establishFirstTeamRole(milestone, 'STARTER', 1)
    milestone.history.forEach((entry) => {
      entry.stats.averageRating = 7.3
      entry.stats.goals = 0
    })
    expect(getCareerEvent('FIRST_TEAM_DEBUT_REFLECTION').isEligible(milestone)).toBe(true)
    milestone.history[0]!.stats.goals = 2
    expect(getCareerEvent('FIRST_SENIOR_GOAL_REACTION').isEligible(milestone)).toBe(true)
    expect(getCareerEvent('FIRST_TEAM_DEBUT_REFLECTION').isEligible(milestone)).toBe(false)

    const sustained = createState(20)
    establishFirstTeamRole(sustained, 'STARTER', 2)
    sustained.history.forEach((entry) => {
      entry.stats.averageRating = 7.3
    })
    expect(getCareerEvent('SUSTAINED_HIGH_FORM').isEligible(sustained)).toBe(true)

    const drought = createState(20)
    establishFirstTeamRole(drought, 'STARTER', 2)
    drought.history.forEach((entry) => {
      entry.stats.goals = 0
    })
    expect(getCareerEvent('SCORING_DROUGHT_RESPONSE').isEligible(drought)).toBe(true)

    const substitute = createState(20)
    establishFirstTeamRole(substitute, 'SUBSTITUTE', 1)
    substitute.history[0]!.stats.goals = 2
    substitute.history[0]!.stats.averageRating = 7
    expect(getCareerEvent('IMPACT_SUBSTITUTE_RECOGNITION').isEligible(substitute)).toBe(true)
  })

  it('makes season-result events depend on recorded results and honors', () => {
    const state = createState(20)
    establishFirstTeamRole(state, 'STARTER', 2)
    state.history[1]!.honors = [
      {
        id: 'league-title',
        type: 'LEAGUE_TITLE',
        scope: 'CLUB',
        label: '测试联赛冠军',
        competitionLabel: '测试联赛',
        seasonLabel: '测试赛季',
        windowIndex: 19,
        clubId: state.selectedClubId,
        clubName: '测试俱乐部',
      },
      {
        id: 'cup-title',
        type: 'DOMESTIC_CUP',
        scope: 'CLUB',
        label: '测试杯赛冠军',
        competitionLabel: '测试杯赛',
        seasonLabel: '测试赛季',
        windowIndex: 19,
        clubId: state.selectedClubId,
        clubName: '测试俱乐部',
      },
    ]
    state.history[1]!.clubSeason = {
      seasonLabel: '测试赛季',
      leagueLabel: '测试联赛',
      leaguePosition: 2,
      leagueTeams: 16,
      domesticCupStage: 'RUNNER_UP',
      continentalLabel: null,
      continentalStage: 'NOT_ENTERED',
      summary: '测试赛季结果',
    }
    state.lastReport = {
      clubId: state.selectedClubId,
      clubName: '测试俱乐部',
      stats: {
        appearances: 16,
        starts: 14,
        minutes: 1_200,
        goals: 8,
        assists: 5,
        yellowCards: 1,
        redCards: 0,
        averageRating: 7.4,
      },
      honors: [
        {
          id: 'individual-award',
          type: 'TEAM_OF_SEASON',
          scope: 'INDIVIDUAL',
          label: '赛季最佳阵容',
          competitionLabel: '测试联赛',
          seasonLabel: '测试赛季',
          windowIndex: 19,
          clubId: state.selectedClubId,
          clubName: '测试俱乐部',
        },
      ],
      clubSeason: state.history[1]!.clubSeason,
    } as NonNullable<GameState['lastReport']>

    expect(getCareerEvent('FIRST_LEAGUE_TITLE_REACTION').isEligible(state)).toBe(true)
    expect(getCareerEvent('FIRST_CUP_TITLE_REACTION').isEligible(state)).toBe(true)
    expect(getCareerEvent('FINAL_DEFEAT_RESPONSE').isEligible(state)).toBe(true)
    expect(getCareerEvent('INDIVIDUAL_AWARD_REACTION').isEligible(state)).toBe(true)
    expect(getCareerEvent('STRONG_SEASON_WITHOUT_TROPHY').isEligible(state)).toBe(true)
  })

  it('makes career-stage events depend on appearances, tenure and transfers', () => {
    const veteran = createState(40)
    establishFirstTeamRole(veteran, 'ROTATION', 16)
    veteran.history.forEach((entry, index) => {
      entry.stats.appearances = index < 7 ? 0 : index === 15 ? 12 : 11
    })
    veteran.player!.clubAttachment = 75
    expect(getCareerEvent('FIRST_TEAM_100_APPEARANCES').isEligible(veteran)).toBe(true)
    expect(getCareerEvent('LONG_SERVICE_RECOGNITION').isEligible(veteran)).toBe(true)
    expect(getCareerEvent('VETERAN_ROLE_ADJUSTMENT').isEligible(veteran)).toBe(true)

    const returned = createState(24)
    establishFirstTeamRole(returned, 'STARTER', 4)
    returned.history.at(-1)!.clubId = 'other-club'
    returned.transferDecision = {
      kind: 'TRANSFER',
      fromClubId: 'other-club',
      toClubId: returned.selectedClubId!,
      arrivalChoice: 'LEADERS',
      cashSpentEuro: 0,
    }
    expect(getCareerEvent('RETURN_TO_FORMER_CLUB').isEligible(returned)).toBe(true)

    const farewell = createState(24)
    establishFirstTeamRole(farewell, 'STARTER', 10)
    const oldClubId = farewell.selectedClubId!
    farewell.selectedClubId = 'new-club'
    farewell.transferDecision = {
      kind: 'TRANSFER',
      fromClubId: oldClubId,
      toClubId: 'new-club',
      arrivalChoice: 'LEADERS',
      cashSpentEuro: 0,
    }
    expect(getCareerEvent('LONG_SERVICE_FAREWELL').isEligible(farewell)).toBe(true)
  })

  it('expires first-team debut and first-goal milestones after their real window', () => {
    const state = createState(20)
    establishFirstTeamRole(state, 'STARTER', 3)
    state.history[0]!.stats.goals = 2
    state.history[1]!.stats.goals = 0
    state.history[2]!.stats.goals = 0

    expect(getCareerEvent('FIRST_TEAM_DEBUT_REFLECTION').isEligible(state)).toBe(false)
    expect(getCareerEvent('FIRST_SENIOR_GOAL_REACTION').isEligible(state)).toBe(false)
  })

  it('does not let ordinary category balancing suppress a fresh milestone', () => {
    const state = createState(20)
    establishFirstTeamRole(state, 'STARTER', 1)
    state.history[0]!.stats.goals = 0
    state.careerEventHistory = [
      {
        eventId: 'FIRST_LEAGUE_TITLE_REACTION',
        choiceId: 'A',
        windowIndex: 15,
        choiceTitle: '测试',
        outcomeSummary: '测试',
        appliedDelta: {},
        cashDeltaEuro: 0,
      },
      {
        eventId: 'FIRST_CUP_TITLE_REACTION',
        choiceId: 'A',
        windowIndex: 17,
        choiceTitle: '测试',
        outcomeSummary: '测试',
        appliedDelta: {},
        cashDeltaEuro: 0,
      },
    ]

    expect(selectCareerEvent(state)).toBe('FIRST_TEAM_DEBUT_REFLECTION')
  })

  it('requires the first senior goal to be scored in the latest settled window', () => {
    const state = createState(20)
    establishFirstTeamRole(state, 'STARTER', 3)
    state.history[0]!.stats.goals = 0
    state.history[1]!.stats.goals = 2
    state.history[2]!.stats.goals = 0

    expect(getCareerEvent('FIRST_SENIOR_GOAL_REACTION').isEligible(state)).toBe(false)
    state.history[1]!.stats.goals = 0
    state.history[2]!.stats.goals = 2
    expect(getCareerEvent('FIRST_SENIOR_GOAL_REACTION').isEligible(state)).toBe(true)
  })

  it('shows domestic and overseas transfer-rumor responses in the right context', () => {
    const state = createState(20)
    establishProfessionalContract(state)
    state.player!.reputation = 50
    const event = getCareerEvent('TRANSFER_RUMOR')

    state.selectedClubId = 'cn_beijing_yuhua'
    state.contract!.clubId = state.selectedClubId
    state.careerStory = createCareerStoryState(state.selectedClubId)
    expect(eligibleCareerEventChoices(state, event).map((choice) => choice.id))
      .toEqual(['A', 'B', 'C'])

    state.selectedClubId = 'ita_inter'
    state.contract!.clubId = state.selectedClubId
    state.careerStory = createCareerStoryState(state.selectedClubId)
    state.player!.reputation = 50
    expect(eligibleCareerEventChoices(state, event).map((choice) => choice.id))
      .toEqual(['A', 'B', 'D'])
  })

  it('rejects a context-hidden choice during event resolution', () => {
    const state = createState(20)
    establishProfessionalContract(state)
    state.selectedClubId = 'ita_inter'
    state.contract!.clubId = state.selectedClubId
    state.careerStory = createCareerStoryState(state.selectedClubId)
    state.player!.reputation = 50

    expect(careerEventIsEligible(state, getCareerEvent('TRANSFER_RUMOR'))).toBe(true)
    expect(() => resolveCareerEventChoice({
      state,
      eventId: 'TRANSFER_RUMOR',
      choiceId: 'C',
    })).toThrow('选项不存在')
  })

  it('does not reuse the previous club report for current-club events after a transfer', () => {
    const state = createState(20)
    establishFirstTeamRole(state, 'STARTER', 2)
    syncLastReportToLatestHistory(state)
    state.lastReport!.stats.averageRating = 7.5
    state.selectedClubId = 'ita_inter'
    state.teamLevel = 'FIRST_TEAM'
    state.firstTeamRole = 'FRINGE'
    state.careerStory = createCareerStoryState(state.selectedClubId)

    expect(getCareerEvent('SUSTAINED_HIGH_FORM').isEligible(state)).toBe(false)
    expect(getCareerEvent('FAN_EXPECTATION_SURGE').isEligible(state)).toBe(false)
  })

  it('makes all fourth-batch events reachable from supported career state', () => {
    const struggling = establishFourthBatchState('STRUGGLING')
    const broadlyEligible = [
      'DRESSING_ROOM_DEFEAT_REVIEW',
      'PLAYER_COUNCIL_VOTE',
      'TEAMMATE_CONTRACT_TENSION',
      'OVERSEAS_COMMUNICATION_PLAN',
      'EARLY_SUBSTITUTION_REACTION',
      'TEMPORARY_TACTICAL_ROLE',
      'PROTECT_LEAD_OR_CHASE_STATS',
      'CONGESTED_SCHEDULE_PRIORITIES',
      'OLD_SOCIAL_POST_REVISITED',
      'TEAMMATE_RANKING_INTERVIEW',
      'SETTLE_IN_CURRENT_CITY',
      'THREE_YEAR_CAREER_DIRECTION',
    ] as const
    for (const eventId of broadlyEligible) {
      expect(getCareerEvent(eventId).isEligible(struggling), eventId).toBe(true)
    }

    const strong = establishFourthBatchState('STRONG')
    expect(getCareerEvent('FAN_EXPECTATION_SURGE').isEligible(strong)).toBe(true)

    const national = establishFourthBatchState('NATIONAL')
    expect(getCareerEvent('NATIONAL_ROLE_MISMATCH').isEligible(national)).toBe(true)
    expect(getCareerEvent('NATIONAL_DEFEAT_RESPONSE').isEligible(national)).toBe(true)
  })

  it('keeps player-council and overseas events realistic', () => {
    const teenager = createState(10)
    establishFirstTeamRole(teenager, 'SUBSTITUTE', 4)
    teenager.player!.squadRelation = 90
    expect(getCareerEvent('PLAYER_COUNCIL_VOTE').isEligible(teenager)).toBe(false)

    const established = establishFourthBatchState('STRONG')
    expect(getCareerEvent('PLAYER_COUNCIL_VOTE').isEligible(established)).toBe(true)
    expect(getCareerEvent('OVERSEAS_COMMUNICATION_PLAN').isEligible(established)).toBe(true)

    established.selectedClubId = 'cn_beijing_yuhua'
    expect(getCareerEvent('OVERSEAS_COMMUNICATION_PLAN').isEligible(established)).toBe(false)
  })

  it('changes the existing career-priority model without adding new save state', () => {
    const state = establishFourthBatchState('STRONG')
    const result = resolveCareerEventChoice({
      state,
      eventId: 'THREE_YEAR_CAREER_DIRECTION',
      choiceId: 'B',
    })

    expect(result.player.priorities).toEqual([
      'COMPETITIVE_LEVEL',
      'PLAYING_TIME',
      'STABILITY',
      'SALARY',
    ])
    expect(result.player.priorityValues).toEqual({
      COMPETITIVE_LEVEL: 85,
      PLAYING_TIME: 70,
      STABILITY: 55,
      SALARY: 40,
    })
    expect(validateGameState({ ...state, player: result.player }).player?.priorities)
      .toEqual(result.player.priorities)
  })

  it('gives simultaneously eligible fourth-batch events similar draw rates', () => {
    const fourthBatchIds = new Set([
      'DRESSING_ROOM_DEFEAT_REVIEW',
      'PLAYER_COUNCIL_VOTE',
      'TEAMMATE_CONTRACT_TENSION',
      'OVERSEAS_COMMUNICATION_PLAN',
      'EARLY_SUBSTITUTION_REACTION',
      'TEMPORARY_TACTICAL_ROLE',
      'PROTECT_LEAD_OR_CHASE_STATS',
      'CONGESTED_SCHEDULE_PRIORITIES',
      'OLD_SOCIAL_POST_REVISITED',
      'TEAMMATE_RANKING_INTERVIEW',
      'SETTLE_IN_CURRENT_CITY',
      'THREE_YEAR_CAREER_DIRECTION',
    ])
    const counts = new Map<string, number>()
    const baseState = establishFourthBatchState('STRUGGLING')

    for (let sample = 0; sample < 10_000; sample += 1) {
      const state = {
        ...baseState,
        careerSeed: `fourth-batch-distribution-${sample}`,
      }
      const eventId = selectCareerEvent(state)
      if (eventId && fourthBatchIds.has(eventId)) {
        counts.set(eventId, (counts.get(eventId) ?? 0) + 1)
      }
    }

    expect(counts.size).toBe(fourthBatchIds.size)
    const appearances = [...counts.values()]
    expect(Math.min(...appearances) / Math.max(...appearances)).toBeGreaterThan(0.65)
  })

  it('makes all fifth-batch events reachable only from supported facts', () => {
    const roleLost = createState(20)
    establishFirstTeamRole(roleLost, 'STARTER', 2)
    roleLost.history[1]!.role = 'ROTATION'
    expect(getCareerEvent('STARTING_ROLE_LOST').isEligible(roleLost)).toBe(true)
    roleLost.history[0]!.role = 'ROTATION'
    expect(getCareerEvent('STARTING_ROLE_LOST').isEligible(roleLost)).toBe(false)

    const roleSecured = createState(20)
    establishFirstTeamRole(roleSecured, 'ROTATION', 2)
    roleSecured.history[1]!.role = 'STARTER'
    expect(getCareerEvent('FIRST_TEAM_ROLE_SECURED').isEligible(roleSecured)).toBe(true)
    roleSecured.history[0]!.role = 'STARTER'
    expect(getCareerEvent('FIRST_TEAM_ROLE_SECURED').isEligible(roleSecured)).toBe(false)

    const eliteFringe = createState(20)
    eliteFringe.selectedClubId = 'ita_inter'
    eliteFringe.careerStory = createCareerStoryState('ita_inter')
    establishFirstTeamRole(eliteFringe, 'FRINGE', 2)
    eliteFringe.history.forEach((entry) => { entry.stats.appearances = 4 })
    expect(getCareerEvent('ELITE_CLUB_FRINGE_REVIEW').isEligible(eliteFringe)).toBe(true)
    eliteFringe.selectedClubId = 'cn_beijing_yuhua'
    expect(getCareerEvent('ELITE_CLUB_FRINGE_REVIEW').isEligible(eliteFringe)).toBe(false)

    const senior = createState(20)
    establishFirstTeamRole(senior, 'STARTER', 4)
    senior.player!.coachRelation = 55
    senior.player!.squadRelation = 75
    senior.player!.reputation = 65
    senior.player!.mediaRelation = 65
    expect(getCareerEvent('CORE_TACTICAL_DISAGREEMENT').isEligible(senior)).toBe(true)
    senior.firstTeamRole = 'SUBSTITUTE'
    senior.history.at(-1)!.role = 'SUBSTITUTE'
    expect(getCareerEvent('CORE_TACTICAL_DISAGREEMENT').isEligible(senior)).toBe(false)

    senior.firstTeamRole = 'STARTER'
    senior.history.at(-1)!.role = 'STARTER'
    senior.careerStory.club.leadership = 'CAPTAIN'
    expect(getCareerEvent('CAPTAIN_PUBLIC_CONFLICT').isEligible(senior)).toBe(true)
    senior.careerStory.club.leadership = 'NONE'
    expect(getCareerEvent('CAPTAIN_PUBLIC_CONFLICT').isEligible(senior)).toBe(false)

    senior.careerStory.club.rivalry = 'HOSTILE'
    expect(getCareerEvent('RIVALRY_CROSSROADS').isEligible(senior)).toBe(true)
    senior.careerStory.club.rivalry = 'HEALTHY'
    expect(getCareerEvent('RIVALRY_CROSSROADS').isEligible(senior)).toBe(false)

    senior.careerStory.club.mentorship = 'MENTOR'
    expect(getCareerEvent('MENTEE_BREAKTHROUGH').isEligible(senior)).toBe(true)
    senior.careerStory.club.mentorship = 'NONE'
    expect(getCareerEvent('MENTEE_BREAKTHROUGH').isEligible(senior)).toBe(false)

    syncLastReportToLatestHistory(senior)
    senior.lastReport!.stats.yellowCards = 5
    expect(getCareerEvent('DISCIPLINE_AFFECTS_SELECTION').isEligible(senior)).toBe(true)
    senior.lastReport!.stats.yellowCards = 1
    expect(getCareerEvent('DISCIPLINE_AFFECTS_SELECTION').isEligible(senior)).toBe(false)

    senior.careerStory.tendencies.clutch = 3
    expect(getCareerEvent('CLUTCH_EXPECTATION_PRESSURE').isEligible(senior)).toBe(true)
    senior.careerStory.tendencies.clutch = 2
    expect(getCareerEvent('CLUTCH_EXPECTATION_PRESSURE').isEligible(senior)).toBe(false)

    senior.history.at(-2)!.stats.averageRating = 6.4
    senior.history.at(-1)!.stats.averageRating = 7.4
    expect(getCareerEvent('FORM_REBOUND_WINDOW').isEligible(senior)).toBe(true)
    senior.history.at(-2)!.stats.averageRating = 6.9
    expect(getCareerEvent('FORM_REBOUND_WINDOW').isEligible(senior)).toBe(false)

    senior.careerStory.publicPersona = 'TEAM_FIRST'
    expect(getCareerEvent('TEAM_SPOKESPERSON_REQUEST').isEligible(senior)).toBe(true)
    senior.player!.squadRelation = 50
    expect(getCareerEvent('TEAM_SPOKESPERSON_REQUEST').isEligible(senior)).toBe(false)

    senior.careerStory.publicPersona = 'LOW_KEY'
    expect(getCareerEvent('LOW_KEY_COMMERCIAL_EXPOSURE').isEligible(senior)).toBe(true)
    senior.careerStory.publicPersona = 'NEUTRAL'
    expect(getCareerEvent('LOW_KEY_COMMERCIAL_EXPOSURE').isEligible(senior)).toBe(false)

    senior.careerStory.publicPersona = 'OUTSPOKEN'
    expect(getCareerEvent('OUTSPOKEN_PERSONA_REVIEW').isEligible(senior)).toBe(true)
    senior.careerStory.publicPersona = 'NEUTRAL'
    expect(getCareerEvent('OUTSPOKEN_PERSONA_REVIEW').isEligible(senior)).toBe(false)

    senior.selectedClubId = 'ita_inter'
    senior.careerStory = createCareerStoryState('ita_inter')
    senior.player!.reputation = 65
    senior.cashEuro = 80_000
    expect(getCareerEvent('HOMETOWN_CHARITY_INVITATION').isEligible(senior)).toBe(true)
    expect(eligibleCareerEventChoices(
      senior,
      getCareerEvent('HOMETOWN_CHARITY_INVITATION'),
    ).map((choice) => choice.id)).toEqual(['A', 'B', 'C'])
    senior.cashEuro = 30_000
    expect(eligibleCareerEventChoices(
      senior,
      getCareerEvent('HOMETOWN_CHARITY_INVITATION'),
    ).map((choice) => choice.id)).toEqual(['B', 'C'])
    senior.cashEuro = 20_000
    expect(getCareerEvent('HOMETOWN_CHARITY_INVITATION').isEligible(senior)).toBe(false)

    const veteran = createState(36)
    establishFirstTeamRole(veteran, 'STARTER', 2)
    establishProfessionalContract(veteran)
    veteran.contract!.remainingHalfYears = 2
    expect(getCareerEvent('FINAL_MAJOR_CONTRACT_PRIORITIES').isEligible(veteran)).toBe(true)
    veteran.contract!.remainingHalfYears = 3
    expect(getCareerEvent('FINAL_MAJOR_CONTRACT_PRIORITIES').isEligible(veteran)).toBe(false)
  })

  it('ties fifth-batch national and Ballon dOr milestones to the exact window', () => {
    const state = createState(20)
    establishFirstTeamRole(state, 'STARTER', 2)
    syncLastReportToLatestHistory(state)
    const national = {
      windowIndex: 19,
      calledUp: true,
      role: 'STARTER' as const,
      competition: 'INTERNATIONAL_WINDOW' as const,
      stage: null,
      appearances: 1,
      starts: 1,
      minutes: 90,
      goals: 1,
      assists: 0,
      averageRating: 7.2,
      selectionScore: 75,
      selectionBenchmark: 65,
      debut: false,
      summary: '国家队比赛',
    }
    state.nationalTeam.history = [national]
    state.lastReport!.nationalTeam = national
    expect(getCareerEvent('FIRST_NATIONAL_GOAL_REACTION').isEligible(state)).toBe(true)

    state.windowIndex = 21
    expect(getCareerEvent('FIRST_NATIONAL_GOAL_REACTION').isEligible(state)).toBe(false)

    state.windowIndex = 20
    const priorNational = { ...national, windowIndex: 18, appearances: 49, goals: 0 }
    state.nationalTeam.history = [priorNational, national]
    expect(getCareerEvent('NATIONAL_FIFTY_CAPS').isEligible(state)).toBe(true)

    const ballon = {
      id: 'ballon-test',
      type: 'BALLON_DOR' as const,
      scope: 'INDIVIDUAL' as const,
      label: '金球奖',
      competitionLabel: '金球奖',
      seasonLabel: '测试赛季',
      windowIndex: 19,
      clubId: state.selectedClubId,
      clubName: '测试俱乐部',
    }
    state.history.at(-1)!.honors = [ballon]
    state.lastReport!.honors = [ballon]
    expect(getCareerEvent('FIRST_BALLON_DOR_NIGHT').isEligible(state)).toBe(true)
    expect(getCareerEvent('INDIVIDUAL_AWARD_REACTION').isEligible(state)).toBe(false)
    expect(selectCareerEvent(state)).toBe('FIRST_BALLON_DOR_NIGHT')
  })

  it('keeps every visible random outcome normalized to one hundred percent', () => {
    for (const event of CAREER_EVENTS) {
      for (const choice of event.choices) {
        if (!choice.outcomes) continue
        expect(
          choice.outcomes.reduce((total, outcome) => total + outcome.weight, 0),
          `${event.id}/${choice.id}`,
        ).toBe(100)
      }
    }
  })

  it('applies an event choice and records the exact outcome', () => {
    const state = createState(1)
    const eventId = selectCareerEvent(state)!
    const event = getCareerEvent(eventId)
    const before = structuredClone(state.player!)
    const result = resolveCareerEventChoice({
      state,
      eventId,
      choiceId: 'A',
    })

    expect(result.record.eventId).toBe(eventId)
    expect(result.record.choiceTitle).toBe(event.choices[0]!.title)
    expect(result.player).not.toEqual(before)
    expect(result.cashEuro).toBeGreaterThanOrEqual(0)
  })

  it('restores the same pending event from a version 11 save', () => {
    const state = createState(1)
    const pendingCareerEventId = selectCareerEvent(state)!
    const restored = validateGameState({
      ...state,
      phase: 'SPECIAL_EVENT',
      pendingCareerEvent: {
        eventId: pendingCareerEventId,
        interactionKind: 'CHOICE',
        stepIndex: 0,
        selections: [],
        variantId: null,
      },
    })

    expect(restored.phase).toBe('SPECIAL_EVENT')
    expect(restored.pendingCareerEvent?.eventId).toBe(pendingCareerEventId)
  })

  it('caps event spending at available cash', () => {
    const state = { ...createState(2), cashEuro: 500 }
    const result = resolveCareerEventChoice({
      state,
      eventId: 'DRESSING_ROOM_DISPUTE',
      choiceId: 'C',
    })

    expect(result.cashEuro).toBe(0)
    expect(result.record.cashDeltaEuro).toBe(-500)
  })

  it('persists and consumes a delayed consequence in the next window', () => {
    const state = createState(2)
    const result = resolveCareerEventChoice({
      state,
      eventId: 'COACH_DEFENSIVE_TASK',
      choiceId: 'A',
    })
    expect(result.consequence?.applyAtWindow).toBe(3)

    const nextState: GameState = {
      ...state,
      windowIndex: 3,
      player: result.player,
      pendingConsequences: [result.consequence!],
    }
    const consumed = consumeCareerConsequences(nextState)

    expect(consumed.pendingConsequences).toEqual([])
    expect(consumed.appliedDelta.coachRelation).toBeGreaterThan(0)
    expect(consumed.trainingBonus).toBe(1)
    expect(consumed.summaries).toHaveLength(1)
  })

  it('keeps random outcomes deterministic for the same save and choice', () => {
    const state = createState(6)
    const first = resolveCareerEventChoice({
      state,
      eventId: 'MEDIA_BREAKTHROUGH',
      choiceId: 'B',
    })
    const second = resolveCareerEventChoice({
      state,
      eventId: 'MEDIA_BREAKTHROUGH',
      choiceId: 'B',
    })

    expect(first.record.outcomeLabel).toBeTruthy()
    expect(first.record).toEqual(second.record)
    expect(first.consequences).toEqual(second.consequences)
  })

  it('records compact story tendencies without changing the visible event flow', () => {
    const result = resolveCareerEventChoice({
      state: createState(4),
      eventId: 'CAPTAIN_VIDEO_REVIEW',
      choiceId: 'A',
    })

    expect(result.careerStory.tendencies.leadership).toBe(1)
    expect(result.careerStory.tendencies.professionalism).toBe(1)
    expect(result.record.storyEffect).toBeDefined()
  })

  it('does not let a negative event push a relationship below 35', () => {
    const state = createState(4)
    state.player!.squadRelation = 36
    const result = resolveCareerEventChoice({
      state,
      eventId: 'CAPTAIN_VIDEO_REVIEW',
      choiceId: 'C',
    })

    expect(result.player.squadRelation).toBe(35)
    expect(result.record.appliedDelta.squadRelation).toBe(-1)
  })

  it('keeps injury events as informed three-way decisions', () => {
    const event = getCareerEvent('KEY_MATCH_PAIN')
    expect(event.choices).toHaveLength(3)
    expect(event.choices.map((choice) => choice.title)).toEqual([
      '立即报告队医',
      '申请限制出场时间',
      '咬牙踢满全场',
    ])

    const result = resolveCareerEventChoice({
      state: createState(4),
      eventId: 'KEY_MATCH_PAIN',
      choiceId: 'B',
    })
    expect(result.record.outcomeLabel).toBeTruthy()
    expect(event.choices.every((choice) => !choice.delayed)).toBe(true)
    expect(
      event.choices.every((choice) =>
        choice.outcomes?.every((outcome) => !outcome.delayed) ?? true,
      ),
    ).toBe(true)
  })

  it('forbids delayed consequences in every health event', () => {
    for (const event of CAREER_EVENTS.filter((entry) => entry.category === 'HEALTH')) {
      expect(event.choices.every((choice) => !choice.delayed)).toBe(true)
      expect(
        event.choices.every((choice) =>
          choice.outcomes?.every((outcome) => !outcome.delayed) ?? true,
        ),
      ).toBe(true)
    }
  })

  it('keeps the full-career ordinary-event rate close to 70 percent', () => {
    let eligibleWindows = 0
    let eventWindows = 0

    for (let career = 0; career < 500; career += 1) {
      let state = {
        ...createState(1),
        careerSeed: `event-frequency-${career}`,
      }
      for (let windowIndex = 1; windowIndex <= 53; windowIndex += 1) {
        state = {
          ...state,
          windowIndex,
          transferDecision:
            windowIndex % 6 === 0
              ? {
                  kind: 'STAY' as const,
                  fromClubId: state.selectedClubId!,
                  toClubId: state.selectedClubId!,
                  arrivalChoice: null,
                  cashSpentEuro: 0,
                }
              : null,
        }
        eligibleWindows += 1
        const eventId = selectCareerEvent(state)
        if (!eventId) continue
        eventWindows += 1
        state = {
          ...state,
          careerEventHistory: [
            ...state.careerEventHistory,
            {
              eventId,
              choiceId: 'A',
              windowIndex,
              choiceTitle: '频率测试',
              outcomeSummary: '频率测试',
              appliedDelta: {},
              cashDeltaEuro: 0,
            },
          ],
        }
      }
    }

    const rate = eventWindows / eligibleWindows
    expect(rate).toBeGreaterThan(0.68)
    expect(rate).toBeLessThan(0.72)
  })

  it('keeps a full event history comfortably below the 200KB save budget', () => {
    const state = createState(53)
    const eventId = 'CAPTAIN_VIDEO_REVIEW' as const
    const careerEventHistory = Array.from({ length: 54 }, (_, windowIndex) => ({
      eventId,
      choiceId: 'A',
      windowIndex,
      choiceTitle: '主动承担分析',
      outcomeSummary: '你完成了这次职业选择，结果已经写入本窗口档案。',
      appliedDelta: { squadRelation: 3, morale: 1 },
      cashDeltaEuro: 0,
      storyEffect: { tendencyDelta: { leadership: 1 } },
    }))

    const bytes = new TextEncoder().encode(
      JSON.stringify({ ...state, careerEventHistory }),
    ).byteLength
    expect(bytes).toBeLessThan(200 * 1024)
  })
})
