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
    description: '了解球队要求，明确第一个半年的发展目标。',
    preview: '教练关系明显上升，队内关系小幅上升',
    icon: 'coach',
  },
  {
    id: 'TEAMMATES',
    title: '积极认识新队友',
    description: '把融入更衣室放在第一位。',
    preview: '队内关系明显上升，心理状态小幅上升',
    icon: 'team',
  },
  {
    id: 'OPEN_DAY',
    title: '参加俱乐部开放活动',
    description: '在训练之外认识这里的球迷。',
    preview: '球迷和媒体关系上升',
    icon: 'fans',
  },
  {
    id: 'EXTRA_TRAINING',
    title: '留在训练场加练',
    description: '用额外训练争取教练组注意。',
    preview: '本窗口训练质量上升，身体状态小幅下降',
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
    <CareerHub game={game} sectionLabel="首次入队事件">
      <div className="career-decision">
        <header className="career-panel-heading">
          <Icon name="team" />
          <h1>第一天来到训练基地</h1>
        </header>
        <p className="career-panel-lead">
          你准备怎样开始这段职业生涯？这次选择会影响最初的关系与训练条件。
        </p>
        <div
          className="choice-list choice-list--career choice-list--arrival"
          role="radiogroup"
          aria-label="入队选择"
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
          确认入队方式
          <Icon name="arrow" />
        </button>
      </div>
    </CareerHub>
  )
}
