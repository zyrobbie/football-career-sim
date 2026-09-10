import type { GameState } from '../models/game'
import { useGameStore } from '../store/gameStore'
import { professionalNextAction, type ProfessionalAction } from '../store/professionalNextAction'
import { Icon } from './Icons'

export const RETIRE_NATIONAL_TEAM_CONFIRMATION = '确定退出中国国家队吗？退出后无法撤回，但你的俱乐部生涯仍会继续。'
export function retireFromNationalTeamIfConfirmed(confirm: (message: string) => boolean, retire: () => void): boolean {
  if (!confirm(RETIRE_NATIONAL_TEAM_CONFIRMATION)) return false
  retire()
  return true
}

export function ProfessionalReportActions({ game, allowReview = false }: { game: GameState; allowReview?: boolean }) {
  const advance = useGameStore(state => state.advanceProfessionalReport)
  const review = useGameStore(state => state.reviewReport)
  const model = professionalNextAction(game)
  const act = (action: ProfessionalAction) => {
    const submit = () => advance(action, game.windowIndex, game.careerSeed)
    if (action === 'NATIONAL') retireFromNationalTeamIfConfirmed(window.confirm, submit)
    else submit()
  }
  return <div className="professional-report-actions">
    <p>{model.summary}</p>
    <div className="demo-complete__actions">
      {model.primary && <button type="button" className="button button--primary" onClick={() => act(model.primary!.action)}>
        {model.primary.label}<Icon name="arrow" />
      </button>}
      {model.secondary.filter(item => item.action === 'STAY').map(item => <button key={item.action} type="button" className="button button--secondary" onClick={() => act(item.action)}>{item.label}</button>)}
      {allowReview && <button type="button" className="button button--secondary" onClick={review}>复查职业半年报告</button>}
    </div>
    {model.secondary.filter(item => item.action !== 'STAY').map(item => <button key={item.action} type="button" className="retirement-option" onClick={() => act(item.action)}>{item.label}</button>)}
  </div>
}
