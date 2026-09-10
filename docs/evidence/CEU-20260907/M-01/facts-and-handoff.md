# 市场事实、目标与下一批交接

2026-09-07，M-01变更前基线；生产源码哈希见production-hashes.json，HEAD不足以代表本地未提交训练改动。下列源码行号对应本批前文件；没有导出或复制私有资格函数用于伪造资格证明。

## 三层与三路径

| 路径／层 | 当前事实与源码 | 已批准目标／保持项 |
| --- | --- | --- |
| 常规资格 | transfers.ts:392–403私有qualifiesForAdultMarket：读取兼容参数platformTier/divisionLevel、calculateOverall；≥85仅海外一级平台≤3，国内一级平台4仅DOMESTIC例外；80–84一级平台≤4且非DOMESTIC排除中国；74–79一级≤5或二级平台4；66–73平台3–6；更低不额外限制 | ≥85一级平台≤3或中国一级平台4，不再由intent硬排除；80–84一级平台≤4不限国家；其余档保留 |
| 基础候选边界 | transfers.ts:475–483：40岁不能新签约→空；domesticOnly或<18只国内目录；当前clubId先排除。当前队排除只限外部报价，续约例外 | 保留年龄、新签约、当前队排除、去重，不把未来国内机会写成签约保证 |
| 常规组合 | transfers.ts:612–635：DOMESTIC国内1、国内2、海外1，不足优先国内回填；其余方向共同采用首偏好、其他联赛、开放槽。OVR≥85共同优先两个club.tier≤2平台目标。CONDITIONAL没有国内保底槽 | DOMESTIC前两国内+开放1；CONDITIONAL合格两地各1+开放1；STRONG首偏好海外/其他海外/开放，世界级保留高平台目标 |
| 固定抽取 | transfers.ts:527–543：去重候选；权重max(1,(interest×0.65+fit×0.35)×首偏好1.28×rotation0.65–1.35)，随机namespace为transfer-market-rotation及transfer-market-slot，输入careerSeed/window/club或slot | 沿用权重语义，明确各槽固定namespace与不足回退；偏好影响权重/组合不能代替资格 |
| 到期资格 | transfers.ts:737–760：canSignNewContract、当前队存在；续约promise在22岁起按当前能力判断，否则沿当前角色；外部复用generateTransferOffers | 保留现队续约、未成年/最后生涯年；外部资格改动与常规共享 |
| 到期组合/抽取 | transfers.ts:774–834：独立contract-expiry-renewal固定流，续约1；外部slice0..3转换FREE_TRANSFER、费用0；最终[renewal,...external]≤4 | 续约不得被总slice3截掉；最多3外部+1续约，外部复用新地区槽政策 |
| 救济触发/资格 | transfers.ts:554–591：海外当前club.tier≤2、FIRST_TEAM、FRINGE（无出场数条件）或SUBSTITUTE且出场≤5；在成人普通资格分支之前。候选必须FIRST_TEAM且承诺角色序位严格高于当前（FRINGE<SUBSTITUTE<ROTATION<STARTER<CORE） | 保留角色改善与触发条件，不套普通高OVR资格排除低平台出场机会。明确“FRINGE或（SUBSTITUTE且≤5）”，不要错误添加FRINGE出场≤5限制 |
| 救济组合/抽取 | transfers.ts:590–608：五大国且tier≥3→发展联赛且tier≥3→国内ELITE，各槽不足在全部角色改善候选回退，最多3、去重；当前DOMESTIC仍相同槽顺序 | DOMESTIC国内槽先抽，其他方向沿旧序；所有回退必须仍角色改善，不造不足候选 |
| 市场开启（候选生成之前） | transfers.ts:94–146：职业已完成窗口>=2，模5为0或2；表现门槛8场/6.8，或5场/7.2，或声望60/6.7。gameStore.ts:833–899：phase必须PRO_STAGE_COMPLETE、有效合同/球员/现队；年龄市场门槛、末期到期退役；非到期须正式机会或主动失约≥2。救济生成本身不自动绕过开启条件 | 不改开放节奏；新增求职方向不自动开启市场，不新增刷新或球队搜索 |

注意资格用platformTier/divisionLevel，部分组合/救济用运行时club.tier/profile；本批目录由runtimeClubCatalog映射参数，不能把“球队级别、联赛级别、平台”混为同一个门槛。兴趣分/潜力估计先在候选映射计算，当前并无按最低兴趣分把所有候选过滤掉的门槛。

## 已知缺陷与当前正确行为

1. **硬资格缺陷**：E-03原玩家OVR82/CONDITIONAL/意大利偏好/海外现队，100原种子报价完整相等，300外部0国内。国内排除由392–403源码直接证明；79案例抽样也0国内，不能据此说79资格同样排除中国。
2. **组合缺口**：CONDITIONAL没有两地各1槽；DOMESTIC第三槽当前偏海外，未来是开放槽；救济DOMESTIC尚未先国内。仅为未来目标，不在本批修复。
3. **到期重抽缺陷**：真实匿名CONTRACT_EXPIRED→open市场window12→选择续约/谈判→reviewReport→advanceAfterReport→open，window13、报价和谈判被重置；reentry.json保存前后完整state。history与cash不变，报价改变不来自新半年比赛。
4. **空市场语义缺陷**：构造空TRANSFER_WINDOW＋STAY、brokenPromiseWindows2，经回看/结束/open(true)，window6→7，空数组被当未生成并重新给3份报价。普通空市场源在同样回看后因cadence被拒绝，窗口保持6；不能把两者都称重抽成功。
5. **正确保护**：正常save/load保留已选报价、全谈判字段、draft与当前偏好；恢复与确认到下一计划不重结算，history/report/events/cashEuro均保持，确认换队可改contract、club、角色、融入状态；选NONE不消费现金。
6. **非到期重入限制**：本次自然regular市场回看后被机会节奏拒绝，报价未变；源码对非空报价复用发生在机会校验之后，因此不可将该样本声称“所有市场随时可恢复重入”。

## 未来M-02断言（未实施）

- E-03原100输入：CONDITIONAL在两地均有合格候选时，每窗各至少1份；原0国内断言替换，但原JSON永久保留。
- OVR79/80/84/85成对：80/85资格门槛不再用intent排除中国；源代码审查或适当分层测试证明合格候选可达，不能仅看抽样频率。
- DOMESTIC国内≥2合格时每窗≥2国内；第三槽开放。CONDITIONAL国内、海外各1然后开放。STRONG海外优先，85+保留高平台目标，国内能从开放槽进入但不要求每窗出现。
- 每次外部≤3、无重复、排除现队；到期续约另计，总≤4，FREE_TRANSFER费用0；40岁不可新签约。未满18仍国内实际转会，16–17海外关注不改。
- 救济FRINGE与SUBSTITUTE出场5/6边界；每份承诺FIRST_TEAM且严格角色改善，回退也同样约束；DOMESTIC先国内。候选不足只少给，不回退更差角色。
- 常规/到期/救济均分开评审资格、组合、固定随机流；本批47个完整构造入参可复用。新规则改变旧输出时替换基线断言而非覆盖generated-r4。
- 市场开放cadence/表现/失约/年龄条件保持；不改训练已验收计算或迁移。

精确改动入口：transfers.ts的qualifiesForAdultMarket、selectedCandidates成人与救济分支、必要共享槽选择函数；generateContractExpiryOffers仅复用改进的外部市场，保持续约契约。新增当前断言主要在gameStore.ceuM01.test.ts和既有ceuS0Baseline市场测试；开发前明确哪些改为目标断言，历史证据不删。无需为M-01方便增加私有导出。

## 未来M-03断言（未实施）

- 新动作只更新player.overseasIntent/player.preferredLeagues；DOMESTIC清空联赛、去重、合法目录最多3。draft开局档案不变，不调用submitPreferences。gameStore.ts:491–511该旧动作改draft、重新generatePlayer并进入PLAYER_REVEAL，职业期复用会重置生涯球员，必须避免。
- phase/window/seed/cashEuro/history/lastReport/pending事件不因编辑变化；已生成报价完整字段和selectedTransferChoiceId不变。连续保存相同值为无操作，不消耗随机流、不生成市场。
- 已生成报价的clubId/id、薪资、角色、费用、counterUsed/counterDirection/negotiationSucceeded/negotiationMessage/withdrawn及当前选择完整保留；成功/失败/撤回三类都覆盖刷新/保存/返回及重复尝试。
- 只影响下一次尚未生成的市场，提示生效时间；空TRANSFER_WINDOW也算已生成。到期必须先识别已生成，不可优先再generateContractExpiryOffers。
- reviewReport/goToPhase职业回看不能造成市场上下文重新变成未结算；不在M-01改F导航。使用phase/windowIndex/history最后窗口区分并阻止重入。本次样本均可看见市场window=lastHistory.window+1；未发现两个相同这些字段却须相反处理的合法样本，但未形成全档可区分性证明，不猜造marketId。
- 已选报价与谈判字段正常重载可用；职业方向编辑入口/交互尚未实现，M-03需真实浏览器验证。本批只有store与生成器证据，不能替代页面验收。

## 缺口交统筹

8份最终v12 envelope中5份为既有真实匿名来源公开继续（常规、到期、已选、谈判成功/失败），3份为明确构造起点或状态（救济、空市场、撤回搜索）。撤回本身由真实公开谈判产生，起点seed/失约次数为构造，不能称自然生涯采集。

59份可读取S0/老将/T04结果源核查无海外豪门低出场起点；没有做额外完整生涯搜索。未来救济自然路径覆盖仍需统筹接受构造或另定补采。不充分候选的真实空市场未采到；本批只有40岁生成空、构造空市场、fallback源码分析，未证明稀缺候选所有组合。上述基线缺口不自行放行。
