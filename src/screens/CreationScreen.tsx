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
      title="注册你的球员"
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
            placeholder="输入2至12个字符"
            autoFocus
          />
        </label>
        <div className="identity-traits">
          <label className="field">
            <span>偏好球衣号码</span>
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
          <span>年龄固定为13岁，国籍固定为中国；号码和惯用脚会写入球员档案。</span>
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
      title="选择你的场上位置"
      description="位置决定四项能力的初始结构与综合能力权重。"
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
          <span>副位置熟练度92%，不占用生涯学习新位置的机会。</span>
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
      title="排列你的职业追求"
      description="排名越靠前，球员在合同、转会和队内处境中越重视这一目标。"
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
      title="确定你的留洋倾向"
      description="这是长期偏好，不是必须执行的路线；合适的合同仍由你亲自决定。"
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
            <legend>偏好联赛（最多三个）</legend>
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
  if (position === 'ST') return '主要依靠进攻、身体与心理能力。'
  if (position === 'LW' || position === 'RW') {
    return '需要进攻与身体能力制造边路威胁。'
  }
  if (position === 'CAM') return '进攻与心理决定前场组织和创造力。'
  if (position === 'LM' || position === 'RM') {
    return '兼顾进攻、防守与身体的中场边路角色。'
  }
  if (position === 'CM') return '进攻、防守和心理能力相对均衡。'
  if (position === 'CDM') return '依靠防守与身体保护中场区域。'
  if (position === 'LB' || position === 'RB') {
    return '防守与身体是边后卫的主要基础。'
  }
  return '防守、身体和心理决定中后卫的稳定性。'
}

function priorityDescription(priority: CareerPriority): string {
  return {
    PLAYING_TIME: '更重视角色承诺与稳定出场。',
    COMPETITIVE_LEVEL: '更愿意挑战更强联赛和俱乐部。',
    SALARY: '更重视合同收入和谈判回报。',
    STABILITY: '更偏好长约、熟悉环境和长期留队。',
  }[priority]
}

function intentDescription(intent: OverseasIntent): string {
  return {
    STRONG: '只要出现合理机会，就会优先考虑海外路线。',
    CONDITIONAL: '联赛、出场和合同都合适时再作决定。',
    DOMESTIC: '国内发展更符合预期，但不会永久关闭留洋。',
  }[intent]
}
