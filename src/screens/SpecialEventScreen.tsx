import { CareerHub } from '../components/CareerHub'
import { Icon, type IconName } from '../components/Icons'
import { careerWindowLabel } from '../engine/careerTime'
import {
  eligibleCareerEventChoices,
  getCareerEvent,
} from '../engine/careerEvents'
import type {
  CareerEventCategory,
  CareerEventChoiceId,
  PlayerEventDelta,
} from '../models/game'
import { useGameStore } from '../store/gameStore'

const categoryIcons: Record<CareerEventCategory, IconName> = {
  COACH: 'coach',
  TEAM: 'team',
  MATCH: 'career',
  MEDIA: 'fans',
  HEALTH: 'physical',
  CONTRACT: 'career',
  NATIONAL: 'career',
  MILESTONE: 'career',
}

const interactionLabels = {
  CHOICE: '直接选择',
  DIALOGUE: '两步对话',
  RISK: '可见概率',
  ALLOCATION: '资源分配',
  RANKING: '优先级排序',
  PERSON_TONE: '对象与语气',
} as const

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
  if (!game?.player || !game.pendingCareerEvent) return null
  const event = getCareerEvent(game.pendingCareerEvent.eventId)
  const windowLabel = careerWindowLabel(game.startYear, game.windowIndex)
  const isResult = game.phase === 'SPECIAL_EVENT_RESULT'
  const record = isResult ? game.careerEventHistory.at(-1) : null
  const changes = record ? deltaEntries(record.appliedDelta) : []
  const setup = event.setup
  const isSetupStep = Boolean(setup && game.pendingCareerEvent.stepIndex === 0)
  const selectedRoute = setup?.options.find(
    (option) => option.id === game.pendingCareerEvent?.variantId,
  )
  const contextChoices = eligibleCareerEventChoices(game, event)
  const visibleChoices = selectedRoute
    ? contextChoices.filter((choice) => selectedRoute.choiceIds.includes(choice.id))
    : contextChoices
  const interactionClass = event.interactionKind.toLowerCase()

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
            {isSetupStep && setup ? (
              <>
                <div className="special-event__step">
                  <span>第1步 / 共2步</span>
                  <strong>{setup.prompt}</strong>
                </div>
                <div
                  className={`special-event__choices special-event__choices--setup special-event__choices--${interactionClass}`}
                  role="group"
                  aria-label="特殊事件第一步选择"
                >
                  {setup.options.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => chooseCareerEvent(option.id)}
                    >
                      <span>{index + 1}</span>
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                      <em>选择后再决定具体做法</em>
                      <Icon name="arrow" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {selectedRoute ? (
                  <div className="special-event__step">
                    <span>第2步 / 共2步</span>
                    <strong>已选择：{selectedRoute.title}</strong>
                  </div>
                ) : null}
                <div
                  className={`special-event__choices special-event__choices--${interactionClass}`}
                  role="group"
                  aria-label="特殊事件选择"
                >
                  {visibleChoices.map((choice) => (
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
                      {choice.outcomes?.length ? (
                        <div className="special-event__odds" aria-label="可能结果">
                          {choice.outcomes.map((outcome) => (
                            <i key={outcome.id}>{outcome.weight}% {outcome.label}</i>
                          ))}
                        </div>
                      ) : null}
                      <Icon name="arrow" />
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="special-event__note">
              <Icon name="info" />
              {interactionLabels[event.interactionKind]} · 概率与范围提前显示；刷新不会重新抽取。
            </p>
          </>
        )}
      </section>
    </CareerHub>
  )
}
