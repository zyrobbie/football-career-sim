import { CareerHub } from '../components/CareerHub'
import { Icon, type IconName } from '../components/Icons'
import { careerWindowLabel } from '../engine/careerTime'
import { getCareerEvent } from '../engine/careerEvents'
import type {
  CareerEventCategory,
  CareerEventChoiceId,
} from '../models/game'
import { useGameStore } from '../store/gameStore'

const categoryIcons: Record<CareerEventCategory, IconName> = {
  COACH: 'coach',
  TEAM: 'team',
  MEDIA: 'fans',
  HEALTH: 'physical',
  CONTRACT: 'career',
}

export function SpecialEventScreen() {
  const game = useGameStore((state) => state.game)
  const chooseCareerEvent = useGameStore(
    (state) => state.chooseCareerEvent,
  )
  if (!game?.player || !game.pendingCareerEventId) return null
  const event = getCareerEvent(game.pendingCareerEventId)
  const windowLabel = careerWindowLabel(game.startYear, game.windowIndex)

  return (
    <CareerHub game={game} sectionLabel="特殊事件">
      <section className="special-event" aria-labelledby="special-event-title">
        <header className="career-panel-heading">
          <Icon name={categoryIcons[event.category]} />
          <h1 id="special-event-title">{event.title}</h1>
          <span>{windowLabel} · {event.eyebrow}</span>
        </header>
        <p className="career-panel-lead">{event.description}</p>
        <div
          className="special-event__choices"
          role="group"
          aria-label="特殊事件选择"
        >
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() =>
                chooseCareerEvent(choice.id as CareerEventChoiceId)
              }
            >
              <span>{choice.id}</span>
              <strong>{choice.title}</strong>
              <small>{choice.description}</small>
              <em>{choice.effectPreview}</em>
              <Icon name="arrow" />
            </button>
          ))}
        </div>
        <p className="special-event__note">
          <Icon name="info" />
          选择会与本窗口训练、比赛一并结算；部分后果将在下一窗口出现。
        </p>
      </section>
    </CareerHub>
  )
}
