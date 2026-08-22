import type { Club } from '../../models/game'
import { chineseClubShortMark, clubChineseNameByCanonicalId } from './clubChineseNames'
import { CLUB_PARAMETERS_V1 } from './clubParametersV1'

const LEGACY_SHORT_MARKS: Readonly<Record<string, Club['shortMark']>> = {
  cn_shanghai_donggang: '沪', cn_beijing_yuhua: '京', cn_wuhan_jiangcheng: '汉', cn_chengdu_jincheng: '蓉', cn_guangxi_liancheng: '桂', cn_yunnan_shanhe: '滇',
  eng_arsenal: '枪', eng_liverpool: '利', eng_brighton: '鸥', eng_fulham: '富', esp_real_madrid: '皇', esp_barcelona: '巴', esp_real_sociedad: '社', esp_celta: '塞', ita_inter: '国', ita_juventus: '尤', ita_bologna: '博', ita_torino: '都', ger_bayern: '拜', ger_dortmund: '多', ger_frankfurt: '鹰', ger_mainz: '美', fra_psg: '巴', fra_monaco: '摩', fra_lille: '犬', fra_strasbourg: '斯', ned_ajax: '阿', ned_psv: '埃', por_benfica: '本', por_porto: '波', bel_brugge: '布', bel_anderlecht: '安', jpn_urawa: '浦', jpn_vissel: '神', kor_ulsan: '蔚', kor_jeonbuk: '全', bra_palmeiras: '帕', bra_flamengo: '弗', arg_river: '河', arg_boca: '博',
}

const facilityScores = [95, 88, 80, 71, 61, 51] as const
const academyScores = [95, 87, 78, 68, 58, 48] as const
function nearestTier(value: number, scores: readonly number[]): Club['tier'] {
  return (scores.reduce((best, score, index) => Math.abs(value - score) < Math.abs(value - scores[best]!) ? index : best, 0) + 1) as Club['tier']
}
function profileFor(country: string, tier: Club['tier']): Club['profile'] {
  if (country === '中国') return tier === 4 ? 'ELITE' : tier === 5 ? 'BALANCED' : 'SMALL'
  return tier <= 2 ? 'ELITE' : tier <= 4 ? 'BALANCED' : 'SMALL'
}

export const CLUBS: readonly Club[] = Object.freeze(CLUB_PARAMETERS_V1.map((parameter) => {
  const tier = parameter.platformTier
  const name = clubChineseNameByCanonicalId(parameter.id)
  if (!name) throw new Error(`Missing Chinese runtime presentation for ${parameter.id}.`)
  const profile = profileFor(parameter.country, tier)
  return Object.freeze({
    id: parameter.id, name, shortMark: LEGACY_SHORT_MARKS[parameter.id] ?? chineseClubShortMark(name),
    country: parameter.country, leagueKey: parameter.country, leagueLabel: parameter.league, profile, tier,
    facilityTier: nearestTier(parameter.facility, facilityScores), academyTier: nearestTier(parameter.academy, academyScores),
    description: `${parameter.league}的${profile === 'ELITE' ? '高竞争' : profile === 'BALANCED' ? '均衡' : '成长型'}平台，训练设施${parameter.facility}、青训${parameter.academy}。`,
  })
}))
export const DOMESTIC_CLUBS: readonly Club[] = Object.freeze(CLUBS.filter((club) => club.country === '中国'))
export const OVERSEAS_CLUBS: readonly Club[] = Object.freeze(CLUBS.filter((club) => club.country !== '中国'))
export const runtimeClubById: ReadonlyMap<string, Club> = new Map(CLUBS.map((club) => [club.id, club]))
