import { matchHonorVisual } from '../data/honors/honorVisualRegistry'
import type { CareerHonor } from '../models/game'

export interface AggregatedCareerHonor {
  readonly key: string
  readonly scope: CareerHonor['scope']
  readonly type: CareerHonor['type']
  readonly competitionLabel: string
  readonly displayLabel: string
  readonly count: number
  readonly seasons: readonly string[]
  readonly clubId: string | null
  readonly visualKey: string | null
  readonly fallbackMark: string
}

function aggregationKey(honor: CareerHonor): string {
  return [honor.scope, honor.type, honor.competitionLabel].join('|')
}

function orderedHonors(honors: readonly CareerHonor[]): CareerHonor[] {
  return [...honors].sort((left, right) => (
    left.windowIndex - right.windowIndex
    || left.seasonLabel.localeCompare(right.seasonLabel, 'zh-Hans-CN')
    || left.id.localeCompare(right.id)
  ))
}

/** Groups only display data; it never mutates persisted honors or their seasons. */
export function aggregateCareerHonors(honors: readonly CareerHonor[]): readonly AggregatedCareerHonor[] {
  const groups = new Map<string, CareerHonor[]>()
  for (const honor of orderedHonors(honors)) {
    const key = aggregationKey(honor)
    const group = groups.get(key)
    if (group) group.push(honor)
    else groups.set(key, [honor])
  }
  return Object.freeze([...groups.entries()]
    .map(([key, group]) => {
      const first = group[0]!
      const visual = matchHonorVisual(first)
      return Object.freeze({
        key,
        scope: first.scope,
        type: first.type,
        competitionLabel: first.competitionLabel,
        displayLabel: visual.displayLabel,
        count: group.length,
        seasons: Object.freeze(group.map((item) => item.seasonLabel)),
        clubId: first.scope === 'CLUB' ? first.clubId : null,
        visualKey: visual.visual?.key ?? null,
        fallbackMark: visual.fallbackMark,
      })
    })
    .sort((left, right) => (
      left.scope.localeCompare(right.scope)
      || left.displayLabel.localeCompare(right.displayLabel, 'zh-Hans-CN')
      || left.key.localeCompare(right.key)
    )))
}

export function aggregateClubCareerHonors(
  honors: readonly CareerHonor[],
  clubId: string,
): readonly AggregatedCareerHonor[] {
  return aggregateCareerHonors(honors.filter((honor) => honor.scope === 'CLUB' && honor.clubId === clubId))
}
