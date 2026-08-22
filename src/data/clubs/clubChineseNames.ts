import { CLUB_PARAMETERS_V1 } from './clubParametersV1'
import { getClubParametersByCompatibleId } from './clubRepository'

const OVERSEAS_CHINESE_NAMES_BY_ID: Readonly<Record<string, string>> = Object.freeze({
  eng_arsenal: '阿森纳', eng1_chelsea: '切尔西', eng_liverpool: '利物浦', eng1_manchester_city: '曼城', eng1_manchester_united: '曼联', eng1_aston_villa: '阿斯顿维拉', eng1_newcastle_united: '纽卡斯尔联', eng1_tottenham_hotspur: '托特纳姆热刺', eng1_afc_bournemouth: '伯恩茅斯', eng1_brentford: '布伦特福德', eng_brighton: '布莱顿', eng1_crystal_palace: '水晶宫', eng1_everton: '埃弗顿', eng_fulham: '富勒姆', eng1_nottingham_forest: '诺丁汉森林', eng1_coventry_city: '考文垂', eng1_hull_city: '赫尔城', eng1_ipswich_town: '伊普斯维奇', eng1_leeds_united: '利兹联', eng1_sunderland: '桑德兰',
  eng2_burnley: '伯恩利', eng2_middlesbrough: '米德尔斯堡', eng2_sheffield_united: '谢菲尔德联', eng2_southampton: '南安普顿', eng2_west_ham_united: '西汉姆联', eng2_wolverhampton_wanderers: '狼队', eng2_birmingham_city: '伯明翰城', eng2_blackburn_rovers: '布莱克本', eng2_bolton_wanderers: '博尔顿', eng2_bristol_city: '布里斯托尔城', eng2_cardiff_city: '加的夫城', eng2_charlton_athletic: '查尔顿', eng2_derby_county: '德比郡', eng2_lincoln_city: '林肯城', eng2_millwall: '米尔沃尔', eng2_norwich_city: '诺维奇', eng2_portsmouth: '朴茨茅斯', eng2_preston_north_end: '普雷斯顿', eng2_queens_park_rangers: '女王公园巡游者', eng2_stoke_city: '斯托克城', eng2_swansea_city: '斯旺西', eng2_watford: '沃特福德', eng2_west_bromwich_albion: '西布朗维奇', eng2_wrexham: '雷克瑟姆',
  esp_barcelona: '巴塞罗那', esp_real_madrid: '皇家马德里', esp1_athletic_club: '毕尔巴鄂竞技', esp1_atletico_de_madrid: '马德里竞技', esp1_real_betis: '皇家贝蒂斯', esp1_villarreal: '比利亚雷亚尔', esp_celta: '塞尔塔', esp1_espanyol: '西班牙人', esp1_osasuna: '奥萨苏纳', esp1_rayo_vallecano: '巴列卡诺', esp_real_sociedad: '皇家社会', esp1_sevilla: '塞维利亚', esp1_valencia: '瓦伦西亚', esp1_alaves: '阿拉维斯', esp1_deportivo_la_coruna: '拉科鲁尼亚', esp1_elche: '埃尔切', esp1_getafe: '赫塔菲', esp1_levante: '莱万特', esp1_malaga: '马拉加', esp1_racing_de_santander: '桑坦德竞技',
  esp2_almeria: '阿尔梅里亚', esp2_girona: '赫罗纳', esp2_granada: '格拉纳达', esp2_las_palmas: '拉斯帕尔马斯', esp2_leganes: '莱加内斯', esp2_mallorca: '马略卡', esp2_real_valladolid: '巴拉多利德', esp2_albacete: '阿尔巴塞特', esp2_burgos: '布尔戈斯', esp2_cadiz: '加的斯', esp2_castellon: '卡斯特利翁', esp2_cordoba: '科尔多瓦', esp2_eibar: '埃瓦尔', esp2_real_oviedo: '皇家奥维耶多', esp2_sporting_de_gijon: '希洪竞技', esp2_tenerife: '特内里费', esp2_ad_ceuta: '休达', esp2_andorra: '安道尔', esp2_celta_fortuna: '塞尔塔B队', esp2_eldense: '埃登斯', esp2_real_sociedad_b: '皇家社会B队', esp2_sabadell: '萨瓦德尔',
  ita_inter: '国际米兰', ita1_ac_milan: 'AC米兰', ita_juventus: '尤文图斯', ita1_atalanta: '亚特兰大', ita1_napoli: '那不勒斯', ita1_roma: '罗马', ita1_como: '科莫', ita_bologna: '博洛尼亚', ita1_fiorentina: '佛罗伦萨', ita1_lazio: '拉齐奥', ita_torino: '都灵', ita1_cagliari: '卡利亚里', ita1_frosinone: '弗罗西诺内', ita1_genoa: '热那亚', ita1_lecce: '莱切', ita1_monza: '蒙扎', ita1_parma: '帕尔马', ita1_sassuolo: '萨索洛', ita1_udinese: '乌迪内斯', ita1_venezia: '威尼斯',
  ita2_cremonese: '克雷莫内塞', ita2_empoli: '恩波利', ita2_hellas_verona: '维罗纳', ita2_palermo: '巴勒莫', ita2_pisa: '比萨', ita2_sampdoria: '桑普多利亚', ita2_avellino: '阿韦利诺', ita2_catanzaro: '卡坦扎罗', ita2_cesena: '切塞纳', ita2_juve_stabia: '史泰比亚', ita2_l_r_vicenza: '维琴察', ita2_mantova: '曼托瓦', ita2_modena: '摩德纳', ita2_padova: '帕多瓦', ita2_sudtirol: '南蒂罗尔', ita2_arezzo: '阿雷佐', ita2_ascoli: '阿斯科利', ita2_benevento: '贝内文托', ita2_carrarese: '卡拉雷塞', ita2_virtus_entella: '恩特拉',
  ger_bayern: '拜仁慕尼黑', ger1_bayer_leverkusen: '勒沃库森', ger_dortmund: '多特蒙德', ger_frankfurt: '法兰克福', ger1_rb_leipzig: 'RB莱比锡', ger1_borussia_monchengladbach: '门兴格拉德巴赫', ger1_freiburg: '弗赖堡', ger1_hoffenheim: '霍芬海姆', ger1_stuttgart: '斯图加特', ger1_augsburg: '奥格斯堡', ger1_elversberg: '艾禾斯堡', ger1_hamburg: '汉堡', ger1_koln: '科隆', ger_mainz: '美因茨05', ger1_paderborn: '帕德博恩', ger1_schalke_04: '沙尔克04', ger1_union_berlin: '柏林联合', ger1_werder_bremen: '云达不莱梅',
  ger2_bochum: '波鸿', ger2_hertha_bsc: '柏林赫塔', ger2_st_pauli: '圣保利', ger2_wolfsburg: '沃尔夫斯堡', ger2_arminia_bielefeld: '比勒费尔德', ger2_braunschweig: '不伦瑞克', ger2_darmstadt_98: '达姆施塔特98', ger2_dynamo_dresden: '德累斯顿迪纳摩', ger2_greuther_furth: '菲尔特', ger2_hannover_96: '汉诺威96', ger2_heidenheim: '海登海姆', ger2_holstein_kiel: '荷尔斯泰因基尔', ger2_kaiserslautern: '凯泽斯劳滕', ger2_karlsruher_sc: '卡尔斯鲁厄', ger2_magdeburg: '马格德堡', ger2_nurnberg: '纽伦堡', ger2_energie_cottbus: '科特布斯', ger2_osnabruck: '奥斯纳布吕克',
  fra_psg: '巴黎圣日耳曼', fra_monaco: '摩纳哥', fra1_marseille: '马赛', fra1_olympique_lyonnais: '里昂', fra1_brest: '布雷斯特', fra1_lens: '朗斯', fra_lille: '里尔', fra1_nice: '尼斯', fra1_rennes: '雷恩', fra_strasbourg: '斯特拉斯堡', fra1_angers: '昂热', fra1_auxerre: '欧塞尔', fra1_le_havre: '勒阿弗尔', fra1_le_mans: '勒芒', fra1_lorient: '洛里昂', fra1_paris_fc: '巴黎FC', fra1_toulouse: '图卢兹', fra1_troyes: '特鲁瓦',
  fra2_metz: '梅斯', fra2_montpellier: '蒙彼利埃', fra2_nantes: '南特', fra2_reims: '兰斯', fra2_saint_etienne: '圣埃蒂安', fra2_annecy: '昂纳西', fra2_clermont_foot: '克莱蒙', fra2_dunkerque: '敦刻尔克', fra2_grenoble: '格勒诺布尔', fra2_guingamp: '甘冈', fra2_laval: '拉瓦勒', fra2_nancy: '南锡', fra2_pau: '波城', fra2_red_star: '红星', fra2_rodez: '罗德兹', fra2_sochaux: '索肖', fra2_boulogne: '布洛涅', fra2_dijon: '第戎',
  ned_ajax: '阿贾克斯', ned1_feyenoord: '费耶诺德', ned_psv: '埃因霍温', ned1_az: '阿尔克马尔', ned1_nec: '奈梅亨', ned1_twente: '特温特', ned1_utrecht: '乌德勒支', ned1_ado_den_haag: '海牙', ned1_cambuur: '坎布尔', ned1_excelsior: '精英', ned1_fortuna_sittard: '福图纳锡塔德', ned1_go_ahead_eagles: '前进之鹰', ned1_groningen: '格罗宁根', ned1_heerenveen: '海伦芬', ned1_pec_zwolle: '兹沃勒', ned1_sparta_rotterdam: '鹿特丹斯巴达', ned1_telstar: '特尔斯达', ned1_willem_ii: '威廉二世',
  por_benfica: '本菲卡', por_porto: '波尔图', por1_sporting_cp: '葡萄牙体育', por1_braga: '布拉加', por1_famalicao: '法马利康', por1_vitoria_sc: '吉马良斯', por1_academico_de_viseu: '维塞乌学院', por1_alverca: '阿尔维卡', por1_arouca: '阿罗卡', por1_casa_pia: '卡萨皮亚', por1_estoril_praia: '埃斯托里尔', por1_estrela_da_amadora: '阿马多拉之星', por1_gil_vicente: '吉维森特', por1_maritimo: '马里迪莫', por1_moreirense: '莫雷拉人', por1_nacional: '国民', por1_rio_ave: '里奥阿维', por1_santa_clara: '圣克拉拉',
  bel_anderlecht: '安德莱赫特', bel_brugge: '布鲁日', bel1_union_saint_gilloise: '圣吉罗斯联合', bel1_antwerp: '安特卫普', bel1_genk: '亨克', bel1_gent: '根特', bel1_cercle_brugge: '色格拉布鲁日', bel1_charleroi: '沙勒罗瓦', bel1_kortrijk: '科特赖克', bel1_la_louviere: '拉卢维耶尔', bel1_lommel: '洛默尔', bel1_mechelen: '梅赫伦', bel1_oh_leuven: '旧海弗莱鲁汶', bel1_sint_truiden: '圣图尔登', bel1_standard_liege: '标准列日', bel1_waasland_beveren: '瓦斯兰贝弗伦', bel1_westerlo: '韦斯特洛', bel1_zulte_waregem: '瓦勒海姆聚尔特',
  jpn1_cerezo_osaka: '大阪樱花', jpn1_gamba_osaka: '大阪钢巴', jpn1_kashima_antlers: '鹿岛鹿角', jpn1_kashiwa_reysol: '柏太阳神', jpn1_kawasaki_frontale: '川崎前锋', jpn1_nagoya_grampus: '名古屋鲸鱼', jpn1_sanfrecce_hiroshima: '广岛三箭', jpn_urawa: '浦和红钻', jpn_vissel: '神户胜利船', jpn1_yokohama_f_marinos: '横滨水手', jpn1_avispa_fukuoka: '福冈黄蜂', jpn1_fc_tokyo: '东京FC', jpn1_fagiano_okayama: '冈山绿雉', jpn1_jef_united_chiba: '千叶市原', jpn1_kyoto_sanga: '京都不死鸟', jpn1_machida_zelvia: '町田泽维亚', jpn1_mito_hollyhock: '水户蜀葵', jpn1_shimizu_s_pulse: '清水心跳', jpn1_tokyo_verdy: '东京绿茵', jpn1_v_varen_nagasaki: '长崎成功丸',
  kor1_fc_seoul: '首尔FC', kor_jeonbuk: '全北现代', kor1_pohang_steelers: '浦项制铁', kor_ulsan: '蔚山HD', kor1_bucheon_fc_1995: '富川FC1995', kor1_daejeon_hana_citizen: '大田韩亚市民', kor1_fc_anyang: '安养FC', kor1_gangwon_fc: '江原FC', kor1_gimcheon_sangmu: '金泉尚武', kor1_gwangju_fc: '光州FC', kor1_incheon_united: '仁川联', kor1_jeju_sk: '济州SK',
  bra_flamengo: '弗拉门戈', bra_palmeiras: '帕尔梅拉斯', bra1_atletico_mineiro: '米内罗竞技', bra1_botafogo: '博塔弗戈', bra1_corinthians: '科林蒂安', bra1_cruzeiro: '克鲁塞罗', bra1_fluminense: '弗鲁米嫩塞', bra1_gremio: '格雷米奥', bra1_internacional: '巴西国际', bra1_santos: '桑托斯', bra1_sao_paulo: '圣保罗', bra1_vasco_da_gama: '瓦斯科达伽马', bra1_athletico_paranaense: '巴拉纳竞技', bra1_bahia: '巴伊亚', bra1_chapecoense: '沙佩科恩斯', bra1_coritiba: '科里蒂巴', bra1_mirassol: '米拉索尔', bra1_red_bull_bragantino: '布拉干蒂诺红牛', bra1_remo: '雷莫', bra1_vitoria: '维多利亚',
  arg_boca: '博卡青年', arg_river: '河床', arg1_estudiantes_de_la_plata: '拉普拉塔大学生', arg1_independiente: '独立', arg1_lanus: '拉努斯', arg1_newell_s_old_boys: '纽维尔老男孩', arg1_racing_club: '竞技', arg1_rosario_central: '罗萨里奥中央', arg1_san_lorenzo: '圣洛伦索', arg1_talleres: '塔勒瑞斯', arg1_velez_sarsfield: '萨斯菲尔德', arg1_aldosivi: '阿尔多斯维', arg1_argentinos_juniors: '阿根廷青年人', arg1_atletico_tucuman: '图库曼竞技', arg1_banfield: '班菲尔德', arg1_barracas_central: '巴拉卡斯中央', arg1_belgrano: '贝尔格拉诺', arg1_central_cordoba: '科尔多瓦中央', arg1_defensa_y_justicia: '国防与司法', arg1_deportivo_riestra: '利斯特拉', arg1_estudiantes_de_rio_cuarto: '里奥夸尔托大学生', arg1_gimnasia_la_plata: '拉普拉塔体操', arg1_gimnasia_mendoza: '门多萨体操', arg1_huracan: '飓风', arg1_independiente_rivadavia: '里瓦达维亚独立', arg1_instituto: '因斯蒂图托', arg1_platense: '普拉滕斯', arg1_sarmiento: '萨米恩托', arg1_tigre: '堤格雷', arg1_union: '圣菲联合',
})

function hasChineseCharacter(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value)
}

function nameForParameter(parameter: (typeof CLUB_PARAMETERS_V1)[number]): string {
  const name = parameter.country === '中国'
    ? parameter.name
    : OVERSEAS_CHINESE_NAMES_BY_ID[parameter.id]
  if (!name || !hasChineseCharacter(name)) {
    throw new Error(`Missing Chinese display name for ${parameter.id} (${parameter.name}).`)
  }
  return name
}

/** Canonical runtime ID → player-facing Simplified Chinese club name. */
export const CLUB_CHINESE_NAMES_BY_ID: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    CLUB_PARAMETERS_V1.map((parameter) => [parameter.id, nameForParameter(parameter)]),
  ),
)

if (Object.keys(CLUB_CHINESE_NAMES_BY_ID).length !== CLUB_PARAMETERS_V1.length) {
  throw new Error('Chinese club-name catalog must cover every runtime club ID.')
}

export function clubChineseNameByCanonicalId(id: string): string | null {
  return CLUB_CHINESE_NAMES_BY_ID[id] ?? null
}

/** Resolves canonical and workbook IDs without rewriting old snapshot data. */
export function clubDisplayNameForCompatibleId(
  id: string | null | undefined,
  fallbackName: string,
): string {
  if (!id) return fallbackName
  const canonicalId = getClubParametersByCompatibleId(id)?.id
  return canonicalId ? CLUB_CHINESE_NAMES_BY_ID[canonicalId]! : fallbackName
}

export function chineseClubShortMark(name: string): string {
  return name.match(/[\u3400-\u9fff]/)?.[0] ?? name.slice(0, 1)
}
