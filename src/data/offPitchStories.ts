import type { CareerEventChoice, CareerEventDefinition } from '../engine/careerEvents'
import type { GameState, PlayerEventDelta } from '../models/game'
import type { OffPitchStoryEventId, PublicImpressionId } from '../models/offPitchStories'
import { V3_STORY_CHAINS } from '../models/offPitchStories'
import { playerAgeAtWindow } from '../engine/careerTime'
import { getRecentLivingCityMove } from '../engine/livingCity'
import { CLUBS } from './balance'

export { V3_STORY_EVENT_IDS } from '../models/offPitchStories'

// Stage gate: lookup keeps all saved IDs readable; selection begins with six nodes.
// The integrator enables the remaining fourteen only after the first-loop review.
export const V3_FULL_CONTENT_ENABLED = true
export const V3_FIRST_SIX_EVENT_IDS: readonly OffPitchStoryEventId[] = [
  'V3_E01_PRESS_DRINK', 'V3_E02_AD_TEAMMATE', 'V3_E03_INTERVIEW_CLIP',
  'V3_E04_FAN_SCHEDULE', 'V3_C01A_LOCAL_CAR', 'V3_C01B_LOCAL_CAR_RETURN',
]

export function v3StoriesAreActive(state: GameState): boolean {
  return Boolean(state.entertainmentV3 &&
    state.entertainmentV3.activationWindowIndex <= state.windowIndex)
}

export function isAdultProfessional(state: GameState): boolean {
  return v3StoriesAreActive(state) && Boolean(state.player && state.selectedClubId &&
    state.contract && state.contract.remainingHalfYears > 0 && state.contract.clubId === state.selectedClubId &&
    playerAgeAtWindow(state.windowIndex) >= 18 && !state.retirementReason &&
    state.phase !== 'CAREER_RETIRED')
}

/** A prior invitation or a refusal is not an advertising appearance. */
export function hasActualCommercialHistory(state: GameState): boolean {
  return state.careerEventHistory.some((record) => record.windowIndex < state.windowIndex && (
    (record.eventId === 'SPONSOR_APPEARANCE' && ['A', 'B'].includes(record.choiceId)) ||
    (record.eventId === 'LOW_KEY_COMMERCIAL_EXPOSURE' && ['B', 'C'].includes(record.choiceId)) ||
    (record.eventId === 'V3_C01A_LOCAL_CAR' && ['FULL', 'SHORT'].includes(record.choiceId)) ||
    (record.eventId === 'V3_C01B_LOCAL_CAR_RETURN' && ['FULL', 'SHORT'].includes(record.choiceId))
  ))
}

export function hasRecentActualCityMove(state: GameState): boolean {
  const city = state.entertainmentV3?.livingCity
  return Boolean(city && getRecentLivingCityMove(city, state.windowIndex, 1))
}

function hasFirstTeamAppearance(state: GameState): boolean {
  return state.history.some((entry) => entry.windowIndex < state.windowIndex &&
    entry.teamLevel === 'FIRST_TEAM' && entry.stats.appearances > 0)
}

const RECORDED_MEDIA_EVENTS = new Set([
  'MEDIA_BREAKTHROUGH', 'ONLINE_CRITICISM', 'FAN_DAY_OR_REST', 'INTERVIEW_MISQUOTE',
  'SPONSOR_APPEARANCE', 'LOW_KEY_COMMERCIAL_EXPOSURE', 'TEAM_SPOKESPERSON_REQUEST',
  'V3_E01_PRESS_DRINK', 'V3_E03_INTERVIEW_CLIP', 'V3_E04_FAN_SCHEDULE',
  'V3_E05_OLD_POST', 'V3_E09_LOCAL_RADIO', 'V3_C02A_PUBLIC_RESPONSE',
])

function hasRecordedMediaExperience(state: GameState): boolean {
  return state.careerEventHistory.some((record) => record.windowIndex < state.windowIndex &&
    RECORDED_MEDIA_EVENTS.has(record.eventId))
}

function hasNewOverseasLanguageEnvironment(state: GameState): boolean {
  const city = state.entertainmentV3?.livingCity
  const club = CLUBS.find((candidate) => candidate.id === state.selectedClubId)
  if (!city || !club || club.country === '中国' || !getRecentLivingCityMove(city, state.windowIndex, 3)) return false
  let tenure = 0
  for (const entry of [...state.history].reverse()) {
    if (entry.windowIndex >= state.windowIndex) continue
    if (entry.clubId !== state.selectedClubId) break
    tenure += 1
  }
  return tenure < 4
}

export function canMentorYoungTeammate(state: GameState): boolean {
  if (!isAdultProfessional(state) || playerAgeAtWindow(state.windowIndex) < 25 ||
    state.teamLevel !== 'FIRST_TEAM' ||
    (!['STARTER', 'CORE'].includes(state.firstTeamRole ?? '') &&
      !(state.careerStory.club.clubId === state.selectedClubId && state.careerStory.club.leadership === 'CAPTAIN'))) return false
  let tenure = 0
  for (const entry of [...state.history].reverse()) {
    if (entry.windowIndex >= state.windowIndex) continue
    if (entry.clubId !== state.selectedClubId || entry.teamLevel !== 'FIRST_TEAM') break
    tenure += 1
  }
  return tenure >= 2 && hasFirstTeamAppearance(state)
}

function completed(state: GameState, id: OffPitchStoryEventId): boolean {
  return Boolean(state.entertainmentV3?.stories.completedNodeIds.includes(id) ||
    state.careerEventHistory.some((record) => record.eventId === id))
}

function nodeEligible(id: OffPitchStoryEventId, extra?: (state: GameState) => boolean) {
  const chainEntry = Object.entries(V3_STORY_CHAINS).find(([, chain]) =>
    chain.first === id || chain.followup === id)
  return (state: GameState): boolean => {
    if (!isAdultProfessional(state) || completed(state, id)) return false
    if (chainEntry) {
      const [chainId, chain] = chainEntry
      const active = state.entertainmentV3?.stories.activeChain
      if (chain.first === id && active) return false
      if (chain.followup === id && (!active || active.chainId !== chainId ||
        active.followupEventId !== id || state.windowIndex < active.availableFromWindowIndex ||
        state.windowIndex > active.expiresAfterWindowIndex ||
        (chain.clubBound && active.clubId !== state.selectedClubId))) return false
    }
    return extra?.(state) ?? true
  }
}

function choice(
  id: string, title: string, description: string, effectPreview: string,
  outcomeSummary: string, playerDelta: PlayerEventDelta = {},
  options: { cash?: number; persona?: PublicImpressionId } = {},
): CareerEventChoice {
  return {
    id, title, description, effectPreview, outcomeSummary, playerDelta,
    ...(options.cash === undefined ? {} : { cashDeltaEuro: options.cash }),
    ...(options.cash !== undefined && options.cash < 0
      ? { isEligible: (state: GameState) => state.cashEuro >= -(options.cash ?? 0) } : {}),
    ...(options.persona ? { storyEffect: { publicPersona: options.persona } } : {}),
  }
}

function event(
  id: OffPitchStoryEventId, category: CareerEventDefinition['category'],
  title: string, description: string, choices: readonly CareerEventChoice[],
  extra?: (state: GameState) => boolean,
): CareerEventDefinition {
  const chainId = Object.entries(V3_STORY_CHAINS).find(([, chain]) =>
    chain.first === id || chain.followup === id)?.[0]
  return {
    id, groupId: `V3_OFF_PITCH_${chainId ?? id}`, category, priority: 'P4',
    cooldownWindows: 0, interactionKind: 'CHOICE', eyebrow: '场外生活 · 一段小事',
    title, description, weight: 1, isEligible: nodeEligible(id, extra), choices,
  }
}

/** Only for an already-pending pre-patch event that cannot fund the new sponsor tradeoff. */
export const LEGACY_PRESS_DRINK_EVENT = event('V3_E01_PRESS_DRINK', 'MEDIA', '发布会桌上，多了一瓶你够不着的饮料。',
    '工作人员刚摆好桌面，瓶子却正好挡住话筒。主持人还在调试声音，留给你一个轻松的空当。', [
      choice('MOVE', '把瓶子挪到一旁', '先给话筒腾出位置，不把小事变成新闻。', '无费用 · 无数值影响', '你把瓶子移开，主持人试了试话筒，发布会顺利开始。', {}, { persona: 'LOW_KEY' }),
      choice('JOKE', '问它是不是也要接受采访', '用一个小玩笑化解桌面的拥挤。', '媒体关系+1 · 不保证舆论反应', '主持人笑着接过话头，你们把话题带回了足球。', { mediaRelation: 1 }),
      choice('STAFF', '礼貌请工作人员帮忙', '把现场安排交给熟悉流程的人。', '无费用 · 无数值影响', '工作人员重新摆好桌面，你道了声谢，采访照常进行。'),
    ], (state) => hasFirstTeamAppearance(state) || hasRecordedMediaExperience(state))

/** Twenty fixed, reviewable nodes, all competing for the existing event slot. */
export const V3_STORY_EVENTS: readonly CareerEventDefinition[] = [
  event('V3_E01_PRESS_DRINK', 'MEDIA', '发布会的矿泉水瓶',
    '你刚签下个人矿泉水赞助合作。新闻发布会上，你发现身前摆着竞品，镜头已经对准桌面。', [
      choice('IGNORE', '无视这个矿泉水', '照常回答问题，不打断媒体的采访节奏。', '媒体关系小幅上升 · 赞助收入下降', '你没有理会镜头前的竞品，采访顺畅进行。媒体感谢你的配合，个人赞助商则在本次合作结算中扣减€200。', { mediaRelation: 1 }, { cash: -200 }),
      choice('TURN', '把矿泉水 logo 转向背面', '照顾自己的赞助合作，但这个动作打断了采访。', '媒体关系小幅下降 · 赞助收入上升', '你把竞品标识转到背面。现场媒体对采访被打断略有不满，个人赞助商因你维护品牌权益，在本次合作结算中追加€400。', { mediaRelation: -1 }, { cash: 400 }),
      choice('DRINK', '拿起来喝一口', '自然地喝口水，却把竞品带进了特写镜头。', '媒体关系上升 · 赞助收入明显下降', '你拿起竞品喝了一口，媒体得到了自然的现场画面。但个人赞助商认为这损害了品牌权益，在本次合作结算中扣减€400。', { mediaRelation: 2 }, { cash: -400 }),
    ], (state) => state.cashEuro >= 400 && (hasFirstTeamAppearance(state) || hasRecordedMediaExperience(state))),
  event('V3_E02_AD_TEAMMATE', 'TEAM', '队友模仿起了你广告里的那句台词。',
    '你确实参加过商业合作。今天更衣室有人拿那段广告打趣，还把最后一个字故意拖得很长。', [
      choice('LAUGH', '自己补上下一句台词', '接住玩笑，不让广告成为包袱。', '队内关系+2 · 无费用', '你抢先念完下一句，笑声留在更衣室里，没有发展成新的拍摄任务。', { squadRelation: 2 }, { persona: 'TEAM_FIRST' }),
      choice('DINNER', '请大家喝杯咖啡', '用一次小请客结束今天的广告复刻。', '花费€200 · 队内关系+3', '你为训练后的咖啡买了单，也郑重宣布今天的广告频道到此结束。', { squadRelation: 3 }, { cash: -200, persona: 'TEAM_FIRST' }),
      choice('BOUNDARY', '笑着说，训练时别再循环播放', '说清自己的边界，不攻击开玩笑的人。', '心理状态+1 · 无费用', '你说明不想让广告占满训练日，队友知道了你的边界。', { morale: 1 }, { persona: 'LOW_KEY' }),
    ], hasActualCommercialHistory),
  event('V3_E03_INTERVIEW_CLIP', 'MEDIA', '一段采访被剪成了十几秒的短视频。',
    '你谈的是训练中的一次普通失误，短视频却没有保留前后两句。俱乐部愿意帮你提供原始语境。', [
      choice('CONTEXT', '附上完整语境', '只补充这段话前后的意思。', '媒体关系+2 · 无费用', '你把完整语境放在回应里，没有把每条评论都变成一次争论。', { mediaRelation: 2 }),
      choice('CLUB', '请俱乐部代为说明', '由媒体工作人员统一提供原片。', '心理状态+2 · 无费用', '俱乐部提供了完整片段，你把注意力留给自己的生活和训练。', { morale: 2 }, { persona: 'LOW_KEY' }),
      choice('DIRECT', '简短重申自己的本意', '直接说明观点，不评价转发者。', '媒体关系+1 · 心理状态+1', '你把想说的话讲清，随后关掉评论页面，让回应停在这里。', { mediaRelation: 1, morale: 1 }, { persona: 'OUTSPOKEN' }),
    ], (state) => hasFirstTeamAppearance(state) || hasRecordedMediaExperience(state)),
  event('V3_E04_FAN_SCHEDULE', 'MEDIA', '球迷活动撞上了你早已留好的私人时间。',
    '俱乐部问你能否参加一次见面活动。对方愿意接受缩短出席或提前录制问候，不要求你取消原有安排。', [
      choice('SHORT', '参加前半小时', '提前讲明离场时间，不临时失约。', '球迷关系+2 · 身体状态-1', '你按约定参加了前半小时，向等候的球迷说明后便准时离开。', { fanRelation: 2, fitness: -1 }, { persona: 'TEAM_FIRST' }),
      choice('VIDEO', '提前录一段问候', '把见面改成短视频，保留私人时间。', '球迷关系+1 · 无费用', '活动播放了你的问候，主持人也解释了你事先沟通好的安排。', { fanRelation: 1 }),
      choice('PRIVATE', '礼貌说明这次不能到场', '不解释私人细节，也不作未经确认的新承诺。', '心理状态+1 · 无费用', '你在活动前说明无法到场，工作人员及时调整了名单。', { morale: 1 }, { persona: 'LOW_KEY' }),
    ]),
  event('V3_E05_OLD_POST', 'MEDIA', '一条旧帖，又被人翻了出来。',
    '那是你早些时候写下的一句训练感想。现在的你未必还会这样表达，记者问你是否愿意补充。', [
      choice('CHANGE', '承认自己的想法在变化', '不用假装从来没有不同看法。', '心理状态+1 · 媒体关系+1', '你说明经历如何改变了表达，没有把过去的自己包装成永远正确的人。', { morale: 1, mediaRelation: 1 }),
      choice('EXPLAIN', '解释当时的具体处境', '交代背景，但不借此攻击别人。', '媒体关系+2 · 无费用', '你补充了当时的背景，也提醒大家不要只用一句话概括一个阶段。', { mediaRelation: 2 }),
      choice('STAND', '保留观点，换一种更清楚的说法', '坚持意见，也愿意修正不准确的措辞。', '心理状态+2 · 无费用', '你保留了那条观点的核心，重新说清了自己愿意承担的意思。', { morale: 2 }, { persona: 'OUTSPOKEN' }),
    ]),
  event('V3_E06_FAMILY_VISIT', 'TEAM', '家人难得来探望，冰箱却只有半盒酸奶。',
    '这次探望已经约好，不是紧急情况。你可以在正常训练以外留些时间，也可以请人帮忙安排生活琐事。', [
      choice('TIME', '空出一个休息晚间', '按球队原有训练安排完成工作，晚上留给家人。', '心理状态+2 · 无费用', '你们一起补齐了冰箱，也聊了些与比赛无关的事。没有因此跳过训练。', { morale: 2 }, { persona: 'LOW_KEY' }),
      choice('HELP', '请人协助接送和安排行程', '少跑几趟，把相处时间留得完整些。', '花费€300 · 心理状态+3', '接送和行程有人协助，你没有把团聚变成另一张赶时间的清单。', { morale: 3 }, { cash: -300 }),
      choice('SIMPLE', '说明训练表，简单吃顿饭', '不安排密集行程，诚实说清时间。', '心理状态+2 · 无费用', '你们照着训练表安排了一顿饭，简单但没有临时爽约。', { morale: 2 }),
    ]),
  event('V3_E07_LANGUAGE_MIXUP', 'TEAM', '新城市的第一堂“更衣室语言课”。',
    '搬城之后，你还在熟悉这里的表达。队友一句当地说法让你以为要加练，其实只是问你要不要一起吃饭。', [
      choice('ASK', '直接问这句话是什么意思', '把没听懂说出来，省得越猜越远。', '队内关系+1 · 心理状态+1', '队友解释了那句当地说法，也顺手教了你一句点餐用语。', { squadRelation: 1, morale: 1 }),
      choice('JOKE', '说自己差点穿着球鞋去餐厅', '先承认误会，再和大家一起笑一笑。', '队内关系+2 · 心理状态-1', '笑声让午餐热闹起来，你也有一点成了全桌焦点的小尴尬。', { squadRelation: 2, morale: -1 }, { persona: 'TEAM_FIRST' }),
      choice('EXPLAIN', '请熟悉的队友慢慢解释', '不用装懂，也不必当众表演。', '心理状态+2 · 无费用', '你私下问清了意思，把那句表达记进手机。适应新城市可以慢慢来。', { morale: 2 }, { persona: 'LOW_KEY' }),
    ], hasNewOverseasLanguageEnvironment),
  event('V3_E08_NEW_NEIGHBOR', 'TEAM', '新邻居问，你家门口的纸箱还留着吗？',
    '你刚搬来，还在收拾住处。邻居不是来索要签名，而是想借一个纸箱寄东西。', [
      choice('BOX', '把空箱子送过去', '聊两句附近的生活便利，不谈比赛。', '心理状态+1 · 无费用', '你把纸箱送过去，换来了一份附近商店的实用建议。', { morale: 1 }),
      choice('PRIVACY', '交给门卫转交，礼貌致意', '帮上小忙，同时保留住处的边界。', '无费用 · 无数值影响', '纸箱顺利转交，你也用礼貌的方式保留了私人空间。', {}, { persona: 'LOW_KEY' }),
      choice('WELCOME', '顺便买些点心，打个招呼', '把这当成认识邻里的小机会。', '花费€100 · 心理状态+2', '一盒点心和几个纸箱成了新住处的第一段邻里记忆。', { morale: 2 }, { cash: -100 }),
    ], hasRecentActualCityMove),
  event('V3_E09_LOCAL_RADIO', 'MEDIA', '本地电台留了一个不谈战术的十分钟。',
    '主持人准备了三个轻松话题：在城里的日常、球队里的小习惯，或者你的家乡。你可以自己决定分享多少。', [
      choice('DAILY', '分享一个不涉及住址的日常', '聊聊买菜和做饭，不公开生活路线。', '球迷关系+2 · 无费用', '你讲了一个做饭的小插曲，保留了住址和通勤路线的隐私。', { fanRelation: 2 }),
      choice('TEAM', '说说球队的小习惯', '只说可以公开的训练日常，不点名取笑队友。', '队内关系+2 · 无费用', '你把轻松的话题留给整支球队，电台里响起了属于大家的小笑话。', { squadRelation: 2 }, { persona: 'TEAM_FIRST' }),
      choice('HOME', '介绍一道家乡菜', '让远方的家乡在电台里占十分钟。', '心理状态+2 · 无费用', '主持人认真记下了菜名，采访以一段不需要争论的家乡故事收尾。', { morale: 2 }, { persona: 'LOW_KEY' }),
    ], hasFirstTeamAppearance),
  event('V3_E10_TEAM_PHOTO', 'TEAM', '球队合照里，大家都想站得高一点。',
    '摄影师重新安排站位，有人踮脚，有人躲在后排。旁边的一位年轻球员看起来不太自在。', [
      choice('FOLLOW', '按摄影师的安排站好', '配合流程，让大家早点结束拍摄。', '无费用 · 无数值影响', '你站回指定位置，这张合照终于不再需要第七次重拍。'),
      choice('JOKE', '主动认领最矮的那块踏板', '拿自己开个玩笑，不拿别人作比较。', '无费用 · 无数值影响', '你主动站上小踏板，笑声让拍摄轻松了一点。'),
      choice('HELP', '给紧张的年轻队友留个位置', '问清对方愿不愿意，再一起站好。', '无费用 · 无数值影响', '你先问了他的意思，再挪出一点空间。合照里多了一张放松的笑脸。', {}, { persona: 'TEAM_FIRST' }),
    ]),
  event('V3_E11_COMMUTE', 'TEAM', '去训练基地的路上，车站临时换了站台。',
    '你提前出门，时间还算充裕。路标有点绕，一位认出你的球迷正好也在查看路线。', [
      choice('ASK', '向站务人员问清路线', '先确认信息，不靠猜测赶车。', '无费用 · 无数值影响', '站务人员指出了临时通道，你按时到达，没有把小插曲变成迟到故事。', {}, { persona: 'LOW_KEY' }),
      choice('CHAT', '和球迷一起核对站台', '聊几句日常，但不公开住处和固定行程。', '球迷关系+1 · 无费用', '你们一起找到了站台，短暂交谈没有涉及私人路线。', { fanRelation: 1 }),
      choice('TAXI', '改乘出租车', '花一点钱，少折腾一次。', '花费€25 · 无状态或能力增益', '你改乘出租车到达基地，这只是一次交通开销。', {}, { cash: -25 }),
    ]),
  event('V3_E12_FAN_GIFT', 'MEDIA', '球迷送来一本手工装订的小册子。',
    '里面是对方画的球衣和看台，没有贵重物品。工作人员已经按俱乐部规则检查，可以收下或礼貌致谢。', [
      choice('KEEP', '收下，写一句私人感谢', '把它当成一份心意，不扩大宣传。', '心理状态+2 · 无费用', '你写下了简短感谢，把小册子放进生涯纪念盒。', { morale: 2 }, { persona: 'LOW_KEY' }),
      choice('THANK', '征得同意后公开感谢作品', '不公开对方的姓名和个人信息。', '球迷关系+2 · 无费用', '作品在获得同意后得到感谢，送礼者的私人信息没有被公开。', { fanRelation: 2 }),
      choice('CLUB', '请俱乐部礼貌代为致谢', '不收下实物，也认真回应这份心意。', '球迷关系+1 · 心理状态+1', '工作人员转达了你的感谢，礼物按对方意愿交还或留在俱乐部。', { fanRelation: 1, morale: 1 }),
    ]),
  event('V3_C01A_LOCAL_CAR', 'MEDIA', '本地代步品牌“路伴”想借你半天时间。',
    '“路伴”是一家本地代步品牌，愿意为活动提供用车和拍摄酬劳。你可以商量活动强度，也可以拒绝；活动用车结束后归还。', [
      choice('FULL', '完成半天拍摄和一次到店见面', '接受较完整的公开安排，少留一些恢复时间。', '现金+€800 · 身体状态-2 · 球迷关系+1', '你完成了约定的半天拍摄与到店见面，收到€800酬劳；当天恢复时间少了一些。', { fitness: -2, fanRelation: 1 }, { cash: 800 }),
      choice('SHORT', '只接一小时的简短拍摄', '把活动范围写清，保留更多私人和恢复时间。', '现金+€400 · 身体状态-1', '品牌接受了一小时的精简拍摄，你按明确的范围完成合作，收到€400。', { fitness: -1 }, { cash: 400, persona: 'LOW_KEY' }),
      choice('DECLINE', '礼貌婉拒这次合作', '不拿酬劳，也不承诺未来一定参加。', '无费用 · 无数值影响', '你明确婉拒了这次合作，没有收取酬劳或承担拍摄义务。', {}, { persona: 'LOW_KEY' }),
    ], (state) => state.history.some((entry) => entry.windowIndex < state.windowIndex && entry.stats.appearances > 0)),
  event('V3_C01B_LOCAL_CAR_RETURN', 'MEDIA', '“路伴”带来了一份范围更清楚的新邀约。',
    '对方记得上回的联系，带来了一份新的活动安排，想听听你的意见。你仍然可以选择不合作。', [
      choice('FULL', '参加一次半天的公开活动', '这次仍要花时间，不因为熟悉品牌就免去代价。', '现金+€600 · 身体状态-2 · 球迷关系+1', '你完成了这次约定的公开活动，收到€600，恢复时间也按活动强度相应减少。', { fitness: -2, fanRelation: 1 }, { cash: 600 }),
      choice('SHORT', '只做一次远程简短访谈', '把合作压缩成不需要到店的部分。', '现金+€200 · 心理状态-1', '你按约完成了远程访谈，收到€200，也为沟通花了一点精力。', { morale: -1 }, { cash: 200 }),
      choice('CLOSE', '感谢邀请，这次不接', '不把曾经的选择变成长期义务。', '无费用 · 无数值影响', '你礼貌结束了这次洽谈，没有新增酬劳或后续义务。', {}, { persona: 'LOW_KEY' }),
    ]),
  event('V3_C02A_PUBLIC_RESPONSE', 'MEDIA', '一次普通的训练调整，引来了公开提问。',
    '球队刚调整了一项日常训练安排。记者问你，球员有不同意见时，应该怎样把话说清楚？', [
      choice('DIRECT', '直说分歧可以被讨论', '表达自己的态度，不指控具体的人。', '媒体关系+1 · 心理状态-1', '你说清了自己愿意讨论不同意见，也花了一点精力回答随后的追问。', { mediaRelation: 1, morale: -1 }, { persona: 'OUTSPOKEN' }),
      choice('TEAM', '先说共同的训练目标', '承认表达会有差异，也强调合作。', '队内关系+1 · 无费用', '你把回答放回共同目标，没有替任何队友宣布立场。', { squadRelation: 1 }, { persona: 'TEAM_FIRST' }),
      choice('PRIVATE', '把具体讨论留在内部', '说明边界，不制造神秘的内幕。', '心理状态+1 · 无费用', '你说明愿意在内部认真沟通，不把日常讨论包装成新闻。', { morale: 1 }, { persona: 'LOW_KEY' }),
    ]),
  event('V3_C02B_PUBLIC_RESPONSE_RETURN', 'MEDIA', '那位记者又问：你现在还会这样回答吗？',
    '记者翻出了上回的采访，想知道你现在是否还认同那番话。你可以延续原意，也可以换一种说法。', [
      choice('CONTINUE', '保留原意，补一句现在的理解', '不为了前后一致而否认新的感受。', '媒体关系+1 · 无费用', '你解释了哪些想法没有改变，也补充了现在更在意的部分。', { mediaRelation: 1 }),
      choice('CHANGE', '承认现在会换一种说法', '把变化说清，不编造使你转变的比赛。', '心理状态+1 · 无费用', '你坦然承认表达在变化，没有把改变说成对任何人的否定。', { morale: 1 }),
      choice('CLOSE', '不再延长这个话题', '让上次回答留在它发生的时刻。', '心理状态+1 · 无费用', '你礼貌结束回访，终于可以把手机收回口袋。', { morale: 1 }, { persona: 'LOW_KEY' }),
    ]),
  event('V3_C03A_YOUNG_TEAMMATE', 'TEAM', '一位年轻队友把训练笔记递给了你。',
    '训练后，一位年轻队友翻开记得密密麻麻的小本子，想听听你怎样安排训练和生活。说到作息，他有些不好意思。', [
      choice('TIME', '每周留一次简短交流', '只承诺自己能做到的时间，不代替教练安排。', '队内关系+2 · 心理状态-1', '你和他约好简短交流的边界，愿意分享经验，但没有承诺比赛机会。', { squadRelation: 2, morale: -1 }, { persona: 'TEAM_FIRST' }),
      choice('NOTES', '分享一页自己用过的记录方法', '给出可尝试的方法，让他自己决定是否使用。', '队内关系+1 · 无费用', '你分享了记录方法，提醒他仍要按教练要求训练。', { squadRelation: 1 }, { persona: 'TEAM_FIRST' }),
      choice('INTRO', '介绍合适的球队工作人员', '不勉强承担自己顾不过来的长期指导。', '队内关系+1 · 无费用', '你帮他找到合适的支持，没有把能力和精力之外的事硬接下来。', { squadRelation: 1 }),
    ], canMentorYoungTeammate),
  event('V3_C03B_YOUNG_TEAMMATE_RETURN', 'TEAM', '年轻队友拿着新一页笔记来找你。',
    '他的本子里多了几处圈出的疑问。说起上次那次交流，他想先告诉你近来的感受，再听听你的想法。', [
      choice('LISTEN', '多留些时间，听他说完', '仔细聊一聊，也接受今天少一点独处时间。', '队内关系+2 · 心理状态-1', '你耐心听完了他的感受，交流占去一点自己的时间，却让彼此更熟悉。', { squadRelation: 2, morale: -1 }, { persona: 'TEAM_FIRST' }),
      choice('BOUNDARY', '祝福他，调整这次交流', '说明今天能留下的时间，不勉强把话聊得很长。', '心理状态+1 · 队内关系+1', '你们简短交流了近况，互相道过祝福，便各自回到今天的安排。', { morale: 1, squadRelation: 1 }),
      choice('STAFF', '一起把问题带给球队工作人员', '让经验分享回到球队专业支持之中。', '队内关系+1 · 心理状态+1', '工作人员接过了具体问题，你和他都不必再独自琢磨这几页笔记。', { squadRelation: 1, morale: 1 }),
    ], canMentorYoungTeammate),
  event('V3_C04A_HOMETOWN_CAMP', 'MEDIA', '家乡训练营问，你愿意留下怎样的支持？',
    '组织者正为一场小训练营准备基础用品，也想请你分享一点职业生活经验。对方说，远程参加或这次不来都没有关系。', [
      choice('DONATE', '捐助一批基础用品', '自费捐助，不附带公开宣传的要求。', '花费€500 · 球迷关系+2 · 心理状态+1', '你捐出€500用于基础用品，并说明不要求以个人名义宣传。', { fanRelation: 2, morale: 1 }, { cash: -500, persona: 'LOW_KEY' }),
      choice('REMOTE', '安排一次简短远程问答', '付出时间，不需要额外现金。', '球迷关系+2 · 心理状态-1', '你完成了简短远程问答，回答了训练日常的问题，也为此花了一点精力。', { fanRelation: 2, morale: -1 }, { persona: 'TEAM_FIRST' }),
      choice('DECLINE', '诚恳说明这次无法参与', '不随口许诺一个还没确定的日期。', '无费用 · 无数值影响', '你在活动准备前说明无法参与，没有让对方一直等一份未确定的承诺。', {}, { persona: 'LOW_KEY' }),
    ], hasFirstTeamAppearance),
  event('V3_C04B_HOMETOWN_CAMP_RETURN', 'MEDIA', '训练营发来了一封短短的回信。',
    '信里附着新一期的训练时间表。组织者记得你之前的选择，想知道今后是否还适合这样联系。', [
      choice('LETTER', '回一封不作额外承诺的信', '认真读完，也写下自己的祝愿。', '心理状态+1 · 无费用', '你写下祝愿，没有把回信变成尚未安排的新行程。', { morale: 1 }, { persona: 'LOW_KEY' }),
      choice('SHARE', '分享一段可公开的训练心得', '不承诺下一期一定出席。', '球迷关系+1 · 无费用', '你提供了一段可公开的训练心得，清楚说明它不是未来出席承诺。', { fanRelation: 1 }, { persona: 'TEAM_FIRST' }),
      choice('CLOSE', '请对方把精力留给训练营本身', '礼貌结束固定联络，不让支持变成负担。', '心理状态+1 · 无费用', '你表达了祝福，也说明无需再为你单独安排回访。', { morale: 1 }),
    ]),
]

export const V3_STORY_EVENT_MAP = new Map(V3_STORY_EVENTS.map((definition) => [definition.id, definition]))

export function activeStoryEventDefinitions(fullContent = V3_FULL_CONTENT_ENABLED): readonly CareerEventDefinition[] {
  return fullContent ? V3_STORY_EVENTS : V3_STORY_EVENTS.filter((definition) =>
    V3_FIRST_SIX_EVENT_IDS.includes(definition.id as OffPitchStoryEventId))
}
