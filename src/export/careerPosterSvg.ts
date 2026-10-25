import type { GameState } from '../models/game'
import { buildRetirementSummary } from '../engine/careerSummary'
import { aggregateCareerHonors, aggregateClubCareerHonors } from '../engine/honorAggregation'
import { representativeOffPitchStories } from '../engine/offPitchStories'
import { getClubCrestByCompatibleId } from '../data/clubs/clubCrests'
import { matchHonorVisual } from '../data/honors/honorVisualRegistry'
import { runtimeClubById } from '../data/clubs/runtimeClubCatalog'
import { careerPosterMemories } from '../ui/careerPosterStory'
import { formatEuro, nationalStageLabel } from '../ui/format'
import { RETIREMENT_QR_ASSET_PATH } from './retirementRecord'

export const CAREER_POSTER_BRAND_PATH = `${import.meta.env.BASE_URL}assets/brand/logo-compact-reverse.svg`
const C = { ink: '#173e34', green: '#0a332b', paper: '#f4f0e6', gold: '#a58443', lightGold: '#e0c68b', muted: '#59665d', line: '#dcd6c7', white: '#fffdf7', pale: '#cbd8ca' }
const SANS = "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',sans-serif"
const SERIF = "Georgia,'Songti SC','Noto Serif CJK SC',serif"
const xml = (value: string | number) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** Conservative Unicode-aware wrapping with no clipping, truncation or foreignObject. */
export function posterTextWidth(text: string, size: number): number {
  return [...text].reduce((width, char) => width + size * (/\s/.test(char) ? .34 : /[\u0000-\u007f]/.test(char) ? /[ilI.,'!:;]/.test(char) ? .34 : /[MW@]/.test(char) ? .95 : .66 : 1.05), 0)
}
export function wrapPosterText(text: string, size: number, width: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const character of [...paragraph]) {
      if (line && posterTextWidth(line + character, size) > width) { lines.push(line); line = '' }
      line += character
    }
    lines.push(line)
  }
  return lines
}

export function careerPosterAssetPaths(game: GameState): string[] {
  const summary = buildRetirementSummary(game)
  return [...new Set([
    CAREER_POSTER_BRAND_PATH, RETIREMENT_QR_ASSET_PATH,
    ...summary.clubs.map(club => getClubCrestByCompatibleId(club.clubId)?.assetPath),
    ...aggregateCareerHonors(summary.honors).map(honor => matchHonorVisual({ type: honor.type, label: honor.displayLabel, competitionLabel: honor.competitionLabel }).visual?.assetPath),
  ].filter((path): path is string => Boolean(path)))]
}

export interface CareerPosterSvg { svg: string; width: number; height: number; pageBreaks?: number[] }
/** The exact production export source, usable by browser Canvas and a server SVG rasterizer. */
export function buildCareerPosterSvg(game: GameState, assets: Readonly<Record<string, string>>): CareerPosterSvg {
  if (!game.player || game.phase !== 'CAREER_RETIRED') throw new Error('A retired player is required for a career poster.')
  for (const required of [CAREER_POSTER_BRAND_PATH, RETIREMENT_QR_ASSET_PATH]) {
    if (!assets[required]?.startsWith('data:image/')) throw new Error(`Required poster asset missing: ${required}`)
  }
  const s = buildRetirementSummary(game), player = game.player
  const honors = aggregateCareerHonors(s.honors)
  const memories = careerPosterMemories(representativeOffPitchStories(game))
  const parts: string[] = []
  const pageBreaks: number[] = [0]
  const rect = (x: number, y: number, w: number, h: number, fill: string) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`)
  const card = (x: number, y: number, w: number, h: number, fill = C.white, stroke = C.line, radius = 8) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`)
  const line = (x1: number, y1: number, x2: number, y2: number, color = C.line, width = 1) => parts.push(`<path d="M${x1} ${y1}H${x2}" transform="translate(0 ${y2-y1})" stroke="${color}" stroke-width="${width}" fill="none"/>`)
  const text = (value: string | number, x: number, y: number, size = 18, fill = C.ink, options: { serif?: boolean; bold?: boolean; anchor?: 'start' | 'end' | 'middle'; width?: number; leading?: number } = {}) => {
    const rows = options.width ? wrapPosterText(String(value), size, options.width) : [String(value)]
    const leading = options.leading ?? 1.5
    rows.forEach((row, index) => parts.push(`<text x="${x}" y="${(y + size * .88 + index * size * leading).toFixed(2)}" font-family="${xml(options.serif ? SERIF : SANS)}" font-size="${size}" font-weight="${options.bold ? 600 : 400}" text-anchor="${options.anchor ?? 'start'}" fill="${fill}">${xml(row)}</text>`))
    return rows.length * size * leading
  }
  const image = (path: string | null | undefined, x: number, y: number, size: number, height = size) => {
    const uri = path ? assets[path] : undefined
    if (!uri?.startsWith('data:image/')) return false
    parts.push(`<image x="${x}" y="${y}" width="${size}" height="${height}" preserveAspectRatio="xMidYMid meet" href="${xml(uri)}"/>`)
    return true
  }
  // Mobile-first reflow: all original content remains, every major section occupies the full width.
  const W=780, X=44, CW=W-X*2
  const minor=26, body=28
  const sectionTitle=(title:string,top:number,detail='')=>{
    text(title,X,top,38,C.ink,{bold:true})
    let h=58
    if(detail){h+=text(detail,X,top+60,minor,C.muted,{width:CW})}
    line(X,top+h,W-X,top+h,C.line)
    line(X,top+h,X+72,top+h,C.gold,3)
    return h+18
  }
  const metric=(label:string,value:string|number,top:number,size=48)=>{
    text(label,X+20,top,minor,C.muted)
    return text(value,X+20,top+42,size,C.ink,{serif:typeof value==='number',bold:true,width:CW-40,leading:1.25})+58
  }
  let y=100 // Notch-safe area intentionally contains no text, images, or ornaments.
  image(CAREER_POSTER_BRAND_PATH,X,y,150,52)
  text('球员生涯档案',W-X,y,minor,C.pale,{anchor:'end'})
  text(`${game.startYear}—${game.startYear+Math.floor(game.windowIndex/2)}`,W-X,y+40,30,C.lightGold,{serif:true,anchor:'end'})
  y+=98
  line(X,y,W-X,y,'#426051')
  y+=30
  text('终场之后',X,y,minor,C.lightGold)
  y+=46
  y+=text(player.name,X,y,82,C.white,{serif:true,width:CW,leading:1.18})+18
  text(`${s.age}岁 · #${player.jerseyNumber} · ${player.primaryPosition}`,X,y,body,C.pale)
  text('FINAL OVR',W-X-270,y+4,minor,C.pale)
  text(s.finalOverall,W-X,y-12,62,C.lightGold,{serif:true,anchor:'end'})
  y+=64
  line(X,y,W-X,y,'#426051');y+=28
  text('生涯评价',X,y,minor,C.lightGold);y+=46
  y+=text(s.evaluation.title,X,y,38,C.white,{bold:true,width:CW})+12
  y+=text(s.evaluation.summary,X,y,body,C.pale,{width:CW})+40
  // Insert the hero background behind every existing element, retaining the top safe area.
  parts.unshift(`<rect width="${W}" height="${y}" fill="url(#emerald)"/>`)
  pageBreaks.push(y)
  y+=28
  const snapshots=[
    {label:'一线队生涯',value:`${s.seniorTotals.appearances}场 · ${s.seniorTotals.goals}球 · ${s.seniorTotals.assists}助`,note:`另有青年队 ${s.youthTotals.appearances} 场`},
    {label:'能力轨迹',value:`巅峰 ${s.peakOverall} · 退役 ${s.finalOverall}`,note:`${s.peakAge}岁抵达巅峰`},
    {label:'估算身价',value:`巅峰 ${formatEuro(s.peakMarketValueEuro)}`,note:`${s.peakMarketValueAge}岁巅峰 · 退役 ${formatEuro(s.finalMarketValueEuro)}`},
  ]
  for(const item of snapshots){
    const start=parts.length,top=y
    y+=metric(item.label,item.value,y+20,44)
    y+=text(item.note,X+20,y+12,minor,C.muted,{width:CW-40})+36
    parts.splice(start,0,`<rect x="${X}" y="${top}" width="${CW}" height="${y-top}" rx="8" fill="${C.white}" stroke="${C.line}"/><path d="M${X+20} ${top}h${CW-40}" stroke="${C.gold}" stroke-width="3"/>`)
    pageBreaks.push(y)
    y+=16
  }
  y+=32
  y+=sectionTitle('国家队生涯',y,'中国国家队')
  const national=[['出场',s.nationalTeam.appearances],['进球',s.nationalTeam.goals],['助攻',s.nationalTeam.assists],['世界杯最佳',s.nationalTeam.worldCupBest?nationalStageLabel(s.nationalTeam.worldCupBest):'无正赛记录'],['亚洲杯最佳',s.nationalTeam.asianCupBest?nationalStageLabel(s.nationalTeam.asianCupBest):'无正赛记录']] as const
  const natStart=parts.length,natTop=y
  for(let i=0;i<3;i++){const [label,value]=national[i]!;const x=X+20+i*(CW-40)/3;text(label,x,y+18,minor,C.muted);text(value,x,y+62,54,C.ink,{serif:true})}
  y+=148
  for(const [label,value] of national.slice(3)){text(label,X+20,y,minor,C.muted);text(value,W-X-20,y,32,C.ink,{anchor:'end'});y+=58}
  y+=16
  parts.splice(natStart,0,`<rect x="${X}" y="${natTop}" width="${CW}" height="${y-natTop}" rx="8" fill="#e3eade"/>`)
  pageBreaks.push(y)
  y+=46
  y+=sectionTitle('俱乐部生涯',y,`${s.clubCount}家俱乐部 · ${s.totals.appearances}场正式履历`)
  // Existing column labels become per-record labels rather than eight unreadable desktop columns.
  text('俱乐部 / 级别',X,y,minor,C.muted);y+=44
  for(const club of s.clubs){
    const start=parts.length,top=y
    const crest=getClubCrestByCompatibleId(club.clubId)?.assetPath
    if(!image(crest,X+18,y+20,58)){text(runtimeClubById.get(club.clubId)?.shortMark??club.clubName.slice(0,1),X+18,y+22,36)}
    const nameH=text(club.clubName,X+94,y+24,36,C.ink,{bold:true,width:CW-112,leading:1.3})
    y+=32+Math.max(58,nameH)
    y+=text(`${club.country} · ${club.levelLabel}`,X+20,y,minor,C.muted,{width:CW-40})+14
    text('效力时间',X+20,y,minor,C.muted)
    y+=text(club.serviceSpells.map(spell=>spell.label).join(' / '),X+148,y,body,C.ink,{width:CW-168})+12
    text('队伍',X+20,y,minor,C.muted)
    const teamH=text(club.teamLevelLabel,X+128,y,body,C.ink,{width:CW-148});y+=Math.max(42,teamH)+24
    const stats=[['出场',club.appearances],['进球',club.goals],['助攻',club.assists],['巅峰',club.peakOverall]] as const
    for(let i=0;i<4;i++){const [label,value]=stats[i]!;const x=X+20+i*(CW-40)/4;text(label,x,y,minor,C.muted);text(value,x,y+42,44,C.ink,{serif:true,bold:true})}
    y+=110
    text('荣誉',X+20,y,minor,C.gold)
    const grouped=aggregateClubCareerHonors(s.honors,club.clubId)
    if(!grouped.length)y+=text('尚无',X+128,y,minor,C.muted)
    for(const honor of grouped){const visual=matchHonorVisual({type:honor.type,label:honor.displayLabel,competitionLabel:honor.competitionLabel});image(visual.visual?.assetPath,X+128,y,36);y+=Math.max(46,text(`${honor.displayLabel} ×${honor.count}`,X+178,y,body,C.ink,{width:CW-198})+10)}
    y+=22
    parts.splice(start,0,`<rect x="${X}" y="${top}" width="${CW}" height="${y-top}" rx="8" fill="${C.white}" stroke="${C.line}"/><path d="M${X} ${top+20}v58" stroke="${C.gold}" stroke-width="3"/>`)
    pageBreaks.push(y)
    y+=22
  }
  y+=24
  y+=sectionTitle('生涯评价',y,'最终评分')
  card(X,y,CW,164,'url(#emerald)',C.gold)
  text(s.evaluation.provisionalScore,X+24,y+30,76,C.lightGold,{serif:true})
  text(s.evaluation.title,X+190,y+26,34,C.white,{bold:true,width:CW-214})
  text(`${s.evaluation.completedPoints}/${s.evaluation.completedPointsMaximum} 分`,X+190,y+112,minor,C.pale)
  y+=190
  const dimensions=[['俱乐部表现',s.evaluation.dimensions.clubPerformance,25],['国家队表现',s.evaluation.dimensions.nationalTeam,15],['巅峰与平台',s.evaluation.dimensions.peakAndPlatform,15],['职业寿命',s.evaluation.dimensions.longevity,5],['集体荣誉',s.evaluation.dimensions.collectiveHonors,25],['个人荣誉',s.evaluation.dimensions.personalHonors,15]] as const
  dimensions.forEach(([label,points,total],index)=>{const x=X+(index%3)*CW/3,top=y+Math.floor(index/3)*112;text(label,x,top,body,C.ink);text(`${points}/${total}`,x,top+46,40,C.ink,{serif:true})})
  y+=236
  const explanation='俱乐部与国家队表现、巅峰高度、职业长度和荣誉，一起构成这段生涯的最终评分。'
  y+=text(explanation,X,y+8,body,C.muted,{width:CW})+50
  pageBreaks.push(y)
  y+=sectionTitle('荣誉室',y,`${s.honors.length}项`)
  for(const [label,scope] of [['俱乐部','CLUB'],['国家队','NATIONAL'],['个人','INDIVIDUAL']] as const){
    text(label,X,y,30,C.gold,{bold:true});y+=52
    const group=honors.filter(h=>h.scope===scope)
    if(!group.length)y+=text('尚无',X,y,body,C.muted)+18
    for(const honor of group){const visual=matchHonorVisual({type:honor.type,label:honor.displayLabel,competitionLabel:honor.competitionLabel});image(visual.visual?.assetPath,X,y,44);y+=Math.max(64,text(`${honor.displayLabel} ×${honor.count}`,X+62,y+3,body,C.ink,{width:CW-62})+20)}
    line(X,y,W-X,y,C.line);pageBreaks.push(y);y+=30
  }
  y+=18
  y+=sectionTitle('生涯标签',y,`${s.tags.length}枚`)
  if(!s.tags.length)y+=text('暂无生涯标签',X,y,body,C.muted)+24
  const tagW=(CW-16)/2
  for(let index=0;index<s.tags.length;index+=2){
    const top=y,start=parts.length
    let rowHeight=0
    for(let col=0;col<2;col++){
      const tag=s.tags[index+col];if(!tag)continue
      const x=X+col*(tagW+16)
      const labelH=text(tag.label,x+16,top+18,34,C.ink,{bold:true,width:tagW-32})
      const reasonH=text(tag.reason,x+16,top+labelH+30,body,C.muted,{width:tagW-32})
      rowHeight=Math.max(rowHeight,labelH+reasonH+52)
    }
    const backgrounds=[]
    for(let col=0;col<2&&index+col<s.tags.length;col++){const x=X+col*(tagW+16);backgrounds.push(`<rect x="${x}" y="${top}" width="${tagW}" height="${rowHeight}" rx="7" fill="${C.white}" stroke="${C.line}"/><path d="M${x} ${top+20}v32" stroke="${C.gold}" stroke-width="3"/>`)}
    parts.splice(start,0,...backgrounds)
    y+=rowHeight+16;pageBreaks.push(y)
  }
  if(memories.length){
    y+=32;y+=sectionTitle('场外生涯记忆',y)
    for(const memory of memories){
      const sentence=`${game.startYear+Math.floor(memory.windowIndex/2)}年，${memory.text}`
      parts.push(`<circle cx="${X+4}" cy="${y+15}" r="4" fill="${C.gold}"/>`)
      y+=text(sentence,X+24,y,30,C.ink,{width:CW-24,leading:1.65})+30;pageBreaks.push(y)
    }
  }
  y+=26
  const talentStart=parts.length,talentTop=y
  ;([['隐藏潜力',s.potentialOverall],['巅峰能力',s.peakOverall],['天赋兑现率',`${s.fulfillmentPercent}%`]] as const).forEach(([label,value],index)=>{const x=X+20+index*(CW-40)/3;text(label,x,y+20,body,C.pale);text(value,x,y+66,48,C.lightGold,{serif:true})})
  y+=142
  const closing='从第一次上场，到最后一次离场。从13岁的青训少年，到最后一场职业比赛，每一次选择都留在这里。球员生涯结束了，这段故事属于你。'
  y+=text(closing,X+20,y+14,body,C.pale,{width:CW-40})+46
  parts.splice(talentStart,0,`<rect x="${X}" y="${talentTop}" width="${CW}" height="${y-talentTop}" rx="8" fill="url(#emerald)" stroke="${C.gold}"/>`)
  y+=30;y+=text('这份退役档案已保存在本地',W/2,y,minor,C.muted,{anchor:'middle'})+42
  pageBreaks.push(y)
  const footerTop=y
  text('扫码，开始你的球员生涯',W/2,y+38,34,C.lightGold,{bold:true,anchor:'middle'})
  rect(W/2-80,y+110,160,160,'#ffffff');image(RETIREMENT_QR_ASSET_PATH,W/2-70,y+120,140)
  text('footballcareer.zyrobbie.site/',W/2,y+302,minor,C.pale,{anchor:'middle'})
  y+=374
  parts.splice(parts.length-4,0,`<rect y="${footerTop}" width="${W}" height="374" fill="url(#emerald)"/>`)
  const height=Math.ceil(y)
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-label="${xml(player.name)}的足球生涯"><title>${xml(player.name)}的足球生涯</title><defs><linearGradient id="emerald" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#173f33"/><stop offset="1" stop-color="#082d27"/></linearGradient></defs><rect width="${W}" height="${height}" fill="${C.paper}"/>${parts.join('')}</svg>`
  return {svg,width:W,height,pageBreaks:[...new Set([...pageBreaks,height])].sort((a,b)=>a-b)}
}
