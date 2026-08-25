import { describe, expect, it } from 'vitest'
import { buildRetirementSummary } from '../engine/careerSummary'
import { getClubParametersByCompatibleId } from '../data/clubs/clubRepository'
import { createRetirementVisualAuditGame } from './createRetirementVisualAuditGame'

const chineseIds = ['cn_shanghai_donggang','cn_beijing_yuhua','chn1_shandong_taiyue','cn_chengdu_jincheng','cn_wuhan_jiangcheng','chn1_tianjin_jinmen','chn1_zhejiang_qianchao','chn1_henan_zhongyuan','chn1_changchun_beichen','chn1_dalian_bincheng','chn1_qingdao_haiwan','chn1_shenzhen_pengcheng','chn1_chongqing_shancheng','chn1_xian_changan','chn1_nanjing_jinling','chn1_guangzhou_nanyue','cn_guangxi_liancheng','cn_yunnan_shanhe','chn2_liaoning_tiecheng','chn2_shijiazhuang_yanzhao','chn2_suzhou_wumen','chn2_wuxi_taihu','chn2_nantong_jianghai','chn2_hefei_luzhou','chn2_foshan_lingnan','chn2_meizhou_jiaying','chn2_xiamen_ludao','chn2_ningbo_yongjiang','chn2_shaanxi_qinling','chn2_guizhou_qianfeng','chn2_xinjiang_kunlun','chn2_hohhot_qingcheng'] as const

describe('retirement visual audit factory', () => {
  it('creates deterministic unique, validated history without mutating input', () => {
    const input = [...chineseIds]
    const game = createRetirementVisualAuditGame(input)
    const summary = buildRetirementSummary(game)
    expect(input).toEqual(chineseIds)
    expect(game.phase).toBe('CAREER_RETIRED')
    expect(new Set(game.history.map((entry) => entry.windowIndex)).size).toBe(32)
    expect(game.history.every((entry) => entry.windowIndex >= 0 && entry.windowIndex <= 55)).toBe(true)
    expect(summary.clubs).toHaveLength(32)
    expect(summary.clubs.map((club) => club.clubId)).toEqual(game.history.map((entry) => entry.clubId))
    expect(summary.clubs.map((club) => club.clubName)).toEqual(game.history.map((entry) => entry.clubName))
    expect(createRetirementVisualAuditGame(input)).toEqual(game)
  })
  it('resolves workbook IDs and accepts one club', () => {
    const game = createRetirementVisualAuditGame(['chn1_tianjin_jinmen'])
    expect(game.history[0]).toMatchObject({ clubId: 'chn1_tianjin_jinmen', clubName: '天津津门' })
    expect(getClubParametersByCompatibleId('chn1_tianjin_jinmen')?.id).toBe('chn1_tianjin_jinmen')
  })
  it('rejects empty, duplicate, unknown, and over-capacity input using explicit guards', () => {
    expect(() => createRetirementVisualAuditGame([])).toThrow('1–32 unique')
    expect(() => createRetirementVisualAuditGame([...chineseIds.slice(0, 2), chineseIds[0]!])).toThrow('1–32 unique')
    expect(() => createRetirementVisualAuditGame(['unknown-club'])).toThrow('runtime compatibility')
    expect(() => createRetirementVisualAuditGame([...chineseIds, ...chineseIds.slice(0, 1)])).toThrow('1–32 unique')
  })
})
