import { useRef, useState } from 'react'
import type { DevelopmentApproach, GameState, TrainingFocus } from '../models/game'
import type { PersonalArrangementCategory, PersonalArrangementTier } from '../models/personalArrangements'
import { activePersonalArrangements, ARRANGEMENT_CATEGORIES, ARRANGEMENT_CATEGORY_LABELS, ARRANGEMENT_TIERS, arrangementGainText, arrangementEligibility, currentArrangementMove, gameYearAtWindow, quotePersonalArrangement, remainingArrangementPeriods } from '../engine/personalArrangements'
import { playerAgeAtWindow } from '../engine/careerTime'
import { useGameStore } from '../store/gameStore'
const euro = (n: number) => `€${n.toLocaleString('en-US')}`
export function PersonalArrangementsPanel({game, selection}: {game: GameState; selection: {focus: TrainingFocus; approach: DevelopmentApproach | null}}) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<PersonalArrangementCategory>('BODY')
  const [tier, setTier] = useState<PersonalArrangementTier>('BASIC')
  const [notice, setNotice] = useState('')
  const purchase = useGameStore(s => s.purchasePersonalArrangement)
  const busy = useRef(false)
  const quote = quotePersonalArrangement(game, category, tier, selection)
  const currentQuote = useRef(quote.quoteId); currentQuote.current = quote.quoteId
  if (playerAgeAtWindow(game.windowIndex) < 18 || !game.contract || !game.entertainmentV3) return null
  const active = activePersonalArrangements(game)
  const year = gameYearAtWindow(game.startYear, game.windowIndex)
  const used = game.entertainmentV3.arrangements.some(a => a.purchaseYear === year && !a.quotaRestored)
  const canSettle = Boolean(currentArrangementMove(game))
  const pay = () => {
    if (busy.current || currentQuote.current !== quote.quoteId || quote.disabledReason) return
    busy.current = true
    purchase(quote.request)
    const store = useGameStore.getState()
    if (!store.error && store.game?.entertainmentV3?.arrangements.some(a => a.id === quote.request.purchaseId)) { setNotice('付款已保存。服务从本次半年开始自动执行，无需领取。'); setOpen(false) }
    busy.current = false
  }
  return <section className="personal-arrangements" aria-label="个人安排" data-testid="arrangement-panel">
    <div className="personal-arrangements__entry">
      <div data-testid="arrangement-status"><strong>个人安排</strong><span>{used ? '本年已使用' : '本年可购买'}</span><span>现金 {euro(game.cashEuro)}</span>
        {active.map(a => <small key={a.id}>{a.title} · 尚未执行 {remainingArrangementPeriods(a)}期</small>)}</div>
      <button type="button" aria-expanded={open} data-testid="arrangement-entry" onClick={() => {setOpen(!open);setNotice('')}}>{open ? '收起' : '展开'}</button>
    </div>
    {notice ? <p role="status">{notice}</p> : null}
    {game.entertainmentV3.arrangements.length ? <details className="personal-arrangements__history"><summary>安排记录 · {game.entertainmentV3.arrangements.length}项</summary>{[...game.entertainmentV3.arrangements].reverse().map(a => <div key={a.id}><strong>{a.purchaseYear}年 · {a.title}</strong><p>已执行{a.periods.filter(p => p.status === 'EXECUTED').length}期 · 未执行{a.periods.filter(p => p.status === 'PENDING').length}期 · 已终止{a.periods.filter(p => p.status === 'TERMINATED').length}期</p>{a.terminationCause ? <p>{a.terminationCause === 'MOVE' ? '再次搬城，原安顿剩余期已终止。' : a.terminationCause === 'CITY_UNKNOWN' ? '居住城市无法核实，原安顿剩余期已终止；没有认定为新搬家。' : '退休，未执行服务已终止。'}</p> : !remainingArrangementPeriods(a) ? <p>服务已完成。</p> : null}<p>一次支付 {euro(a.priceEuro)} · 累计退款 {euro(a.refundEuro)}</p>{a.refundReceipts.map(r => <p key={r.id}>{r.reason}：{euro(r.amountEuro)}</p>)}</div>)}</details> : null}
    {open ? <div className="personal-arrangements__expanded">
      <div className="personal-arrangements__categories" role="tablist" aria-label="安排类型">
        {ARRANGEMENT_CATEGORIES.map(c => <button type="button" role="tab" aria-selected={category === c} data-testid={`arrangement-category-${c}`} key={c} onClick={() => {setCategory(c);setTier('BASIC')}}>{category === c ? '✓ ' : ''}{ARRANGEMENT_CATEGORY_LABELS[c]}{c === 'SETTLE' && !canSettle ? <small>搬城后开放</small> : null}</button>)}
      </div>
      {category !== 'SETTLE' || canSettle ? <div role="radiogroup" aria-label={`${ARRANGEMENT_CATEGORY_LABELS[category]}档位`} className="personal-arrangements__tiers">
        {ARRANGEMENT_TIERS.map(t => {const q = quotePersonalArrangement(game, category, t, selection);return <button type="button" role="radio" aria-checked={tier === t} data-testid={`arrangement-tier-${t}`} key={t} onClick={() => setTier(t)}>
          <span className="personal-arrangements__tier-heading"><strong>{tier === t ? '● ' : '○ '}{q.offer.title}</strong><b>{euro(q.offer.priceEuro)}</b></span>
          <span>每期{arrangementGainText(q.offer.gain)} · {q.offer.periods}期 · 理论合计{arrangementGainText(q.total)}</span>
        </button>})}
      </div> : <p className="personal-arrangements__reason">{arrangementEligibility(game, 'SETTLE')}</p>}
      {category !== 'SETTLE' || canSettle ? <div className="personal-arrangements__confirm" data-testid="arrangement-confirmation">
        <p><strong>{quote.offer.title}</strong> · 一次支付 {euro(quote.offer.priceEuro)}，不自动续费。</p>
        <p>{quote.cashAfterEuro < 0 ? `当前现金 ${euro(quote.cashBeforeEuro)}；还差 ${euro(-quote.cashAfterEuro)}，不能支付。` : `当前现金 ${euro(quote.cashBeforeEuro)} → 支付后 ${euro(quote.cashAfterEuro)}`}</p>
        <p>每期{arrangementGainText(quote.offer.gain)} × {quote.offer.periods}期，理论合计{arrangementGainText(quote.total)}。</p>
        <p>从{quote.startLabel}本次结算起效；按当前训练与已有服务准备，首期暂估{arrangementGainText(quote.currentPossible)}。事件仍可能改变实际贡献。</p>
        <p>个人安排统一状态上限85，不降低原有高值。低状态恢复优先，不增加能力或保证出场。实际收益可能部分或全部为0。</p>
        <p>已知最多可经历 {quote.availablePeriods}/{quote.offer.periods}期；搬城仅中断原安顿，退休中断剩余服务。未执行期按比例向下取整退款；全程实际为0自动全额冲销，执行过不返年度名额。</p>
        {quote.disabledReason ? <p className="personal-arrangements__reason" role="status">{quote.disabledReason}</p> : null}
        <button type="button" className="button button--primary" data-testid="arrangement-confirm" disabled={Boolean(quote.disabledReason)} onClick={pay}>确认支付 {euro(quote.offer.priceEuro)}</button>
      </div> : null}
      <button type="button" className="personal-arrangements__cancel" onClick={() => setOpen(false)}>本次不安排，继续</button>
      <p>关闭面板不扣款、不占名额。免费球队支持与训练规则保持不变。</p>
    </div> : null}
  </section>
}
