/**
 * Manually identity-checked mappings from workbook IDs to the 40 canonical
 * runtime IDs persisted by the pre-V1 database. Do not infer entries by name.
 */
export const WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID = Object.freeze({
  chn1_shanghai_donggang: 'cn_shanghai_donggang',
  chn1_beijing_yuhua: 'cn_beijing_yuhua',
  chn1_wuhan_jiangcheng: 'cn_wuhan_jiangcheng',
  chn1_chengdu_jincheng: 'cn_chengdu_jincheng',
  chn2_guangxi_liancheng: 'cn_guangxi_liancheng',
  chn2_yunnan_shanhe: 'cn_yunnan_shanhe',
  eng1_arsenal: 'eng_arsenal',
  eng1_liverpool: 'eng_liverpool',
  eng1_brighton_and_hove_albion: 'eng_brighton',
  eng1_fulham: 'eng_fulham',
  esp1_real_madrid: 'esp_real_madrid',
  esp1_fc_barcelona: 'esp_barcelona',
  esp1_real_sociedad: 'esp_real_sociedad',
  esp1_celta_de_vigo: 'esp_celta',
  ita1_inter: 'ita_inter',
  ita1_juventus: 'ita_juventus',
  ita1_bologna: 'ita_bologna',
  ita1_torino: 'ita_torino',
  ger1_bayern_munchen: 'ger_bayern',
  ger1_borussia_dortmund: 'ger_dortmund',
  ger1_eintracht_frankfurt: 'ger_frankfurt',
  ger1_mainz_05: 'ger_mainz',
  fra1_paris_saint_germain: 'fra_psg',
  fra1_as_monaco: 'fra_monaco',
  fra1_lille: 'fra_lille',
  fra1_strasbourg: 'fra_strasbourg',
  ned1_ajax: 'ned_ajax',
  ned1_psv: 'ned_psv',
  por1_benfica: 'por_benfica',
  por1_fc_porto: 'por_porto',
  bel1_club_brugge: 'bel_brugge',
  bel1_anderlecht: 'bel_anderlecht',
  jpn1_urawa_red_diamonds: 'jpn_urawa',
  jpn1_vissel_kobe: 'jpn_vissel',
  kor1_ulsan_hd: 'kor_ulsan',
  kor1_jeonbuk_hyundai_motors: 'kor_jeonbuk',
  bra1_palmeiras: 'bra_palmeiras',
  bra1_flamengo: 'bra_flamengo',
  arg1_river_plate: 'arg_river',
  arg1_boca_juniors: 'arg_boca',
} as const)

export type WorkbookIdWithLegacyRuntimeId =
  keyof typeof WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID

export const CANONICAL_RUNTIME_ID_TO_WORKBOOK_ID = Object.freeze(
  Object.fromEntries(
    Object.entries(WORKBOOK_ID_TO_CANONICAL_RUNTIME_ID).map(
      ([workbookId, runtimeId]) => [runtimeId, workbookId],
    ),
  ),
) as Readonly<Record<string, WorkbookIdWithLegacyRuntimeId>>
