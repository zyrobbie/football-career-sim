import { LEGACY_PRESS_DRINK_EVENT, V3_STORY_EVENT_MAP } from '../data/offPitchStories'
import { V3_STORY_CHAINS, type OffPitchStoryEventId, type RepresentativeOffPitchStory } from '../models/offPitchStories'

/** Display copy only: never rewrite saved outcomes or the financial ledger. */
const lines: Record<OffPitchStoryEventId, Record<string, string>> = {
  V3_E01_PRESS_DRINK: {
    IGNORE: '你没有理会发布会上的竞品矿泉水，配合了采访，也承担了赞助商的不满。',
    TURN: '你在发布会上转过竞品矿泉水的标识，维护了赞助承诺，也打断了采访。',
    DRINK: '你在发布会上喝了一口竞品矿泉水，留下自然的镜头，也引来了赞助商的不满。',
    MOVE: '你挪开发布会上挡住话筒的饮料，让采访顺利开始。',
    JOKE: '你打趣发布会上的饮料也要接受采访，让主持人笑着把话题带回足球。',
    STAFF: '你请工作人员重新摆好发布会桌上的饮料，道过谢后继续采访。',
  },
  V3_E02_AD_TEAMMATE: {
    LAUGH: '队友模仿你的广告台词时，你接着念完下一句，让更衣室又多了一阵笑声。',
    DINNER: '队友拿你的广告打趣后，你请大家喝了咖啡，把这段小插曲留在笑声里。',
    BOUNDARY: '队友模仿你的广告时，你笑着请他们训练时别再重复，说明了自己的边界。',
  },
  V3_E03_INTERVIEW_CLIP: {
    CONTEXT: '采访被剪成短视频后，你补上完整语境，认真解释了那次训练失误。',
    CLUB: '采访被截短引发误解后，你请俱乐部提供完整片段，把注意力留给训练。',
    DIRECT: '面对被截短的采访，你简短说清本意，随后关掉评论，不再纠缠争论。',
  },
  V3_E04_FAN_SCHEDULE: {
    SHORT: '球迷活动撞上私人安排时，你仍到场见了大家，并按约定的时间告别。',
    VIDEO: '你为无法到场的球迷活动录好问候，让等候的人也听见了你的心意。',
    PRIVATE: '球迷活动撞上私人安排时，你提前说明无法到场，没有让工作人员空等。',
  },
  V3_E05_OLD_POST: {
    CHANGE: '旧训练感想被翻出时，你坦然承认想法已变，也接受了过去的自己。',
    EXPLAIN: '面对被翻出的旧训练感想，你解释了当时的处境，让那句话有了完整背景。',
    STAND: '旧训练感想被翻出时，你保留观点，也认真修正了不够清楚的措辞。',
  },
  V3_E06_FAMILY_VISIT: {
    TIME: '家人来探望时，你留出休息晚间一起采购聊天，让团聚不只有比赛话题。',
    HELP: '家人来探望时，你请人协助接送和行程，把难得的相处时间留得完整些。',
    SIMPLE: '家人来探望时，你照着训练表安排了一顿饭，简单的团聚也没有失约。',
  },
  V3_E07_LANGUAGE_MIXUP: {
    ASK: '你向队友问清误听的吃饭邀约，还学会了一句点餐用语，慢慢熟悉新城市。',
    JOKE: '你把队友的饭局邀约误听成加练，又拿穿球鞋去餐厅打趣，让午饭热闹起来。',
    EXPLAIN: '你私下请队友解释误听的吃饭邀约，把当地说法记进手机，慢慢适应新城市。',
  },
  V3_E08_NEW_NEIGHBOR: {
    BOX: '刚搬家时，你把空纸箱送给邻居，也从闲聊中熟悉了附近的商店。',
    PRIVACY: '你请门卫把纸箱转交给新邻居，帮上了小忙，也保留了住处的私人空间。',
    WELCOME: '刚搬家时，你带着点心和空纸箱向邻居问好，留下第一段邻里记忆。',
  },
  V3_E09_LOCAL_RADIO: {
    DAILY: '你在本地电台聊起做饭的小插曲，让球迷听见赛场之外的日常。',
    TEAM: '你在本地电台分享球队的小习惯，把轻松的笑话留给了整支球队。',
    HOME: '你在本地电台介绍家乡菜，让远方的家乡也在这座城市被认真听见。',
  },
  V3_E10_TEAM_PHOTO: {
    FOLLOW: '拍球队合照时，你配合摄影师站好位置，让反复重拍终于结束。',
    JOKE: '拍球队合照时，你主动站上小踏板开了个玩笑，让大家放松了一点。',
    HELP: '拍球队合照时，你为紧张的年轻队友留出位置，让照片多了一张放松的笑脸。',
  },
  V3_E11_COMMUTE: {
    ASK: '去训练基地途中遇到站台变更，你向站务人员问清路线，按时赶到了训练。',
    CHAT: '去训练基地途中，你和一位球迷一起找到临时站台，聊了几句平常的生活。',
    TAXI: '去训练基地途中遇到站台变更，你改乘出租车，省去了一番赶路的折腾。',
  },
  V3_E12_FAN_GIFT: {
    KEEP: '你收下球迷手工装订的小册子，写好感谢后放进纪念盒，珍藏这份心意。',
    THANK: '你征得球迷同意后公开感谢那本手工小册子，让认真的喜欢有了回应。',
    CLUB: '你没有收下球迷的手工小册子，仍请俱乐部认真转达了感谢。',
  },
  V3_C01A_LOCAL_CAR: {
    FULL: '你为本地代步品牌完成半天拍摄和到店见面，认真履行了这次合作。',
    SHORT: '你为本地代步品牌完成一小时拍摄，在合作之外也留出了自己的时间。',
    DECLINE: '你婉拒本地代步品牌的拍摄邀请，把时间留给了自己的生活。',
  },
  V3_C01B_LOCAL_CAR_RETURN: {
    FULL: '收到本地代步品牌的新邀约后，你完成半天公开活动，认真履行了约定。',
    SHORT: '收到本地代步品牌的新邀约后，你完成一次远程短访谈，兼顾了合作与生活。',
    CLOSE: '收到本地代步品牌的新邀约后，你礼貌婉拒，没有让旧联系变成新的负担。',
  },
  V3_C02A_PUBLIC_RESPONSE: {
    DIRECT: '记者问起训练安排的分歧时，你直说不同意见可以讨论，认真表达了态度。',
    TEAM: '记者问起训练安排的分歧时，你先谈共同目标，把回答放在全队的合作上。',
    PRIVATE: '记者问起训练安排的分歧时，你把具体讨论留在队内，守住了沟通的边界。',
  },
  V3_C02B_PUBLIC_RESPONSE_RETURN: {
    CONTINUE: '记者回访你对训练分歧的看法时，你保留原意，也补充了如今的新理解。',
    CHANGE: '记者回访你对训练分歧的看法时，你承认如今会换种说法，坦然面对变化。',
    CLOSE: '记者回访你对训练分歧的看法时，你礼貌结束话题，把精力留回生活。',
  },
  V3_C03A_YOUNG_TEAMMATE: {
    TIME: '年轻队友拿来训练笔记时，你约好每周简短交流，把经验慢慢讲给后来的人。',
    NOTES: '年轻队友向你请教时，你分享一页训练记录方法，让他有了可以尝试的办法。',
    INTRO: '年轻队友拿来训练笔记时，你为他介绍合适的工作人员，让困惑有人回应。',
  },
  V3_C03B_YOUNG_TEAMMATE_RETURN: {
    LISTEN: '年轻队友再次拿来训练笔记时，你耐心听完他的困惑，让彼此更熟悉。',
    BOUNDARY: '年轻队友再次来聊训练笔记时，你们简短交换近况，把祝福留给彼此。',
    STAFF: '年轻队友再次拿来训练笔记时，你陪他请教工作人员，让疑问有了专业帮助。',
  },
  V3_C04A_HOMETOWN_CAMP: {
    DONATE: '你出资为家乡训练营添置基础用品，不求宣传，只想给练球的人一点支持。',
    REMOTE: '你为家乡训练营做了一次远程问答，把职业训练的日常经验分享给大家。',
    DECLINE: '你提前婉拒家乡训练营的邀请，诚恳说明无法参与，没有让对方空等。',
  },
  V3_C04B_HOMETOWN_CAMP_RETURN: {
    LETTER: '你给家乡训练营回了一封信，把认真写下的祝福送回家乡。',
    SHARE: '收到家乡训练营的来信后，你分享一段训练心得，给练球的人留下参考。',
    CLOSE: '收到家乡训练营的来信后，你送上祝福并结束固定联络，让他们安心办营。',
  },
}

const fallback = '你在球场之外作出了一次属于自己的选择。'

/** Summarize a recorded choice, never infer a follow-up, sporting result or refund. */
export function careerPosterStoryLine(story: RepresentativeOffPitchStory): string {
  const chain = V3_STORY_CHAINS[story.id as keyof typeof V3_STORY_CHAINS]
  const useFollowup = Boolean(chain && story.completed && story.followupChoiceTitle)
  const eventId = chain
    ? useFollowup ? chain.followup : chain.first
    : story.id.split(':')[0] as OffPitchStoryEventId
  const choiceTitle = useFollowup ? story.followupChoiceTitle : story.originalChoiceTitle
  const event = V3_STORY_EVENT_MAP.get(eventId)
  const choice = event?.choices.find(candidate => candidate.title === choiceTitle)
    ?? (eventId === 'V3_E01_PRESS_DRINK'
      ? LEGACY_PRESS_DRINK_EVENT.choices.find(candidate => candidate.title === choiceTitle)
      : undefined)
  return choice ? lines[eventId]?.[choice.id] ?? fallback : fallback
}

export interface CareerPosterMemory {
  id: string
  windowIndex: number
  text: string
}

export function careerPosterMemories(stories: readonly RepresentativeOffPitchStory[]): CareerPosterMemory[] {
  return stories.map(story => ({
    id: story.id,
    windowIndex: story.completed && story.followupWindowIndex !== undefined && story.followupChoiceTitle
      ? story.followupWindowIndex : story.windowIndex,
    text: careerPosterStoryLine(story),
  }))
}
