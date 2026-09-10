import { CareerPreferencesEditor } from '../components/CareerPreferencesEditor'
import { useRef, useState } from 'react'
import { CareerHub } from '../components/CareerHub'
import { Icon } from '../components/Icons'
import { careerWindowLabel } from '../engine/careerTime'
import type {
  DevelopmentApproach,
  GameState,
  TrainingFocus,
} from '../models/game'
import { useGameStore } from '../store/gameStore'

import { trainingPlanView, trainingSubmission, type TrainingSelection } from '../ui/trainingPlanView'

// View-only drafts survive navigation within this session; never written to a save.
const drafts = new Map<string, TrainingSelection>()

const approaches: Array<{
  id: DevelopmentApproach
  title: string
  description: string
  effect: string
}> = [
  {
    id: 'PUSH',
    title: '主动争取跟训',
    description: '直接告诉教练，你想进入一线队训练。',
    effect: '更容易获得教练推荐 · 身体负荷增加',
  },
  {
    id: 'STEADY',
    title: '稳住成长节奏',
    description: '按长期计划继续训练，不为了眼前机会打乱节奏。',
    effect: '竞技状态与身体状态更稳定',
  },
  {
    id: 'TEAM_FIRST',
    title: '用比赛说话',
    description: '在青年队承担更多责任，用表现争取一线队注意。',
    effect: '比赛证明与队内关系更容易提升',
  },
]

const professionalApproaches: typeof approaches = [
  {
    id: 'PUSH',
    title: '主动争取出场',
    description: '明确告诉教练你想上场，并用更高训练投入争取机会。',
    effect: '教练关系提升 · 身体负荷增加',
  },
  {
    id: 'STEADY',
    title: '先站稳脚跟',
    description: '先适应职业队的训练、比赛准备和恢复，再慢慢扩大角色。',
    effect: '竞技状态与身体状态更稳定',
  },
  {
    id: 'TEAM_FIRST',
    title: '先服从球队安排',
    description: '把球队需要放在个人出场之前，耐心等机会。',
    effect: '队内关系与心理状态提升',
  },
]

export function TrainingPlanScreen() {
  const game = useGameStore((state) => state.game)
  if (!game?.player || !game.selectedClubId) return null
  const model = trainingPlanView(game)
  return <TrainingPlanContent key={model.key} game={game} />
}

function TrainingPlanContent({ game }: { game: GameState }) {
  const chooseTraining = useGameStore((state) => state.chooseTraining)
  const model = trainingPlanView(game)
  const [selection, setSelection] = useState<TrainingSelection>(() => drafts.get(model.key) ?? { focus: model.initialFocus, approach: game.developmentApproach ?? 'STEADY' })
  const submitting = useRef(false)
  const selected = selection.focus
  const approach = selection.approach
  const update = (next: TrainingSelection) => {
    drafts.set(model.key, next)
    if (drafts.size > 16) drafts.delete(drafts.keys().next().value!)
    setSelection(next)
  }
  const submit = () => {
    const current = useGameStore.getState().game
    if (submitting.current || !current || current.phase !== 'HALF_YEAR_PLAN' || trainingPlanView(current).key !== model.key) return
    const value = trainingSubmission(current, selection)
    if (!value) return
    submitting.current = true
    chooseTraining(value.focus, value.approach, { careerSeed: game.careerSeed, windowIndex: game.windowIndex })
    if (useGameStore.getState().error) submitting.current = false
  }
  if (!game.player) return null
  const currentRole =
    game.teamLevel === 'FIRST_TEAM'
      ? game.firstTeamRole
      : game.youthRole
  if (!currentRole) return null
  const isSimulating = game.phase === 'SIMULATION_READY'
  const currentWindow = careerWindowLabel(game.startYear, game.windowIndex)
  const nextWindow = careerWindowLabel(game.startYear, game.windowIndex + 1)
  const isSecondYear = game.windowIndex >= 2
  const isProfessional =
    Boolean(game.contract) && game.windowIndex >= 4
  const activeApproaches = isProfessional
    ? professionalApproaches
    : approaches
  const needsRecovery =
    game.player.form < 46 ||
    game.player.fitness < 46 ||
    game.player.morale < 46

  return (
    <CareerHub
      game={game}
      sectionLabel="半年计划"
    >
      <div className={`career-decision training-plan${model.veteran ? " training-plan--veteran" : ""}`}>
        <header className="career-panel-heading">
          <Icon name="mental" />
          <h1>
            {windowHeading(game)}
          </h1>
        </header>
        <p className="career-panel-lead">
            {model.veteran
              ? model.recovery ? "本期先恢复" : "选择本期训练重心，兼顾状态与身体负担。"
              : needsRecovery
              ? '你的状态不在最佳，俱乐部已经安排恢复支持。怎么训练，仍会影响这半年的成长。'
              : isProfessional
                ? '合同已经生效。你怎么训练、怎么争取角色，以及真正获得多少出场，会决定俱乐部是否兑现承诺。'
                : isSecondYear
                ? '青训进入第二年。你的训练方向和职业策略，会直接影响俱乐部是否愿意把你推向一线队。'
                : '未来半年没有标准答案。你选的方向，会改变成长节奏，也可能带来不同的故事。'}
        </p>
        <CareerPreferencesEditor key={game.careerSeed} game={game} />
        {model.ageNote ? <p className="training-plan__note">{model.ageNote}</p> : null}
        {model.recovery ? (
          <section className="training-plan__recovery" aria-label="本期先恢复">
            <h2>本期先恢复</h2>
            <p>当前状态低于46，优先安排恢复，暂不选择训练和职业策略。</p>
            <p>暂记身体维护计划，是否执行以事件和到期后果处理后的状态为准。</p>
            {model.savedFocus ? <p>已保存的计划将由本次恢复安排接续，不会重新处理已完成的事件。</p> : null}
          </section>
        ) : null}
        {isSecondYear && !model.recovery ? (
          <section className="path-choice">
            <header>
              <div>
                <span>这半年怎么踢</span>
                <h2>
                  {isProfessional
                    ? game.windowIndex === 4
                      ? '职业队的第一步，你想怎么走？'
                      : '这半年，你想把重心放在哪里？'
                    : '一线队已经注意到你，你准备怎么争取？'}
                </h2>
              </div>
              <strong>
                {isProfessional
                  ? game.teamLevel === 'FIRST_TEAM'
                    ? '一线队'
                    : '职业青年队'
                  : `${game.firstTeamProgress.attention}/100`}
              </strong>
            </header>
            <div
              role="radiogroup"
              aria-label={isProfessional ? '职业队策略' : '一线队发展策略'}
            >
              {activeApproaches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={approach === item.id}
                  className={approach === item.id ? 'is-selected' : ''}
                  onClick={() => update({ ...selection, approach: item.id })}
                  disabled={isSimulating}
                >
                  <span className="choice-list__radio">
                    {approach === item.id ? <Icon name="check" /> : null}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                    <em>{item.effect}</em>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {!model.recovery ? <div
          className="choice-list choice-list--career choice-list--training-plan"
          role="radiogroup"
          aria-label="半年计划"
        >
          {model.options.map((plan) => (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={selected === plan.id}
              className={selected === plan.id ? 'is-selected' : ''}
              onClick={() => update({ ...selection, focus: plan.id })}
              disabled={isSimulating || Boolean(plan.disabledReason)}
            >
              <span className="choice-list__radio">
                {selected === plan.id ? <Icon name="check" /> : null}
              </span>
              <span>
                <strong>{plan.title}</strong>
                <small>{plan.description}</small>
                {plan.disabledReason ? <em>{plan.disabledReason}</em> : null}
              </span>
              <Icon name={plan.icon} />
            </button>
          ))}
        </div> : null}
        {model.veteran && !model.recovery ? <p className="training-plan__note">以上为训练准备的直接效果，不代表半年结束时的净变化。准备收益最多+4，目标上限95；事件、到期后果及职业策略可能改变实际效果，低状态恢复优先。</p> : null}
        {!model.recovery && model.savedFocus === selected && model.options.find(option => option.id === selected)?.disabledReason ? <p className="training-plan__saved" role="status">已保留存档中的计划。你可以继续，实际准备收益可能为0，成本仍会执行；也可以改选其他计划。</p> : null}
        <button
          type="button"
          className="button button--primary career-decision__submit"
          onClick={submit}
          disabled={isSimulating || !trainingSubmission(game, selection)}
        >
          {isSimulating ? '半年进行中…' : model.recovery ? '按恢复安排开始这半年' : '开始这半年'}
          <Icon name="arrow" />
        </button>
        <p className="decision-footnote">
          <Icon name="info" />
          {currentWindow}结束后，将进入{nextWindow}
        </p>
        {game.lastReport ? (
          <section className="previous-change" aria-label="上半年回顾">
            <h2>上半年回顾</h2>
            <div>
              {attributeKeysForPreview.map((key) => {
                const delta = game.lastReport!.attributes[key].delta
                return (
                  <span key={key}>
                    {delta > 0 ? '+' : ''}
                    {Math.round(delta * 10) / 10} {previewLabels[key]}
                  </span>
                )
              })}
              <span>
                教练关系
                {game.lastReport.relations.coach.delta > 0 ? '+' : ''}
                {Math.round(game.lastReport.relations.coach.delta)}
              </span>
            </div>
          </section>
        ) : null}
      </div>
    </CareerHub>
  )
}

function windowHeading(game: GameState): string {
  const windowIndex = game.windowIndex
  if (windowIndex === 0) return '第一个半年，你想怎么起步？'
  if (windowIndex === 1) return '第一年进入下半程，你想怎么走？'
  if (windowIndex === 2) return '青训第二年，开始冲击一线队。'
  if (windowIndex === 3) return '晋升评估前，最后冲一把。'
  if (windowIndex === 4) return '职业生涯第一个半年，先站稳脚跟。'
  if (game.transferDecision?.kind === 'TRANSFER') {
    return '新球队的第一个半年，先找到自己的位置。'
  }
  return '接下来的半年，你想怎么踢？'
}

const attributeKeysForPreview = ['attack', 'physical'] as const
const previewLabels = {
  attack: '进攻',
  physical: '身体',
} as const
