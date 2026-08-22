import { CLUBS } from '../data/balance'
import { careerWindowLabel } from '../engine/careerTime'
import type { Club, GameState } from '../models/game'
import { visibleCareerWindowIndex } from '../ui/careerView'
import { Icon } from './Icons'

export function currentCareerClub(game: GameState): Club | null {
  if (!game.selectedClubId) return null
  return CLUBS.find((club) => club.id === game.selectedClubId) ??
    game.academyOffers.find((offer) => offer.club.id === game.selectedClubId)?.club ??
    null
}

export function CareerTopbar({
  game,
  sectionLabel,
}: {
  game: GameState
  sectionLabel: string
}) {
  const windowIndex = visibleCareerWindowIndex(game)
  const currentClub = currentCareerClub(game)
  const clubName = currentClub
    ? `${currentClub.name}${game.teamLevel === 'FIRST_TEAM' ? '一线队' : '青年队'}`
    : null
  const windowLabel = careerWindowLabel(game.startYear, windowIndex)

  return (
    <>
      <span className="topbar__time">
        <Icon name="calendar" />
        <span className="topbar__label--full">{windowLabel}窗口</span>
        <span className="topbar__label--compact">
          {windowLabel.replace('年', '').replace('季', '')}
        </span>
      </span>
      <span className="topbar__save-state">
        <i aria-hidden="true" />
        <span className="topbar__label--full">自动保存中</span>
        <span className="topbar__label--compact">已保存</span>
      </span>
      <span className="topbar__context">
        <span className="topbar__label--full">
          {clubName ? `当前俱乐部：${clubName}` : sectionLabel}
        </span>
        <span className="topbar__label--compact">
          {currentClub ? currentClub.name : sectionLabel}
        </span>
      </span>
    </>
  )
}
