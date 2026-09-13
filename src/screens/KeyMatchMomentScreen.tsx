import { useRef } from 'react'
import { AppShell } from '../components/AppShell'
import { CareerTopbar } from '../components/CareerTopbar'
import { KeyMatchMomentSummary } from '../components/KeyMatchMomentSummary'
import { useGameStore } from '../store/gameStore'
import type { MomentActionContext } from '../models/keyMatchMoment'
const labels={attack:'进攻',defense:'防守',physical:'身体',mental:'心理能力'}
const risks={LOW:'较低',MEDIUM:'中等',HIGH:'较高'}
export function KeyMatchMomentScreen() {
  const game=useGameStore(s=>s.game),choose=useGameStore(s=>s.chooseKeyMatchMoment),finish=useGameStore(s=>s.finishKeyMatchMoment),resume=useGameStore(s=>s.continueCareer)
  const busy=useRef(false),p=game?.pendingKeyMatchMoment
  if(!game?.player||!p)return null
  const expected:MomentActionContext={careerSeed:game.careerSeed,playerId:game.player.id,windowIndex:game.windowIndex,clubId:p.clubId,momentId:p.id,inputFingerprint:p.inputFingerprint}
  const act=(f:()=>void)=>{if(busy.current)return;busy.current=true;try{f()}finally{busy.current=false}}
  const result=game.phase!=='KEY_MATCH_MOMENT'
  return <AppShell topbar={<CareerTopbar game={game} sectionLabel="关键比赛时刻"/>}>
    <section className="key-moment" aria-label="本期关键比赛时刻">
      <header><span>{p.debutMoment?'一线队首秀':'本期比赛机会'}</span><h1>{p.title}</h1><p>当时 {p.minute}分钟 · {p.ownScore}比{p.opponentScore}</p></header>
      {result&&p.snapshot?<div aria-live="polite"><KeyMatchMomentSummary moment={p.snapshot} pending/><p className="key-moment__note">这次处理已经保存，完成后与本半年其他表现一起结算。</p>
        <button className="button button--primary key-moment__finish" type="button" onClick={()=>act(()=>game.phase==='SIMULATION_READY'?resume():finish(expected))}>{game.phase==='SIMULATION_READY'?'恢复这半年结算':'完成这半年'}</button>
      </div>:<><p className="key-moment__scene">{p.scene}</p><p className="key-moment__note">选择一次处理方式。相关能力会影响表现，风险表示失误代价。</p>
        <div className="key-moment__choices">{p.choices.map(c=><div key={c.id} className="key-moment__choice">
          <button type="button" onClick={()=>act(()=>choose(c.id,expected))}><strong>{c.title}</strong><span>{Object.entries(c.weights).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k])=>labels[k as keyof typeof labels]).join(' · ')}<em>失误风险：{risks[c.risk]}{c.risk==='HIGH'?' · 可能黄牌':''}</em></span></button>
        </div>)}</div><details><summary>查看处理说明</summary>{p.choices.map(c=><p key={c.id}><strong>{c.title}：</strong>{c.explanation}</p>)}</details><p className="key-moment__note">选择后先看结果，再完成这半年。</p></>}
    </section>
  </AppShell>
}
