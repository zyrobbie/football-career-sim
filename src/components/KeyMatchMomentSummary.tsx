import type { MomentSnapshot } from '../models/keyMatchMoment'
export function momentContribution(snapshot:MomentSnapshot, pending=false):string {
  const d=snapshot.appliedStatsDelta,parts=[]
  if(d.goals)parts.push(`进球 +${d.goals}`)
  if(d.assists)parts.push(`助攻 +${d.assists}`)
  if(d.yellowCards)parts.push(`黄牌 +${d.yellowCards}`)
  if(d.averageRating)parts.push(`半年评分 ${d.averageRating>0?'+':''}${d.averageRating.toFixed(1)}`)
  else parts.push(pending?'半年平均评分预计显示不变':'本次表现已计入，半年平均评分显示未变化')
  return parts.join('；')
}
export function KeyMatchMomentSummary({moment,pending=false}:{moment:MomentSnapshot;pending?:boolean}) {
  return <section className="key-moment-summary" aria-label="关键比赛时刻">
    {!pending&&<><h3>{moment.debutMoment?'一线队首秀 · ':''}{moment.title}</h3><p>当时 {moment.minute}分钟 · {moment.ownScore}比{moment.opponentScore} · {moment.choiceTitle}</p></>}
    {pending&&<p>{moment.choiceTitle}</p>}
    <p>{moment.result.text}</p>
    <p className="key-moment-summary__contribution">其中本次贡献：{momentContribution(moment,pending)}。{pending?'完成后计入半年总数据。':'已包含在半年总数据中。'}</p>
    <details><summary>回看机会</summary><p>{moment.scene}</p><p>分钟与比分为本次机会的场景背景，不代表完整逐场赛程。</p></details>
  </section>
}
