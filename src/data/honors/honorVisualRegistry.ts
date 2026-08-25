import type { CareerHonor, CareerHonorType } from '../../models/game'

export type HonorVisualKind = 'TROPHY' | 'AWARD' | 'ORIGINAL'
export type HonorVisualReferenceStatus = 'OFFICIAL_IDENTITY_REFERENCE' | 'WORKBOOK_REVIEW_REFERENCE' | 'ORIGINAL_DESIGN'

export interface HonorVisual {
  readonly key: string
  readonly type: CareerHonorType
  readonly competitionLabels: readonly string[]
  readonly displayLabel: string
  readonly assetPath: string
  readonly visualKind: HonorVisualKind
  readonly identityReferenceUrl: string | null
  readonly referenceStatus: HonorVisualReferenceStatus
  readonly rightsNote: string
}

const HONOR_ASSET_ROOT = `${import.meta.env.BASE_URL}assets/honors/`

/**
 * Future reference notes retained from the visual-review workbook:
 * - Serie B's photographed trophy has no missing top; preserve that silhouette.
 * - The Belgian Cup may use a symmetric Croky Cup-inspired concept trophy when no
 *   reliable physical-trophy reference is available.
 * - Keep the approved Copa do Brasil trophy-mark silhouette and composition when
 *   adapting it to this local illustration system.
 */

function visual(input: Omit<HonorVisual, 'assetPath'> & { readonly assetFile: string }): HonorVisual {
  return Object.freeze({
    ...input,
    competitionLabels: Object.freeze([...input.competitionLabels]),
    assetPath: `${HONOR_ASSET_ROOT}${input.assetFile}`,
  })
}

/**
 * A reference-only registry. SVGs are independent illustrations, never official
 * logos or copied artwork; URLs identify the real competition or trophy only.
 */
export const HONOR_VISUAL_REGISTRY: readonly HonorVisual[] = Object.freeze([
  visual({ key: 'premier-league-title', type: 'LEAGUE_TITLE', competitionLabels: ['英超'], displayLabel: '英超冠军', assetFile: 'premier-league-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.premierleague.com/en/news/4668605/everything-thats-been-decided-in-202526-premier-league', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的奖杯几何插画；不含英超标志、照片或官方矢量。' }),
  visual({ key: 'serie-a-title', type: 'LEAGUE_TITLE', competitionLabels: ['意甲'], displayLabel: '意甲冠军', assetFile: 'serie-a-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.legaseriea.it/serie-a', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的联赛奖杯几何插画；不含赛事标志或官方素材。' }),
  visual({ key: 'csl-title', type: 'LEAGUE_TITLE', competitionLabels: ['中超'], displayLabel: '中超冠军', assetFile: 'csl-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.thecfa.cn/zyls1/20241102/35289.html', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的冠军杯几何插画；不含中超标志、照片或官方矢量。' }),
  visual({ key: 'fa-cup', type: 'DOMESTIC_CUP', competitionLabels: ['英格兰足总杯'], displayLabel: '英格兰足总杯冠军', assetFile: 'fa-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.thefa.com/competitions/the-emirates-fa-cup', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的双耳杯几何插画；不含足总杯标志、照片或官方矢量。' }),
  visual({ key: 'coppa-italia', type: 'DOMESTIC_CUP', competitionLabels: ['意大利杯'], displayLabel: '意大利杯冠军', assetFile: 'coppa-italia.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.legaseriea.it/coppa-italia/news/la-storia-del-trofeo-della-coppa-italia', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的古典花冠杯几何插画；不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'cfa-cup', type: 'DOMESTIC_CUP', competitionLabels: ['中国足协杯'], displayLabel: '中国足协杯冠军', assetFile: 'cfa-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://imageoss.thecfa.cn/upload/file/20221209/1670554506388264.pdf', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的冠军杯几何插画；不含中国足协杯标志、照片或官方矢量。' }),
  visual({ key: 'champions-league', type: 'CONTINENTAL_TITLE', competitionLabels: ['欧冠', '欧洲冠军联赛'], displayLabel: '欧冠冠军', assetFile: 'champions-league.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.uefa.com/uefachampionsleague/thetrophy/', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的大耳杯几何插画；不含 UEFA 标志、照片或官方矢量。' }),
  visual({ key: 'europa-league', type: 'CONTINENTAL_TITLE', competitionLabels: ['欧联杯', '欧洲足联欧洲联赛'], displayLabel: '欧联杯冠军', assetFile: 'europa-league.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.uefa.com/uefaeuropaleague/thetrophy/', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的无把手八角杯几何插画；不含 UEFA 标志、照片或官方矢量。' }),
  visual({ key: 'world-cup', type: 'WORLD_CUP', competitionLabels: ['世界杯'], displayLabel: '世界杯冠军', assetFile: 'world-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.fifa.com/en/articles/world-cup-trophy-in-numbers-fifa-world-cup-qatar-2022', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的双人托球奖杯几何插画；不含 FIFA 标志、照片或官方矢量。' }),
  visual({ key: 'ballon-dor', type: 'BALLON_DOR', competitionLabels: ['金球奖'], displayLabel: '金球奖', assetFile: 'ballon-dor.svg', visualKind: 'AWARD', identityReferenceUrl: 'https://www.francefootball.fr/ballon-d-or/', referenceStatus: 'OFFICIAL_IDENTITY_REFERENCE', rightsNote: '独立绘制的多面金球与岩石底座插画；不含官方照片或矢量。' }),
  visual({ key: 'golden-boot', type: 'GOLDEN_BOOT', competitionLabels: [], displayLabel: '金靴', assetFile: 'golden-boot.svg', visualKind: 'ORIGINAL', identityReferenceUrl: null, referenceStatus: 'ORIGINAL_DESIGN', rightsNote: '原创足球靴图形，不引用或模仿任何赛事奖杯。' }),
  visual({ key: 'team-of-season', type: 'TEAM_OF_SEASON', competitionLabels: [], displayLabel: '赛季最佳阵容', assetFile: 'team-of-season.svg', visualKind: 'ORIGINAL', identityReferenceUrl: null, referenceStatus: 'ORIGINAL_DESIGN', rightsNote: '原创阵容徽章图形，不引用或模仿任何赛事标志。' }),
  visual({ key: 'la-liga-title', type: 'LEAGUE_TITLE', competitionLabels: ['西甲'], displayLabel: '西甲冠军', assetFile: 'la-liga-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.vhv.rs/viewpic/oJoJbo_cup-la-liga-trophy-png-transparent-png/', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的双耳联赛杯几何插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'bundesliga-title', type: 'LEAGUE_TITLE', competitionLabels: ['德甲'], displayLabel: '德甲冠军', assetFile: 'bundesliga-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.amazon.ca/Housunzi-Bundesliga-Championship-Decorations-Ornaments/dp/B0DLTXBRLM', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的圆盘联赛盾插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'ligue-1-title', type: 'LEAGUE_TITLE', competitionLabels: ['法甲'], displayLabel: '法甲冠军', assetFile: 'ligue-1-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://commons.wikimedia.org/wiki/File:Ligue_1_Trophy_2024.png', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的球体支柱联赛杯插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'eredivisie-title', type: 'LEAGUE_TITLE', competitionLabels: ['荷甲'], displayLabel: '荷甲冠军', assetFile: 'eredivisie-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://free3d.com/3d-model/dutch-football-trophy-51970.html', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的圆盘联赛盾插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'primeira-liga-title', type: 'LEAGUE_TITLE', competitionLabels: ['葡超'], displayLabel: '葡超冠军', assetFile: 'primeira-liga-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://zh.wikipedia.org/zh-cn/File:Primeira_Liga_Trophy.svg', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的球顶双耳联赛杯插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'belgian-pro-league-title', type: 'LEAGUE_TITLE', competitionLabels: ['比甲'], displayLabel: '比甲冠军', assetFile: 'belgian-pro-league-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.facebook.com/krcgenk/photos/10794268-001genk-belgium-may-19-cup-before-the-play-offs-1-jupiler-pro-league-ma/10157158908556558/', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的蜂巢镂空联赛杯插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'j1-league-title', type: 'LEAGUE_TITLE', competitionLabels: ['J1联赛'], displayLabel: 'J1联赛冠军', assetFile: 'j1-league-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://i4.hoopchina.com.cn/editor/2023-9-24/06-42-56/c11ad24d-15e2-44a9-aeb4-e6a29323ce5d.jpeg?x-oss-process=image/resize,w_800/format,webp', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的环列圆盘联赛盾插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'k1-league-title', type: 'LEAGUE_TITLE', competitionLabels: ['K1联赛'], displayLabel: 'K1联赛冠军', assetFile: 'k1-league-title.svg', visualKind: 'TROPHY', identityReferenceUrl: 'https://www.transfermarkt.com/k-league-1/erfolge/wettbewerb/RSK1', referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '独立绘制的圆环飞翼联赛杯插画；轮廓参照用户审核工作簿嵌图，不含赛事标志、照片或官方矢量。' }),
  visual({ key: 'brasileirao-title', type: 'LEAGUE_TITLE', competitionLabels: ['巴甲'], displayLabel: '巴甲冠军', assetFile: 'brasileirao-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'argentina-primera-title', type: 'LEAGUE_TITLE', competitionLabels: ['阿甲'], displayLabel: '阿甲冠军', assetFile: 'argentina-primera-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'championship-title', type: 'LEAGUE_TITLE', competitionLabels: ['英冠'], displayLabel: '英冠冠军', assetFile: 'championship-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'serie-b-title', type: 'LEAGUE_TITLE', competitionLabels: ['意乙'], displayLabel: '意乙冠军', assetFile: 'serie-b-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，保留其完整的大型顶部轮廓；不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'segunda-division-title', type: 'LEAGUE_TITLE', competitionLabels: ['西乙'], displayLabel: '西乙冠军', assetFile: 'segunda-division-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: '2-bundesliga-title', type: 'LEAGUE_TITLE', competitionLabels: ['德乙'], displayLabel: '德乙冠军', assetFile: '2-bundesliga-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'ligue-2-title', type: 'LEAGUE_TITLE', competitionLabels: ['法乙'], displayLabel: '法乙冠军', assetFile: 'ligue-2-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'china-league-one-title', type: 'LEAGUE_TITLE', competitionLabels: ['中甲'], displayLabel: '中甲冠军', assetFile: 'china-league-one-title.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'copa-del-rey', type: 'DOMESTIC_CUP', competitionLabels: ['国王杯'], displayLabel: '国王杯冠军', assetFile: 'copa-del-rey.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'dfb-pokal', type: 'DOMESTIC_CUP', competitionLabels: ['德国杯'], displayLabel: '德国杯冠军', assetFile: 'dfb-pokal.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'coupe-de-france', type: 'DOMESTIC_CUP', competitionLabels: ['法国杯'], displayLabel: '法国杯冠军', assetFile: 'coupe-de-france.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'knvb-cup', type: 'DOMESTIC_CUP', competitionLabels: ['荷兰杯'], displayLabel: '荷兰杯冠军', assetFile: 'knvb-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'taca-de-portugal', type: 'DOMESTIC_CUP', competitionLabels: ['葡萄牙杯'], displayLabel: '葡萄牙杯冠军', assetFile: 'taca-de-portugal.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'belgian-cup', type: 'DOMESTIC_CUP', competitionLabels: ['比利时杯'], displayLabel: '比利时杯冠军', assetFile: 'belgian-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿有限正面参考图进行独立概念化重绘，不代表真实奖杯的精确复刻；不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'emperors-cup', type: 'DOMESTIC_CUP', competitionLabels: ['天皇杯'], displayLabel: '天皇杯冠军', assetFile: 'emperors-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'korean-fa-cup', type: 'DOMESTIC_CUP', competitionLabels: ['韩国杯'], displayLabel: '韩国杯冠军', assetFile: 'korean-fa-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'copa-do-brasil', type: 'DOMESTIC_CUP', competitionLabels: ['巴西杯'], displayLabel: '巴西杯冠军', assetFile: 'copa-do-brasil.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，保留已审核的图形化奖杯标志轮廓；不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'copa-argentina', type: 'DOMESTIC_CUP', competitionLabels: ['阿根廷杯'], displayLabel: '阿根廷杯冠军', assetFile: 'copa-argentina.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'copa-libertadores', type: 'CONTINENTAL_TITLE', competitionLabels: ['解放者杯'], displayLabel: '解放者杯冠军', assetFile: 'copa-libertadores.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'afc-champions-league-elite', type: 'CONTINENTAL_TITLE', competitionLabels: ['亚冠精英联赛'], displayLabel: '亚冠精英联赛冠军', assetFile: 'afc-champions-league-elite.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'asian-cup', type: 'ASIAN_CUP', competitionLabels: ['亚洲杯'], displayLabel: '亚洲杯冠军', assetFile: 'asian-cup.svg', visualKind: 'TROPHY', identityReferenceUrl: null, referenceStatus: 'WORKBOOK_REVIEW_REFERENCE', rightsNote: '依据用户审核工作簿正面参考图独立重绘，不含照片、官方矢量或赛事标志。' }),
  visual({ key: 'league-player-of-year', type: 'LEAGUE_PLAYER_OF_YEAR', competitionLabels: [], displayLabel: '联赛最佳球员', assetFile: 'league-player-of-year.svg', visualKind: 'ORIGINAL', identityReferenceUrl: null, referenceStatus: 'ORIGINAL_DESIGN', rightsNote: '原创球员剪影、星形与月桂奖座图形，不引用或模仿任何赛事奖杯或标志。' }),
])

export interface HonorVisualMatch {
  readonly visual: HonorVisual | null
  readonly fallbackMark: string
  readonly displayLabel: string
}

function contextualDisplayLabel(
  honor: Pick<CareerHonor, 'type' | 'competitionLabel' | 'label'>,
  visual: HonorVisual | null,
): string {
  if (!visual) return honor.label
  const competitionLabel = honor.competitionLabel.trim()
  if (!competitionLabel) return visual.displayLabel
  if (honor.type === 'GOLDEN_BOOT') return `${competitionLabel}金靴`
  if (honor.type === 'TEAM_OF_SEASON') return `${competitionLabel}最佳阵容`
  return visual.displayLabel
}

const FALLBACK_MARK_BY_TYPE: Readonly<Record<CareerHonorType, string>> = Object.freeze({
  LEAGUE_TITLE: '联',
  DOMESTIC_CUP: '杯',
  CONTINENTAL_TITLE: '洲',
  WORLD_CUP: '世',
  ASIAN_CUP: '亚',
  GOLDEN_BOOT: '靴',
  TEAM_OF_SEASON: '阵',
  LEAGUE_PLAYER_OF_YEAR: '人',
  BALLON_DOR: '金',
})

export function matchHonorVisual(honor: Pick<CareerHonor, 'type' | 'competitionLabel' | 'label'>): HonorVisualMatch {
  const visual = HONOR_VISUAL_REGISTRY.find((item) => (
    item.type === honor.type
    && (item.competitionLabels.length === 0 || item.competitionLabels.includes(honor.competitionLabel))
  )) ?? null
  return Object.freeze({
    visual,
    fallbackMark: FALLBACK_MARK_BY_TYPE[honor.type],
    displayLabel: contextualDisplayLabel(honor, visual),
  })
}
