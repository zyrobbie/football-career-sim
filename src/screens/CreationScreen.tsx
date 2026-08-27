import { useEffect, useState } from 'react'
import {
  ATTRIBUTE_LABELS,
  POSITION_LABELS,
  POSITION_WEIGHTS,
  PREFERRED_LEAGUES,
  PRIORITY_LABELS,
  SECONDARY_POSITIONS,
} from '../data/balance'
import {
  attributeKeys,
  positions,
  type CareerPriority,
  type OverseasIntent,
  type Position,
  type PreferredFoot,
} from '../models/game'
import { Icon } from '../components/Icons'
import { SetupFrame } from '../components/SetupFrame'
import { useGameStore } from '../store/gameStore'

export function CreationScreen() {
  const game = useGameStore((state) => state.game)
  if (!game) return null

  if (game.phase === 'CREATE_IDENTITY') return <IdentityStep />
  if (game.phase === 'CREATE_POSITION') return <PositionStep />
  if (game.phase === 'CREATE_PRIORITIES') return <PrioritiesStep />
  return <PreferencesStep />
}

function IdentityStep() {
  const game = useGameStore((state) => state.game)!
  const submitIdentity = useGameStore((state) => state.submitIdentity)
  const [name, setName] = useState(game.draft.name)
  const [jerseyNumber, setJerseyNumber] = useState(
    game.draft.jerseyNumber.toString(),
  )
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>(
    game.draft.preferredFoot,
  )

  return (
    <SetupFrame
      step={1}
      title="告诉我们你是谁？"
      description={`生涯从${game.startYear}年夏季开始，你将以13岁中国球员身份进入职业青训。`}
    >
      <form
        className="setup-form setup-form--narrow"
        onSubmit={(event) => {
          event.preventDefault()
          submitIdentity({
            name,
            jerseyNumber: Number(jerseyNumber),
            preferredFoot,
          })
        }}
      >
        <label className="field">
          <span>球员姓名</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={12}
            autoComplete="off"
            placeholder="输入2—12个字符"
          />
        </label>
        <div className="identity-traits">
          <label className="field">
            <span>球衣号码</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={jerseyNumber}
              onChange={(event) => setJerseyNumber(event.target.value)}
            />
          </label>
          <fieldset className="foot-selector">
            <legend>惯用脚</legend>
            {(
              [
                ['LEFT', '左脚'],
                ['RIGHT', '右脚'],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`foot-option${preferredFoot === value ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="preferred-foot"
                  value={value}
                  checked={preferredFoot === value}
                  onChange={() => setPreferredFoot(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <div className="notice-line">
          <Icon name="info" />
          <span>你将从13岁开始开启足球生涯，国籍为中国；号码和惯用脚会留在球员档案中。</span>
        </div>
        <div className="setup-actions setup-actions--end">
          <button type="submit" className="button button--primary">
            继续
            <Icon name="arrow" />
          </button>
        </div>
      </form>
    </SetupFrame>
  )
}

function PositionStep() {
  const game = useGameStore((state) => state.game)!
  const submitPosition = useGameStore((state) => state.submitPosition)
  const goToPhase = useGameStore((state) => state.goToPhase)
  const [primary, setPrimary] = useState<Position>(
    game.draft.primaryPosition,
  )
  const allowedSecondary = SECONDARY_POSITIONS[primary]
  const [secondary, setSecondary] = useState<Position>(
    allowedSecondary.includes(game.draft.secondaryPosition)
      ? game.draft.secondaryPosition
      : (allowedSecondary[0] as Position),
  )

  useEffect(() => {
    if (!SECONDARY_POSITIONS[primary].includes(secondary)) {
      setSecondary(SECONDARY_POSITIONS[primary][0] as Position)
    }
  }, [primary, secondary])

  return (
    <SetupFrame
      step={2}
      title="你踢什么位置？"
      description="主位置会影响你的初始能力分配，以及综合能力的计算方式。"
    >
      <section className="position-builder">
        <h2 className="section-heading">主位置</h2>
        <div className="position-pitch" role="group" aria-label="主位置">
          {positions.map((position) => (
            <button
              key={position}
              type="button"
              className={`position-pitch__slot position-pitch__slot--${position.toLowerCase()}${
                primary === position ? ' is-selected' : ''
              }`}
              onClick={() => setPrimary(position)}
              aria-pressed={primary === position}
            >
              {position}
              {primary === position ? <Icon name="check" /> : null}
            </button>
          ))}
        </div>
        <div className="position-detail">
          <div className="position-detail__name">
            <span>{POSITION_LABELS[primary]}</span>
            <strong>{primary}</strong>
          </div>
          <div>
            <p>{positionDescription(primary)}</p>
            <dl className="weight-list">
              {attributeKeys.map((key) => (
                <div key={key}>
                  <dt>{ATTRIBUTE_LABELS[key]}</dt>
                  <dd>{POSITION_WEIGHTS[primary][key] * 100}%</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <h2 className="section-heading">初始副位置</h2>
        <div className="secondary-options" role="group" aria-label="初始副位置">
          {allowedSecondary.map((position) => (
            <button
              key={position}
              type="button"
              className={secondary === position ? 'is-selected' : ''}
              onClick={() => setSecondary(position)}
              aria-pressed={secondary === position}
            >
              {position}
              {secondary === position ? <Icon name="check" /> : null}
            </button>
          ))}
        </div>
        <div className="notice-line">
          <Icon name="info" />
          <span>副位置初始熟练度为92%，不会占用生涯中学习新位置的机会。</span>
        </div>
        <div className="setup-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => goToPhase('CREATE_IDENTITY')}
          >
            上一步
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => submitPosition(primary, secondary)}
          >
            继续
            <Icon name="arrow" />
          </button>
        </div>
      </section>
    </SetupFrame>
  )
}

function PrioritiesStep() {
  const game = useGameStore((state) => state.game)!
  const submitPriorities = useGameStore((state) => state.submitPriorities)
  const goToPhase = useGameStore((state) => state.goToPhase)
  const [ordered, setOrdered] = useState<CareerPriority[]>([
    ...game.draft.priorities,
  ])

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= ordered.length) return
    const next = [...ordered]
    const current = next[index]
    const target = next[nextIndex]
    if (!current || !target) return
    next[index] = target
    next[nextIndex] = current
    setOrdered(next)
  }

  return (
    <SetupFrame
      step={3}
      title="你最看重什么？"
      description="把四项追求按重要程度排好。以后面对合同、转会和队内竞争时，它会影响你的取舍。"
    >
      <section className="priority-editor">
        <ol>
          {ordered.map((priority, index) => (
            <li key={priority}>
              <span className="priority-editor__rank">
                {(index + 1).toString().padStart(2, '0')}
              </span>
              <div>
                <strong>{PRIORITY_LABELS[priority]}</strong>
                <small>{priorityDescription(priority)}</small>
              </div>
              <span className="priority-editor__controls">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`上移${PRIORITY_LABELS[priority]}`}
                >
                  <Icon name="up" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === ordered.length - 1}
                  aria-label={`下移${PRIORITY_LABELS[priority]}`}
                >
                  <Icon name="down" />
                </button>
              </span>
            </li>
          ))}
        </ol>
        <div className="setup-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => goToPhase('CREATE_POSITION')}
          >
            上一步
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => submitPriorities(ordered)}
          >
            继续
            <Icon name="arrow" />
          </button>
        </div>
      </section>
    </SetupFrame>
  )
}

function PreferencesStep() {
  const game = useGameStore((state) => state.game)!
  const submitPreferences = useGameStore((state) => state.submitPreferences)
  const goToPhase = useGameStore((state) => state.goToPhase)
  const [intent, setIntent] = useState<OverseasIntent>(
    game.draft.overseasIntent,
  )
  const [leagues, setLeagues] = useState<string[]>([
    ...game.draft.preferredLeagues,
  ])

  const toggleLeague = (league: string) => {
    setLeagues((current) => {
      if (current.includes(league)) {
        return current.filter((item) => item !== league)
      }
      if (current.length >= 3) return current
      return [...current, league]
    })
  }

  return (
    <SetupFrame
      step={4}
      title="你想去海外踢球吗？"
      description="这只是你的长期倾向，不会替你做决定。每一份合同，仍由你亲自选择。"
    >
      <section className="preference-editor">
        <fieldset>
          <legend>留洋意愿</legend>
          {(
            [
              ['STRONG', '强烈希望留洋'],
              ['CONDITIONAL', '条件合适时留洋'],
              ['DOMESTIC', '更倾向留在国内'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`select-row${intent === value ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="overseas-intent"
                value={value}
                checked={intent === value}
                onChange={() => setIntent(value)}
              />
              <span>
                <strong>{label}</strong>
                <small>{intentDescription(value)}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {intent !== 'DOMESTIC' ? (
          <fieldset>
            <legend>最想去的联赛（最多3个）</legend>
            <div className="league-grid">
              {PREFERRED_LEAGUES.map((league) => {
                const selectedIndex = leagues.indexOf(league)
                return (
                  <label
                    key={league}
                    className={selectedIndex >= 0 ? 'is-selected' : ''}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndex >= 0}
                      onChange={() => toggleLeague(league)}
                    />
                    <span>{league}</span>
                    {selectedIndex >= 0 ? (
                      <em>{selectedIndex + 1}</em>
                    ) : null}
                  </label>
                )
              })}
            </div>
            <p className="field-note">已选择 {leagues.length} / 3</p>
          </fieldset>
        ) : null}
        <div className="setup-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => goToPhase('CREATE_PRIORITIES')}
          >
            上一步
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => submitPreferences(intent, leagues)}
          >
            生成球员
            <Icon name="arrow" />
          </button>
        </div>
      </section>
    </SetupFrame>
  )
}

function positionDescription(position: Position): string {
  if (position === 'ST') return '靠进攻终结比赛，也需要身体和心理支撑。'
  if (position === 'LW' || position === 'RW') {
    return '用进攻和身体能力在边路制造威胁。'
  }
  if (position === 'CAM') return '负责前场组织与创造机会，进攻和心理尤其重要。'
  if (position === 'LM' || position === 'RM') {
    return '覆盖边路两端，需要兼顾进攻、防守和身体。'
  }
  if (position === 'CM') return '攻守都要参与，能力结构最讲究均衡。'
  if (position === 'CDM') return '守住中场身后，防守和身体是立足之本。'
  if (position === 'LB' || position === 'RB') {
    return '既要守住边路，也要有足够体能参与攻防。'
  }
  return '站稳防线核心，防守、身体和心理缺一不可。'
}

function priorityDescription(priority: CareerPriority): string {
  return {
    PLAYING_TIME: '我想获得稳定的比赛机会和明确角色。',
    COMPETITIVE_LEVEL: '我愿意去更高水平的联赛和俱乐部挑战自己。',
    SALARY: '我更看重合同收入和谈判回报。',
    STABILITY: '我更看重长约、熟悉的环境和长期留队。',
  }[priority]
}

function intentDescription(intent: OverseasIntent): string {
  return {
    STRONG: '只要机会合适，我会优先考虑去海外发展。',
    CONDITIONAL: '联赛、出场机会和合同都合适，我才会考虑出发。',
    DOMESTIC: '我更习惯在国内发展，但真正合适的海外机会仍会考虑。',
  }[intent]
}
