import type { CareerEventDefinition } from '../engine/careerEvents'
import type { GameState, Position } from '../models/game'
import type { PendingKeyMatchMoment } from '../models/keyMatchMoment'
import assets from './sceneAssets.json'
import mappings from './sceneMappings.json'

export interface SceneIllustration {
  id: string
  src: string
  width: number
  height: number
  kind: 'match' | 'event'
}
interface EventMapping {
  id: string; variantKey: string; title: string; description: string; artId: string
  chain?: { chainId: string; firstEventId: string; firstChoiceId: string; clubRelation: string; activeFollowupId: string }
}
export const APPROVED_EVENT_CONTEXTS: readonly EventMapping[] = mappings.eventContexts
export const APPROVED_MATCH_SCENES = mappings.matches
export const SCENE_ASSETS: Readonly<Record<string, SceneIllustration>> = assets as Record<string, SceneIllustration>

/** No generated choices/results are inspected. Unknown saved scene revisions stay text-only. */
export function resolveMatchIllustration(
  moment: Pick<PendingKeyMatchMoment, 'templateId' | 'templateRevision' | 'title' | 'scene'>,
  primaryPosition: Position,
): SceneIllustration | null {
  const approved = APPROVED_MATCH_SCENES.find(scene => scene.id === moment.templateId &&
    scene.revision === moment.templateRevision && scene.title === moment.title &&
    scene.scene === moment.scene && scene.positions.includes(primaryPosition))
  return approved ? SCENE_ASSETS[approved.artId] ?? null : null
}

/** Match resolved semantics, not just the event ID (modern and legacy bottles share an ID).
 * Follow-ups additionally require their saved originating choice, club relation and real window.
 * The same approved pre-decision art applies to both dialogue steps and funding-visible choices.
 */
export function resolveCareerEventIllustration(
  event: Pick<CareerEventDefinition, 'id' | 'title' | 'description'>,
  game: GameState,
): SceneIllustration | null {
  for (const mapping of APPROVED_EVENT_CONTEXTS) {
    if (mapping.id !== event.id || mapping.title !== event.title) continue
    let expectedDescription = mapping.description
    if (mapping.chain) {
      const source = game.entertainmentV3?.stories.activeChain
      if (!source || source.chainId !== mapping.chain.chainId ||
        source.firstEventId !== mapping.chain.firstEventId || source.firstChoiceId !== mapping.chain.firstChoiceId ||
        source.followupEventId !== mapping.chain.activeFollowupId ||
        game.windowIndex < source.firstWindowIndex + 1 || game.windowIndex > source.firstWindowIndex + 3 ||
        (source.clubId === game.selectedClubId ? 'same-club' : 'moved-club') !== mapping.chain.clubRelation) continue
      expectedDescription = expectedDescription.replace('{source.clubName}', source.clubName)
    }
    if (expectedDescription === event.description) return SCENE_ASSETS[mapping.artId] ?? null
  }
  return null
}
