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
    title: '加强进攻',
    description: '把固定训练份额集中到进攻能力。',
    icon: 'attack',
  },
  {
    id: 'defense',
    title: '加强防守',
    description: '提高防守训练比重，补强无球能力。',
    icon: 'defense',
  },
  {
    id: 'physical',
    title: '加强身体',
    description: '提升身体素质，增强对抗与耐力。',
    icon: 'physical',
  },
  {
    id: 'mental',
    title: '加强心理',
    description: '训练判断、专注与比赛抗压能力。',
    icon: 'mental',
  },
  {
    id: 'BALANCED',
    title: '平衡训练',
    description: '按照位置权重分配全部训练份额。',
    icon: 'career',
  },
  {
    id: 'ADAPTATION',
    title: '适应青训节奏',
    description: '优先稳定身体与心理，能力成长略慢。',
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
    description: '直接向教练表达进入一线队训练的意愿。',
    effect: '教练推荐提升更快 · 身体负荷增加',
  },
  {
    id: 'STEADY',
    title: '稳住成长节奏',
    description: '继续按长期计划训练，不为了短期机会打乱节奏。',
    effect: '竞技与身体状态更稳定',
  },
  {
    id: 'TEAM_FIRST',
    title: '青年队成绩优先',
    description: '承担更多比赛责任，用场上表现证明自己。',
    effect: '比赛证明与队内关系更易提升',
  },
]

const professionalApproaches: typeof approaches = [
  {
    id: 'PUSH',
    title: '主动争取出场',
    description: '向教练明确表达比赛诉求，用更高训练投入争取机会。',
    effect: '教练关系提升 · 身体负荷增加',
  },
  {
    id: 'STEADY',
    title: '稳定适应职业队',
    description: '先适应训练、比赛准备与恢复节奏，再逐步扩大角色。',
    effect: '竞技与身体状态更稳定',
  },
  {
    id: 'TEAM_FIRST',
    title: '接受球队安排',
    description: '把团队需要放在个人出场诉求之前，耐心等待机会。',
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
      sectionLabel="半年发展计划"
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
              ? '俱乐部已为你的低状态安排恢复支持；你的训练选择仍会影响本阶段成长。'
              : isProfessional
                ? '职业合同已经生效。训练方向、职业队策略和实际出场将共同决定合同承诺是否兑现。'
                : isSecondYear
                ? '第二个青训赛季里，你的训练方向和职业策略会共同影响一线队评估。'
                : '不同的发展方向会影响能力成长与事件概率，请谨慎选择。'}
        </p>
        {isSecondYear ? (
          <section className="path-choice">
            <header>
              <div>
                <span>本窗口职业策略</span>
                <h2>
                  {isProfessional
                    ? game.windowIndex === 4
                      ? '你准备怎样开始职业队生涯？'
                      : '你准备怎样应对新的职业半年？'
                    : '你准备如何面对一线队的关注？'}
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
          aria-label="半年发展计划"
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
                    ? '适应职业队节奏'
                    : plan.title}
                </strong>
                <small>
                  {isProfessional && plan.id === 'ADAPTATION'
                    ? '优先稳定职业队训练与比赛节奏，能力成长略慢。'
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
          {isSimulating ? '正在结算…' : '确认选择并模拟半年'}
          <Icon name="arrow" />
        </button>
        <p className="decision-footnote">
          <Icon name="info" />
          {currentWindow}的选择完成后将进入{nextWindow}窗口
        </p>
        {game.lastReport ? (
          <section className="previous-change" aria-label="上一窗口变化">
            <h2>上一窗口变化</h2>
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
  if (windowIndex === 0) return '第一个半年，你准备怎样发展？'
  if (windowIndex === 1) return '第一年下半程，你准备怎样发展？'
  if (windowIndex === 2) return '青训第二年，你要怎样接近一线队？'
  if (windowIndex === 3) return '晋升评估前，你要怎样完成最后冲刺？'
  if (windowIndex === 4) return '职业生涯第一个半年，你准备怎样立足？'
  if (game.transferDecision?.kind === 'TRANSFER') {
    return '新俱乐部的第一个半年，你准备怎样立足？'
  }
  return '新的职业半年，你准备怎样发展？'
}

const attributeKeysForPreview = ['attack', 'physical'] as const
const previewLabels = {
  attack: '进攻',
  physical: '身体',
} as const
