import type {
  CareerPriority,
  CreationDraft,
  Position,
} from '../../models/game'
import { SECONDARY_POSITIONS } from '../../data/balance'

export const defaultPriorities: CareerPriority[] = [
  'PLAYING_TIME',
  'COMPETITIVE_LEVEL',
  'SALARY',
  'STABILITY',
]

export function createDraft(position: Position = 'ST'): CreationDraft {
  return {
    name: '林致远',
    jerseyNumber: 10,
    preferredFoot: 'RIGHT',
    primaryPosition: position,
    secondaryPosition: SECONDARY_POSITIONS[position][0]!,
    priorities: [...defaultPriorities],
    overseasIntent: 'CONDITIONAL',
    preferredLeagues: ['英格兰'],
  }
}
