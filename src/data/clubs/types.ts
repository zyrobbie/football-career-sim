export type ClubPlatformTier = 1 | 2 | 3 | 4 | 5 | 6

export interface ClubParametersV1 {
  id: string
  workbookId: string
  country: string
  league: string
  divisionLevel: 1 | 2
  name: string
  platformTier: ClubPlatformTier
  facility: number
  academy: number
  wage: number
  exposure: number
  firstTeamThreshold: number
  youthPlayerPreference: number
  sourceId: string
}

export type ClubTrainingTeamLevel = 'YOUTH' | 'FIRST_TEAM'

export interface ClubTrainingQuality {
  youth: number
  firstTeam: number
}
