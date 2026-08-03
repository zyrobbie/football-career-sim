import { CareerHub } from '../components/CareerHub'
import { Icon, type IconName } from '../components/Icons'
import { careerWindowLabel } from '../engine/careerTime'
import { getCareerEvent } from '../engine/careerEvents'
import type {
  CareerEventCategory,
  CareerEventChoiceId,
  PlayerEventDelta,
} from '../models/game'
import { useGameStore } from '../store/gameStore'

const categoryIcons: Record<CareerEventCategory, IconName> = {
  COACH: 'coach',
  TEAM: 'team',
  MEDIA: 'fans',
  HEALTH: 'physical',
  CONTRACT: 'career',
}

const deltaLabels: Record<string, string> = {
  attack: '进攻',
  defense: '防守',
  physical: '身体能力',
  mental: '心理能力',
  form: '竞技状态',
  fitness: '身体状态',
  morale: '心理状态',
  coachRelation: '教练关系',
  squadRelation: '队内关系',
  agentRelation: '经纪人关系',
  fanRelation: '球迷关系',
  mediaRelation: '媒体关系',
  reputation: '知名度',
  clubAttachment: '俱乐部认同',
}

function deltaEntries(delta: PlayerEventDelta): Array<[string, number]> {
  const entries: Array<[string, number]> = []
  for (const [key, value] of Object.entries(delta.attributes ?? {})) {
    if (value) entries.push([deltaLabels[key] ?? key, value])
  }
  for (const [key, value] of Object.entries(delta)) {
    if (key !== 'attributes' && typeof value === 'number' && value !== 0) {
      entries.push([deltaLabels[key] ?? key, value])
    }
  }
  return entries
}

export function SpecialEventScreen() {
  const game = useGameStore((state) => state.game)
  const chooseCareerEvent = useGameStore(
    (state) => state.chooseCareerEvent,
  )
  const continueAfterCareerEvent = useGameStore(
    (state) => state.continueAfterCareerEvent,
  )
  if (!game?.player || !game.pendingCareerEventId) return null
  const event = getCareerEvent(game.pendingCareerEventId)
  const windowLabel = careerWindowLabel(game.startYear, game.windowIndex)
  const isResult = game.phase === 'SPECIAL_EVENT_RESULT'
  const record = isResult ? game.careerEventHistory.at(-1) : null
  const changes = record ? deltaEntries(record.appliedDelta) : []

  return (
    <CareerHub game={game} sectionLabel="特殊事件">
      <section className="special-event" aria-labelledby="special-event-title">
        <header className="career-panel-heading">
          <Icon name={categoryIcons[event.category]} />
          <h1 id="special-event-title">{event.title}</h1>
          <span>{windowLabel} · {event.eyebrow}</span>
        </header>
        {isResult && record ? (
          <div className="special-event__reveal" aria-live="polite">
            <span className="special-event__reveal-label">
              {record.outcomeLabel ?? '选择已生效'}
            </span>
            <h2>{record.choiceTitle}</h2>
            <p>{record.outcomeSummary}</p>
            <div className="special-event__deltas" aria-label="本次精确变化">
              {changes.length ? changes.map(([label, value]) => (
                <span key={label} className={value > 0 ? 'is-positive' : 'is-negative'}>
                  {label} {value > 0 ? '+' : ''}{value}
                </span>
              )) : <span>本次没有即时数值变化</span>}
              {record.cashDeltaEuro !== 0 ? (
                <span className={record.cashDeltaEuro > 0 ? 'is-positive' : 'is-negative'}>
                  现金 {record.cashDeltaEuro > 0 ? '+' : ''}€{record.cashDeltaEuro.toLocaleString()}
                </span>
              ) : null}
            </div>
            <button
              className="primary-button special-event__continue"
              type="button"
              onClick={continueAfterCareerEvent}
            >
              进入本窗口结算 <Icon name="arrow" />
            </button>
          </div>
        ) : (
          <>
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
              概率与范围会提前显示；结果由本局种子固定，刷新不会重新抽取。
            </p>
          </>
        )}
      </section>
    </CareerHub>
  )
}
