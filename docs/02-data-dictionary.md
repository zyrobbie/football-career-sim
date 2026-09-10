# 绿茵生涯：数据字典

版本：0.1  
原则：只持久化事实状态；综合能力、市场价值、职业总计、标签分数等派生值实时计算。

## 1. 基础类型

```ts
type Rating100 = number
type Euro = number
type WindowIndex = number
type EntityId = string
```

运行时必须校验：

- 0至100数值不能出现`NaN`或无穷值；
- 欧元金额为非负整数；
- 窗口编号为非负整数；
- 所有静态数据ID必须能够解析；
- 内部能力允许小数，显示层统一取整。

## 2. 枚举

```ts
type Position =
  | 'ST'
  | 'LW'
  | 'RW'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'CM'
  | 'CDM'
  | 'LB'
  | 'RB'
  | 'CB'

type AttributeKey = 'attack' | 'defense' | 'physical' | 'mental'

type CurrentStateKey = 'form' | 'fitness' | 'morale'

type RelationKey =
  | 'coach'
  | 'squad'
  | 'agent'
  | 'fans'
  | 'media'

type TeamLevel = 'YOUTH' | 'FIRST_TEAM'

type YouthRole = 'ROTATION' | 'STARTER' | 'CORE'

type FirstTeamRole =
  | 'FRINGE'
  | 'SUBSTITUTE'
  | 'ROTATION'
  | 'STARTER'
  | 'CORE'

type WindowType = 'SUMMER' | 'WINTER'

type OverseasIntent = 'STRONG' | 'CONDITIONAL' | 'DOMESTIC'

type CareerPriority =
  | 'PLAYING_TIME'
  | 'COMPETITIVE_LEVEL'
  | 'SALARY'
  | 'STABILITY'

type ContractType =
  | 'PERMANENT'
  | 'LOAN'
  | 'FREE_TRANSFER'
  | 'RENEWAL'
  | 'YOUTH_DOMESTIC'

type InjurySeverity =
  | 'MINOR'
  | 'MODERATE'
  | 'MAJOR'
  | 'CAREER_THREATENING'

type EventPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

type GamePhase =
  | 'HOME'
  | 'CREATE_IDENTITY'
  | 'CREATE_POSITION'
  | 'CREATE_PRIORITIES'
  | 'CREATE_PREFERENCES'
  | 'PLAYER_REVEAL'
  | 'ACADEMY_OFFERS'
  | 'ARRIVAL_EVENT'
  | 'HALF_YEAR_PLAN'
  | 'SIMULATION_READY'
  | 'HALF_YEAR_REPORT'
  | 'CAREER_DASHBOARD'
```

## 3. 存档根对象

```ts
interface GameSave {
  saveVersion: number
  dataVersion: number
  checksum: string
  savedAt: string

  phase: GamePhase
  careerSeed: string
  startYear: number
  windowIndex: WindowIndex
  windowType: WindowType

  player: PlayerState
  career: CareerState
  world: PlayerWorldState
  eventState: EventState
  finance: FinanceState
  currentWindow: CurrentWindowState
  history: CareerHistory
}
```

`checksum`用于发现截断或非法修改，不作为安全机制。

## 4. 球员状态

```ts
interface PlayerState {
  id: EntityId
  name: string
  nationality: 'CHN'
  jerseyNumber: number
  preferredFoot: 'LEFT' | 'RIGHT'

  primaryPosition: Position
  initialSecondaryPosition: Position
  learnedPosition: LearnedPositionState | null
  positionFamiliarity: Partial<Record<Position, number>>

  attributes: AttributeValues
  potentials: AttributeValues

  form: Rating100
  fitness: Rating100
  morale: Rating100

  coachRelation: Rating100
  squadRelation: Rating100
  agentRelation: Rating100
  fanRelation: Rating100
  mediaRelation: Rating100

  reputation: Rating100
  currentClubAttachment: Rating100

  careerPriorities: CareerPriorityRanking
  overseasIntent: OverseasIntent
  preferredLeagues: EntityId[]

  nationalTeamRetired: boolean
}

interface AttributeValues {
  attack: Rating100
  defense: Rating100
  physical: Rating100
  mental: Rating100
}

interface LearnedPositionState {
  position: Position
  familiarity: number
  status: 'LEARNING' | 'PAUSED' | 'COMPLETED'
}

interface CareerPriorityRanking {
  ordered: [
    CareerPriority,
    CareerPriority,
    CareerPriority,
    CareerPriority
  ]
  values: Record<CareerPriority, 85 | 70 | 55 | 40>
}
```

规则：

- `preferredLeagues`最多3项，不可重复；
- 主位置熟练度必须为100；
- 开局副位置熟练度必须为92；
- 新位置对象一旦创建，不得替换为另一个位置；
- 四项潜力必须不低于对应当前能力；
- 偏好球衣号码必须是1至99之间的整数；
- 国籍首版固定为中国。

## 5. 年龄

年龄不存储为独立字段。开局固定为13岁，之后只由窗口编号计算。

```ts
interface AgeAtWindow {
  years: number
  months: number
  totalMonths: number
}
```

新生涯以13岁0个月为年龄基准。每个窗口推进6个月。

## 6. 俱乐部、联赛和球队

静态俱乐部：

```ts
interface ClubDefinition {
  id: EntityId
  displayName: string
  country: string
  leagueId: EntityId
  clubTier: 1 | 2 | 3 | 4 | 5 | 6
  facilityTier: 1 | 2 | 3 | 4 | 5 | 6
  academyTier: 1 | 2 | 3 | 4 | 5 | 6
  salaryLevel: number
  prestige: Rating100
  firstTeamThreshold: Rating100
  youthDevelopmentBias: Rating100
  crestKey: string | null
  shortMark: string
  isFictional: boolean
}
```

队徽图片地址、来源页、许可备注和审核状态属于可替换资源清单，不进入`ClubDefinition`和玩家存档。`crestKey`只负责稳定关联，资源缺失或未通过审核时统一回退到`shortMark`。

静态联赛：

```ts
interface LeagueDefinition {
  id: EntityId
  name: string
  country: string
  division: number
  quality: Rating100
  prestige: Rating100
  teamCount: number
  relegationSlots: number
  promotionSlots: number
  continentalSlots: number
}
```

存档只保存球员直接相关的世界状态：

```ts
interface PlayerWorldState {
  currentClubId: EntityId | null
  parentClubId: EntityId | null
  teamLevel: TeamLevel
  youthRole: YouthRole | null
  firstTeamRole: FirstTeamRole | null
  isCaptain: boolean
  positionCompetitionModifier: -4 | -2 | 0 | 3 | 6
  contract: ContractState | null
  windowInjury: WindowInjuryRecord | null
}
```

`windowInjury`仅存在于当前窗口报告数据，不进入下一窗口的长期球员状态。

## 7. 合同

```ts
interface ContractState {
  type: ContractType
  clubId: EntityId
  remainingHalfYears: number
  annualSalaryEuro: Euro
  promisedTeamLevel: TeamLevel
  promisedRole: YouthRole | FirstTeamRole | null
  releaseClauseEuro: Euro | null
  clubOptionYears: number
  parentClubId: EntityId | null
  brokenPromiseWindows: number
}
```

不允许出现：

- 签字费；
- 出场奖金；
- 表现奖金；
- 降级减薪；
- 租借买断；
- 租借工资分摊。

## 8. 财务

```ts
interface FinanceState {
  cashEuro: Euro
  currentHalfYearDisposableIncomeEuro: Euro
  cashReserveLimitEuro: Euro
  careerGrossSalaryTotalEuro: Euro
}
```

不保存房产、车辆、投资、负债和完整消费流水。

必须满足：

- 现金不能为负；
- 玩家不能选择费用超过现金的选项；
- 降薪不能主动扣除已有现金；
- 达到储备上限后只阻止超额新收入进入现金。

## 9. 伤病

```ts
interface WindowInjuryRecord {
  category: 'MUSCLE' | 'KNEE' | 'ANKLE' | 'FOOT' | 'BACK' | 'OTHER'
  weeks: number
}
```

每半年最多生成一次记录性短期伤病，只用于结算本窗口缺阵周数、出场与身体状态。它不会进入下一窗口，不保存治疗方案、伤病史、复发状态、永久能力影响或康复进度。

## 10. 事件

静态事件模板：

```ts
interface EventDefinition {
  id: EntityId
  groupId: EntityId
  category:
    | 'CONTRACT_TRANSFER'
    | 'TRAINING_POSITION'
    | 'ROLE_COACH'
    | 'SQUAD'
    | 'FANS_MEDIA'
    | 'HEALTH'
    | 'NATIONAL_TEAM'
    | 'CAREER_MILESTONE'
  priority: EventPriority
  allowedWindows: WindowType[]
  cooldownWindows: number
  baseWeight: number
  conditions: EventCondition[]
  choices: EventChoiceDefinition[]
}

interface EventChoiceDefinition {
  id: EntityId
  label: string
  preview: ChoicePreview
  costRule: CostRule | null
  immediateEffects: EffectDefinition[]
  windowEffects: EffectDefinition[]
  delayedEffects: DelayedEffectDefinition[]
}
```

存档事件状态：

```ts
interface PendingCareerEvent {
  eventId: EntityId
  interactionKind:
    | 'CHOICE'
    | 'DIALOGUE'
    | 'RISK'
    | 'ALLOCATION'
    | 'RANKING'
    | 'PERSON_TONE'
  stepIndex: number
  selections: EntityId[]
  variantId: EntityId | null
}

interface CareerStoryState {
  club: {
    clubId: EntityId | null
    leadership: 'NONE' | 'CANDIDATE' | 'CAPTAIN'
    rivalry: 'NONE' | 'HEALTHY' | 'HOSTILE'
    mentorship: 'NONE' | 'MENTEE' | 'MENTOR'
  }
  publicPersona: 'NEUTRAL' | 'LOW_KEY' | 'TEAM_FIRST' | 'OUTSPOKEN'
  tendencies: {
    leadership: 0 | 1 | 2 | 3 | 4 | 5
    diplomacy: 0 | 1 | 2 | 3 | 4 | 5
    professionalism: 0 | 1 | 2 | 3 | 4 | 5
    clutch: 0 | 1 | 2 | 3 | 4 | 5
  }
}
```

约束：

- 事件ID只在一个静态清单登记，事件定义和存档校验共同引用；
- 俱乐部内剧情状态随转会重置，公众形象与四项长期倾向保留；
- 事件选项生成后必须持久化，刷新不能重抽；
- 同一窗口最多需要玩家处理两个事件；
- 无特殊事件时必须提供半年发展计划。

当前测试版先落地一个受控子集：

- 66个参数化模板，覆盖教练、队内、比赛、媒体、健康、合同、国家队与职业里程碑八类情境；
- 其中对话、风险和对象语气事件使用两阶段路线，第一步选择会写入待处理事件并可在刷新后恢复；
- 每个窗口最多出现一个特殊事件，半年发展计划仍是固定核心选择；
- 使用`careerSeed + windowIndex`确定性抽取，生成后只保存待处理事件ID；
- 同一事件组按各自冷却期阻止重复，相关剧情不能仅靠轮换事件ID绕过冷却；
- 合格事件按本局出现次数分层，只在出现次数最少的一层等概率抽取；未出现事件优先于已经出现的常驻事件；
- 资深角色事件以实际一线队履历、实际角色、年龄与关系联合校验；国家队事件以真实国家队窗口记录校验；
- 选择结果保存事件ID、选项ID、结果摘要与实际数值变化，不复制静态正文；
- 允许保存下一窗口生效的一次性后果，结算后立即移除；
- 版本6存档增加待处理事件、事件履历和未结算后果，版本11将待处理事件升级为可承载多阶段互动的结构，并增加精简剧情状态；版本1至10均顺序迁移。

完整版允许同一窗口保留两个不同优先级事件；测试版限制为一个，是为了先验证选择、读档、报告和长期后果的完整闭环。

## 11. 当前窗口

```ts
interface CurrentWindowState {
  windowSeed: string
  coreDecisionId: EntityId | null
  additionalDecisionId: EntityId | null
  selectedTrainingFocus:
    | AttributeKey
    | 'BALANCED'
    | 'ADAPTATION'
    | 'BODY_CARE'
    | 'MATCH_SHARPNESS'
    | 'MENTAL_RESET'
    | null
  developmentApproach:
    | 'PUSH'
    | 'STEADY'
    | 'TEAM_FIRST'
    | null
  temporaryModifiers: TemporaryModifier[]
  simulationVersion: number
  lastReport: HalfYearReport | null
}
```

当阶段为`SIMULATION_READY`时，必须已经保存窗口种子和全部玩家选择。重新载入时可以确定性地完成同一结算。

一线队通道只保存当前俱乐部的压缩状态：综合关注度、培养准备度、比赛证明、教练推荐和阶段。正式晋升至少需要完成四个半年，并同时满足能力、青年队地位、最近表现和教练推荐门槛。

## 12. 半年比赛摘要

```ts
interface CompetitionStatLine {
  competitionId: EntityId
  teamLevel: TeamLevel
  appearances: number
  starts: number
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  averageRating: number | null
}

interface HalfYearReport {
  windowIndex: WindowIndex
  fromLabel: string
  toLabel: string
  clubId: EntityId | null
  roleBefore: YouthRole | FirstTeamRole | null
  roleAfter: YouthRole | FirstTeamRole | null
  stats: CompetitionStatLine[]
  attributeChanges: AttributeValues
  stateChanges: Record<CurrentStateKey, number>
  relationChanges: Record<RelationKey, number>
  cashChangeEuro: Euro
  eventSummaries: EventHistoryRecord[]
  clubSeason?: ClubSeasonResult | null
  honors?: CareerHonor[]
  nextWindowHints: ReportHint[]
}
```

## 13. 压缩生涯历史

```ts
interface CareerHistory {
  windows: WindowHistoryRecord[]
  clubExits: ClubExitRecord[]
  injuries: InjuryHistoryRecord[]
  milestones: MilestoneRecord[]
}

interface WindowHistoryRecord {
  windowIndex: WindowIndex
  clubId: EntityId | null
  teamLevel: TeamLevel
  role: YouthRole | FirstTeamRole | null
  stats: CompetitionStatLine[]
  eventChoiceIds: Array<{
    eventId: EntityId
    choiceId: EntityId
  }>
  endingAttributes: AttributeValues
  clubSeason?: ClubSeasonResult | null
  honors?: CareerHonor[]
  endingStates: {
    form: number
    fitness: number
    morale: number
  }
}
```

荣誉与产生它的赛季窗口一起写入半年报告和压缩履历，不维护第二套可漂移的全局荣誉列表。退役档案通过履历纯计算汇总。新增字段均为可选，因此版本10旧存档可直接读取；旧窗口不会补造荣誉。

完整事件正文、俱乐部定义和所有派生总计不写入历史。

## 14. 派生值

以下值统一通过选择器或纯函数计算：

- 当前年龄；
- 主位置综合能力；
- 其他位置有效综合能力；
- 有效教练水平；
- 训练质量；
- 发展指数；
- 选拔分；
- 市场价值；
- 舆论环境；
- 生涯总出场、首发、分钟、进球和助攻；
- 青年队与成年队分开的数据总计；
- 冠军数量；
- 标签得分；
- 生涯历史评价；
- 退役主结局；
- 天赋兑现率。

## 15. 随机流

每个半年从`careerSeed`和`windowIndex`生成独立模块随机流：

```text
event
offer
selection
appearance
performance
growth
injury
finance
club-season
national-team
```

模块内部增加随机调用，不能改变其他模块结果。

禁止业务规则直接调用`Math.random()`。

## 16. 存档键与恢复

```text
career_save_current
career_save_backup
```

写入顺序：

1. 对待保存对象执行结构和业务不变量校验；
2. 把合法主存档复制为内部备份；
3. 序列化并写入新主存档；
4. 立即重新读取和校验；
5. 主存档读取失败时尝试内部备份；
6. 两者都失败时才提示无法恢复。

用户界面始终只显示一个生涯进度。

## 17. 数据版本

`saveVersion`描述存档结构，`dataVersion`描述静态俱乐部、联赛、事件和平衡数据。

迁移规则：

- 迁移必须是显式的版本到版本纯函数；
- 不允许在读取时随意补字段后继续；
- 迁移完成后重新执行完整校验；
- 未知的更高版本存档必须拒绝读取，不能猜测降级；
- 静态ID删除时必须提供ID映射或安全占位定义。


### CEU-20260907：训练与 v12 持久化（T-02/T-03已验收）

当前代码 SAVE_VERSION=12、DATA_VERSION=12。11→12只升级版本，保留原训练焦点、历史、报告、报价、draft与player偏好；原1→11链保留，原到期错误计划恢复兼容规则延续到12。目录数据未变，本次DATA_VERSION表示训练规则语义变化。

`TrainingFocus`新增 BODY_CARE（身体维护）、MATCH_SHARPNESS（比赛状态）、MENTAL_RESET（心理调适）。`normalizePendingTraining(GameState)`为幂等纯函数，只处理 HALF_YEAR_PLAN / SPECIAL_EVENT / SPECIAL_EVENT_RESULT / SIMULATION_READY。null保持未选，≤30不变；31–33 physical→BODY_CARE、ADAPTATION→MENTAL_RESET；≥34额外把attack/defense/BALANCED→MATCH_SHARPNESS、mental→MENTAL_RESET。

chooseTraining、continueCareer和runReadySimulation共用该函数，本期引擎、保存与新history均使用规范化焦点。旧history和已结算上下文不改写；事件路线和已应用即时结果保留。新history记录本期计划，即使恢复覆盖也不改成其他枚举，实际执行情况见报告。

`HalfYearReport.eventSummary`仍是原有字符串：原摘要后追加换行和“本期训练：计划；实际准备收益/成本；实际身体衰退减缓或恢复覆盖/饱和原因。”实际执行记录仅在内存计算，不增加存档字段；精确能力减缓值保留于计算与验证证据；新报告文案必要时使用“约”并保留两位小数，不向玩家展示取整或下限实现细节。≤30摘要不变，旧报告不补算。hints仍最多三条，不承载维护说明。

v11客户端不保证能读v12；本批未发布。未来发布前须保留v11备份，不能把代码回退称为存档降级。证据：[T-02](evidence/CEU-20260907/T-02/README.md)。

T-04复用迁移回归并补验17份真实匿名旧档＋4份构造边界档的新页面/公开动作恢复；既有历史、事件前缀、报告与报价不追溯改写，待结算规范值与新增history一致。加载READY允许首次结算一次，其余已保存结果重复加载不结算。详见[训练验收总表](21-career-experience-upgrade-qa.md)，当前T-04已通过统筹验收；不表示旧客户端能读取v12。


### CEU-20260907 M-02市场数据语义（2026-09-08，待验收）

不增加持久字段，SAVE_VERSION/DATA_VERSION仍12/12；不改旧报价或已存谈判。新生成的外部TransferOffer最多3份，排除现队并按clubId去重；到期RENEWAL单独最多1份，FREE_TRANSFER最多3份且transferFeeEuro=0，总数≤4。薪资、角色承诺、潜力估计及谈判字段公式不变。

资格使用兼容球队参数的divisionLevel/platformTier；85+高平台海外组合及救济触发仍用runtime club.tier，不能混用。新增TransferCandidate是生成器计算中的临时类型，不写入存档；selectTransferCandidates实际由生产生成器使用，测试可控制候选池，不提供生产刷新入口。

**持久化契约（ASTRA-M02-R1补修待统筹验证）**：到期TRANSFER_WINDOW恰好1份当前selectedClubId续约，其余0–3份FREE_TRANSFER，不含现队；外部clubId和全部报价id唯一，总数≤4。selectedTransferChoiceId对应未撤回报价，不能为STAY。未选中的withdrawn报价及其完整谈判字段保留，不重生成或补满报价。基础schema、年龄退役及异常修复分支保持，未改格式、12/12版本或迁移。有效合同的空市场STAY继续合法。

历史固定3外部校验造成的MR-05反例永久保留于[M-02阻塞](evidence/CEU-20260907/M-02/handoff-and-blocker.md)；当前保存/恢复及签约后继证据见[R1](evidence/CEU-20260907/M-02-R1/README.md)。MR-05未由执行者关闭，M-03未开始。


### CEU-20260907 M-03：当前方向字段与视图状态（待验收）

- `draft.overseasIntent/preferredLeagues`保留开局档案；`player.overseasIntent/preferredLeagues`为当前方向。新增`updateCareerPreferences(intent, leagues)`只更新后两项，其他player字段、职业优先级、seed、phase、窗口、cash、history、报告、事件、报价、选择与draft保持。
- `normalizeCareerPreferences`先验证枚举与现有`PREFERRED_LEAGUES`，去重后最多3项，保留选择顺序；DOMESTIC规范为空。非法输入原子拒绝；重复规范化值不commit、不写存档、不调用随机或生成器。
- `canEditCareerPreferences`共享允许表：有player/contract且无pending事件；HALF_YEAR_PLAN、HALF_YEAR_REPORT、CAREER_DASHBOARD、PRO_CONTRACT_OFFER、PRO_CONTRACT_COMPLETE、PRO_STAGE_COMPLETE、TRANSFER_WINDOW、TRANSFER_ARRIVAL、TRANSFER_STAGE_COMPLETE。其余phase禁止，页面入口也复用该判定。
- `isReviewingReport`是Zustand非持久视图标志，不在GameState或envelope中；`reviewReport/closeReportReview`只切换视图。导航、成功加载/提交、删除或换生涯清除。无新增存档字段、marketId、枚举或迁移，12/12保持。
- `restoreMarketContext`解释旧回看phase：仅合同存在，phase为报告/职业结束页，且W=最后history.windowIndex+1时，按选择与transferDecision恢复市场、到队、完成或下一计划。无history不推断。已生成空市场以phase和STAY表示，不用报价数组长度代替状态。
- 真正未生成的结束窗口W=H才允许按原条件生成；无history的最小兼容状态要求结束phase、空报价、选择null、decisionnull，再走原门槛。新市场推进一次，已有市场先复用不受新开节奏拒绝；签约/到队状态不激活上一窗口报价。

字段/动作表及完整构造来源见[M-03状态契约](evidence/CEU-20260907/M-03/state-contract.md)。MR-05已关闭且save.ts本批不改；MR-03修复待统筹验证。


### CEU F-02：报告动作与临时确认（12/12不变，已验收）

`professionalNextAction(game)`是页面/store共享纯判定。`advanceProfessionalReport(action, expectedWindowIndex, expectedCareerSeed?)`在提交前重新校验phase、W/H、player/合同/现队和待处理事件。W=H才是新的已结算推进；W=H+1的旧报告/结束上下文先由marketContext恢复，不生成、不加窗。真实页面传窗口和生涯seed；旧公开入口复用同一判定。

`ProfessionalAction`仅是运行时动作，不写入存档：RESTORE、AGE_LIMIT、MARKET、REQUEST_TRANSFER、PLAN、STAY、VOLUNTARY、NATIONAL。普通计划及首次市场只提交一次完整next；不调用模拟引擎、不重结算history/cash/lastReport/事件/国家队事实。

`voluntaryRetirementConfirmation`是Zustand临时视图，含careerSeed、windowIndex、phase=HALF_YEAR_REPORT；不属于GameState，不写入envelope。确认使用同一对象令牌并重核当前生涯/窗口/phase/资格。取消、重载、导航/回看、新生涯及成功commit清理令牌。新报告最终确认一次保存CAREER_RETIRED/VOLUNTARY；旧RETIREMENT_DECISION仍沿原协议确认/取消，不猜旧来源。

`chooseTraining(focus, approach?, expected?: {careerSeed, windowIndex})`仅接受HALF_YEAR_PLAN。UI传预期上下文；两参数合法旧调用兼容。READY→模拟既有保存与恢复不变，不新增迁移/持久字段。

2026-09-09核对：上述F-02数据契约已通过文档36验收，F-03连续结算已验收；F-04仅实页/文档补证待验收，没有增加字段或迁移。只读回看不持久化phase，刷新清除临时视图；临时自愿退役刷新回原报告。早期M-02-R1“待验证”为历史时点，MR-05现已关闭。当前专项结论与发布限制以[验收总表](21-career-experience-upgrade-qa.md)为准，12/12保持。


## v1.1.0 发布备份补充

新增localStorage键career_save_v11_backup：首次升级或覆盖合法v11当前档前保留原始字节，后续保存不轮换。备份写入失败时停止覆盖原档；明确删除生涯时同时删除。该键仅用于升级前恢复，不作为日常自动回退槽；旧客户端无法读取v12。
