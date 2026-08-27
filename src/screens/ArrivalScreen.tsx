import { useState } from 'react'
import { CareerHub } from '../components/CareerHub'
import { Icon, type IconName } from '../components/Icons'
import type { ArrivalChoice } from '../models/game'
import { useGameStore } from '../store/gameStore'

const choices: Array<{
  id: ArrivalChoice
  title: string
  description: string
  preview: string
  icon: IconName
}> = [
  {
    id: 'COACH',
    title: '主动与教练沟通',
    description: '弄清球队对你的期待，也让教练知道你想怎么成长。',
    preview: '教练关系明显提升，队内关系小幅提升',
    icon: 'coach',
  },
  {
    id: 'TEAMMATES',
    title: '主动融入更衣室',
    description: '先认识队友，让自己尽快成为更衣室的一员。',
    preview: '队内关系明显提升，心理状态小幅提升',
    icon: 'team',
  },
  {
    id: 'OPEN_DAY',
    title: '去见见球迷',
    description: '参加俱乐部活动，让球迷先认识你。',
    preview: '球迷关系和媒体关系提升',
    icon: 'fans',
  },
  {
    id: 'EXTRA_TRAINING',
    title: '留下来加练',
    description: '用更多训练时间争取教练组的注意。',
    preview: '这半年训练质量提升，身体状态小幅下降',
    icon: 'physical',
  },
]

export function ArrivalScreen() {
  const game = useGameStore((state) => state.game)
  const chooseArrival = useGameStore((state) => state.chooseArrival)
  const [selected, setSelected] = useState<ArrivalChoice>('COACH')
  if (!game?.player || !game.selectedClubId || !game.youthRole) return null
  const offer = game.academyOffers.find(
    (candidate) => candidate.club.id === game.selectedClubId,
  )
  if (!offer) return null

  return (
    <CareerHub game={game} sectionLabel="报到第一天">
      <div className="career-decision">
        <header className="career-panel-heading">
          <Icon name="team" />
          <h1>第一天，怎么让大家记住你？</h1>
        </header>
        <p className="career-panel-lead">
          职业生涯从今天真正开始。你先做什么，会影响教练、队友和球迷对你的第一印象。
        </p>
        <div
          className="choice-list choice-list--career choice-list--arrival"
          role="radiogroup"
          aria-label="报到第一天的选择"
        >
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={selected === choice.id}
              className={selected === choice.id ? 'is-selected' : ''}
              onClick={() => setSelected(choice.id)}
            >
              <span className="choice-list__radio">
                {selected === choice.id ? <Icon name="check" /> : null}
              </span>
              <span>
                <strong>{choice.title}</strong>
                <small>{choice.description}</small>
                <em>{choice.preview}</em>
              </span>
              <Icon name={choice.icon} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button button--primary career-decision__submit"
          onClick={() => chooseArrival(selected)}
        >
          就这么开始
          <Icon name="arrow" />
        </button>
      </div>
    </CareerHub>
  )
}
