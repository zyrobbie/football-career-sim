import {
  ATTRIBUTE_LABELS,
  POSITION_LABELS,
  PRIORITY_LABELS,
} from '../data/balance'
import { calculateOverall } from '../engine/player'
import { attributeKeys } from '../models/game'
import { Icon } from '../components/Icons'
import { SetupFrame } from '../components/SetupFrame'
import { useGameStore } from '../store/gameStore'
import { overseasIntentLabel, preferredFootLabel } from '../ui/format'

export function PlayerRevealScreen() {
  const game = useGameStore((state) => state.game)
  const confirmPlayer = useGameStore((state) => state.confirmPlayer)
  const goToPhase = useGameStore((state) => state.goToPhase)
  if (!game?.player) return null
  const player = game.player

  return (
    <SetupFrame
      step={5}
      title="你的球员档案"
      description="当前能力已经生成，隐藏潜力将在退役时揭晓。返回修改偏好不会刷新这名球员。"
    >
      <section className="reveal-layout">
        <div className="reveal-overall">
          <span>综合能力</span>
          <strong>
            {Math.round(
              calculateOverall(player.attributes, player.primaryPosition),
            )}
          </strong>
          <p>
            {player.name} · 13岁 · {POSITION_LABELS[player.primaryPosition]}
          </p>
        </div>
        <div className="reveal-details">
          <dl className="reveal-attributes">
            {attributeKeys.map((key) => (
              <div key={key}>
                <dt>{ATTRIBUTE_LABELS[key]}</dt>
                <dd>{Math.round(player.attributes[key])}</dd>
                <span>
                  <i style={{ width: `${player.attributes[key]}%` }} />
                </span>
              </div>
            ))}
          </dl>
          <dl className="reveal-meta">
            <div>
              <dt>偏好号码</dt>
              <dd>#{player.jerseyNumber}</dd>
            </div>
            <div>
              <dt>惯用脚</dt>
              <dd>{preferredFootLabel(player.preferredFoot)}</dd>
            </div>
            <div>
              <dt>主位置</dt>
              <dd>{player.primaryPosition}</dd>
            </div>
            <div>
              <dt>副位置</dt>
              <dd>{player.secondaryPosition} · 92%</dd>
            </div>
            <div>
              <dt>第一追求</dt>
              <dd>
                {PRIORITY_LABELS[player.priorities[0] ?? 'PLAYING_TIME']}
              </dd>
            </div>
            <div>
              <dt>留洋倾向</dt>
              <dd>{overseasIntentLabel(player.overseasIntent)}</dd>
            </div>
          </dl>
        </div>
        <div className="notice-line reveal-note">
          <Icon name="info" />
          <span>
            初始能力只决定起点。训练环境、出场、状态和关系将共同影响成长。
          </span>
        </div>
        <div className="setup-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => goToPhase('CREATE_PREFERENCES')}
          >
            返回调整偏好
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={confirmPlayer}
          >
            查看青训邀请
            <Icon name="arrow" />
          </button>
        </div>
      </section>
    </SetupFrame>
  )
}
