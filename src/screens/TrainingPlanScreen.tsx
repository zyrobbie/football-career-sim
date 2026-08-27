import { useState } from 'react'
import { CareerHub } from '../components/CareerHub'
import { Icon, type IconName } from '../components/Icons'
import { careerWindowLabel } from '../engine/careerTime'
import type {
  DevelopmentApproach,
  GameState,
  TrainingFocus,
} from '../models/game'
import { useGameStore } from '../store/gameStore'

const plans: Array<{
  id: TrainingFocus
  title: string
  description: string
  icon: IconName
}> = [
  {
    id: 'attack',
    title: '重点练进攻',
    description: '把更多训练时间放在进攻能力上。',
    icon: 'attack',
  },
  {
    id: 'defense',
    title: '重点练防守',
    description: '把更多训练时间放在防守和无球能力上。',
    icon: 'defense',
  },
  {
    id: 'physical',
    title: '重点练身体',
    description: '提升身体素质，增强对抗和耐力。',
    icon: 'physical',
  },
  {
    id: 'mental',
    title: '重点练心理',
    description: '提升判断、专注和比赛抗压能力。',
    icon: 'mental',
  },
  {
    id: 'BALANCED',
    title: '均衡训练',
    description: '按照你的位置特点均衡分配训练。',
    icon: 'career',
  },
  {
    id: 'ADAPTATION',
    title: '先适应青训',
    description: '优先稳住身体和心理状态，能力成长会稍慢一些。',
    icon: 'team',
  },
]

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
  const chooseTraining = useGameStore((state) => state.chooseTraining)
  const [selected, setSelected] = useState<TrainingFocus>('physical')
  const [approach, setApproach] =
    useState<DevelopmentApproach>('STEADY')
  if (!game?.player || !game.selectedClubId) return null
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
      <div className="career-decision">
        <header className="career-panel-heading">
          <Icon name="mental" />
          <h1>
            {windowHeading(game)}
          </h1>
        </header>
        <p className="career-panel-lead">
            {needsRecovery
              ? '你的状态不在最佳，俱乐部已经安排恢复支持。怎么训练，仍会影响这半年的成长。'
              : isProfessional
                ? '合同已经生效。你怎么训练、怎么争取角色，以及真正获得多少出场，会决定俱乐部是否兑现承诺。'
                : isSecondYear
                ? '青训进入第二年。你的训练方向和职业策略，会直接影响俱乐部是否愿意把你推向一线队。'
                : '未来半年没有标准答案。你选的方向，会改变成长节奏，也可能带来不同的故事。'}
        </p>
        {isSecondYear ? (
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
                  onClick={() => setApproach(item.id)}
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
        <div
          className="choice-list choice-list--career choice-list--training-plan"
          role="radiogroup"
          aria-label="半年计划"
        >
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={selected === plan.id}
              className={selected === plan.id ? 'is-selected' : ''}
              onClick={() => setSelected(plan.id)}
              disabled={isSimulating}
            >
              <span className="choice-list__radio">
                {selected === plan.id ? <Icon name="check" /> : null}
              </span>
              <span>
                <strong>
                  {isProfessional && plan.id === 'ADAPTATION'
                    ? '先适应职业队'
                    : plan.title}
                </strong>
                <small>
                  {isProfessional && plan.id === 'ADAPTATION'
                    ? '优先适应职业队的训练和比赛强度，能力成长会稍慢一些。'
                    : plan.description}
                </small>
              </span>
              <Icon name={plan.icon} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button button--primary career-decision__submit"
          onClick={() =>
            chooseTraining(selected, isSecondYear ? approach : null)
          }
          disabled={isSimulating}
        >
          {isSimulating ? '半年进行中…' : '开始这半年'}
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
