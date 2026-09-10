import { useState } from 'react'
import { PREFERRED_LEAGUES } from '../data/balance'
import type { GameState, OverseasIntent } from '../models/game'
import { canEditCareerPreferences, normalizeCareerPreferences } from '../store/careerPreferences'
import { hasPendingMarket } from '../store/marketContext'
import { useGameStore } from '../store/gameStore'
import { overseasIntentLabel } from '../ui/format'

export function CareerPreferencesEditor({ game }: { game: GameState }) {
  const [editing, setEditing] = useState(false)
  const [intent, setIntent] = useState(game.player!.overseasIntent)
  const [leagues, setLeagues] = useState(game.player!.preferredLeagues)
  const [message, setMessage] = useState('')
  if (!canEditCareerPreferences(game)) return null
  const open = () => {
    setIntent(game.player!.overseasIntent); setLeagues([...game.player!.preferredLeagues])
    setMessage(''); setEditing(true)
  }
  const save = () => {
    try {
      const next = normalizeCareerPreferences(intent, leagues)
      useGameStore.getState().updateCareerPreferences(next.intent, next.leagues)
      if (useGameStore.getState().error) { setMessage(useGameStore.getState().error!); return }
      setEditing(false); setMessage('求职方向已保存')
    } catch (error) { setMessage((error as Error).message) }
  }
  return <section className="career-preferences" aria-label="当前求职方向">
    <div className="career-preferences__heading">
      <p><strong>当前求职方向</strong> · {overseasIntentLabel(game.player!.overseasIntent)}</p>
      {!editing && <button type="button" className="button button--secondary" onClick={open}>修改求职方向</button>}
    </div>
    <p className="career-preferences__hint">{hasPendingMarket(game) ? '本次报价和谈判保持不变，下次市场生效' : '用于下一次生成的报价；不会立即开启市场'}</p>
    {editing && <div className="career-preferences__form">
      <label>求职方向<select aria-label="求职方向" value={intent} onChange={e => { const value = e.target.value as OverseasIntent; setIntent(value); if (value === 'DOMESTIC') setLeagues([]) }}>
        <option value="STRONG">优先海外</option><option value="CONDITIONAL">综合考虑</option><option value="DOMESTIC">优先国内</option>
      </select></label>
      {intent !== 'DOMESTIC' && <fieldset><legend>偏好联赛（最多三个，按选择顺序）</legend>
        <div className="career-preferences__leagues">{PREFERRED_LEAGUES.map(league => <label key={league}>
          <input type="checkbox" checked={leagues.includes(league)} disabled={!leagues.includes(league) && leagues.length >= 3} onChange={() => setLeagues(current => current.includes(league) ? current.filter(l => l !== league) : [...current, league])} />{league}
        </label>)}</div>
      </fieldset>}
      <div className="career-preferences__actions"><button type="button" className="button button--primary" onClick={save}>保存求职方向</button><button type="button" className="button button--secondary" onClick={() => { setEditing(false); setMessage('') }}>取消</button></div>
    </div>}
    {game.lastReport && <button type="button" className="career-preferences__review" onClick={() => useGameStore.getState().reviewReport()}>回看上期报告</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
