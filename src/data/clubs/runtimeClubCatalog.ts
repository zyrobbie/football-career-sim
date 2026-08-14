import type { Club } from '../../models/game'
import { CLUB_PARAMETERS_V1 } from './clubParametersV1'

const LEGACY_PRESENTATION: Readonly<Record<string, Pick<Club, 'name' | 'shortMark'>>> = {
  cn_shanghai_donggang: { name: '上海东港', shortMark: '沪' }, cn_beijing_yuhua: { name: '北京御华', shortMark: '京' }, cn_wuhan_jiangcheng: { name: '武汉江城', shortMark: '汉' }, cn_chengdu_jincheng: { name: '成都锦城', shortMark: '蓉' }, cn_guangxi_liancheng: { name: '广西联城', shortMark: '桂' }, cn_yunnan_shanhe: { name: '云南山河', shortMark: '滇' },
  eng_arsenal: { name: '阿森纳', shortMark: '枪' }, eng_liverpool: { name: '利物浦', shortMark: '利' }, eng_brighton: { name: '布莱顿', shortMark: '鸥' }, eng_fulham: { name: '富勒姆', shortMark: '富' }, esp_real_madrid: { name: '皇家马德里', shortMark: '皇' }, esp_barcelona: { name: '巴塞罗那', shortMark: '巴' }, esp_real_sociedad: { name: '皇家社会', shortMark: '社' }, esp_celta: { name: '塞尔塔', shortMark: '塞' }, ita_inter: { name: '国际米兰', shortMark: '国' }, ita_juventus: { name: '尤文图斯', shortMark: '尤' }, ita_bologna: { name: '博洛尼亚', shortMark: '博' }, ita_torino: { name: '都灵', shortMark: '都' }, ger_bayern: { name: '拜仁慕尼黑', shortMark: '拜' }, ger_dortmund: { name: '多特蒙德', shortMark: '多' }, ger_frankfurt: { name: '法兰克福', shortMark: '鹰' }, ger_mainz: { name: '美因05', shortMark: '美' }, fra_psg: { name: '巴黎圣日耳曼', shortMark: '巴' }, fra_monaco: { name: '摩纳哥', shortMark: '摩' }, fra_lille: { name: '里尔', shortMark: '犬' }, fra_strasbourg: { name: '斯特拉斯堡', shortMark: '斯' }, ned_ajax: { name: '阿贾克斯', shortMark: '阿' }, ned_psv: { name: '埃因霍温', shortMark: '埃' }, por_benfica: { name: '本菲卡', shortMark: '本' }, por_porto: { name: '波尔图', shortMark: '波' }, bel_brugge: { name: '布鲁日', shortMark: '布' }, bel_anderlecht: { name: '安德莱赫特', shortMark: '安' }, jpn_urawa: { name: '浦和红钻', shortMark: '浦' }, jpn_vissel: { name: '神户胜利船', shortMark: '神' }, kor_ulsan: { name: '蔚山HD', shortMark: '蔚' }, kor_jeonbuk: { name: '全北现代', shortMark: '全' }, bra_palmeiras: { name: '帕尔梅拉斯', shortMark: '帕' }, bra_flamengo: { name: '弗拉门戈', shortMark: '弗' }, arg_river: { name: '河床', shortMark: '河' }, arg_boca: { name: '博卡青年', shortMark: '博' },
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
  const legacy = LEGACY_PRESENTATION[parameter.id]
  const profile = profileFor(parameter.country, tier)
  return Object.freeze({
    id: parameter.id, name: legacy?.name ?? parameter.name, shortMark: legacy?.shortMark ?? parameter.name.slice(0, 1),
    country: parameter.country, leagueKey: parameter.country, leagueLabel: parameter.league, profile, tier,
    facilityTier: nearestTier(parameter.facility, facilityScores), academyTier: nearestTier(parameter.academy, academyScores),
    description: `${parameter.league}的${profile === 'ELITE' ? '高竞争' : profile === 'BALANCED' ? '均衡' : '成长型'}平台，训练设施${parameter.facility}、青训${parameter.academy}。`,
  })
}))
export const DOMESTIC_CLUBS: readonly Club[] = Object.freeze(CLUBS.filter((club) => club.country === '中国'))
export const OVERSEAS_CLUBS: readonly Club[] = Object.freeze(CLUBS.filter((club) => club.country !== '中国'))
export const runtimeClubById: ReadonlyMap<string, Club> = new Map(CLUBS.map((club) => [club.id, club]))
