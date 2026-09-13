# KM-02/S1 实施协议（S0候选，待统筹确认）

基线7421b44 / package2.0.0 / SAVE/DATA12/12。完整阅读主规范V1.1及V2.5执行指令。S0不实现本协议；最终产品2.5.0仅完整关卡通过后发布。

## 1. 当前源码与单一准备入口

|事实|位置|实施边界|
|commit先enforceAgeBasedFirstTeam，再saveGame，再set|gameStore.ts:192|Pending创建前必须采用相同规范化，保存失败不能set成功状态|
|continueCareer load→restoreMarketContext→normalizePendingTraining→runReadySimulation|gameStore.ts:398|恢复不得把新Moment phase当旧阶段推进；报告重载不模拟|
|READY先焦点规范化，再consumeCareerConsequences，合并trainingQualityBonus|gameStore.ts:198–232|基础状态保留未消耗队列/原bonus，准备结果仅临时副本|
|职业模拟再enforce年龄资格；一线队prepareProfessionalWindow→applyTrainingMaintenance|simulateProfessionalHalfYear.ts:624、444|维护会修改prepared player；不能只读取策略的返回值复制一份不含维护的状态|
|四次Poisson→dataEffect→rating RNG→clamp5.5/8.5→一位小数|simulateProfessionalHalfYear.ts:208–245|注入只在四次抽取后；不增加基础RNG调用|
|成长含策略bonus+事件bonus及trainingExecution|simulateProfessionalHalfYear.ts:493–497|完整准备返回这些值，正式路径复用；不额外给能力奖励|
|国家队/荣誉消费职业最终stats|gameStore.ts:250–318|只在最终结算；预演不写国家队、现金、合同、履历|
|validate也执行年龄资格，save仅解码验证写回而非逐字确认|save.ts:798、1163|新增Pending保存需规范化幂等与精确readback断言|

提取两级共享纯准备器：
1. `prepareReadySimulation(base)`：normalizePendingTraining、现队offer解析、consume后果、bonus合并、当前事件记录。返回simulationState、offer、后果delta与说明。保留现有offer解析时点，不能因重构改变青年/22岁样本的offer。
2. `prepareFirstTeamSimulation(simulationState, offer)`：年龄资格、角色、startPlayer、策略完整结果、maintenance、workingPlayer和focus/seed。被职业正式模拟和Moment概率共用。年龄<22职业青年继续原分支；不能把青年诊断当一线队准备。

`canonicalBase`在READY入口完成现有保存规范化（焦点、年龄资格），经过validate/save/load应幂等。年龄资格可能连transferOffers的promisedTeamLevel/role都改写，不能只校验player。预演基础从canonicalBase派生；commit再次规范化不改变任何指纹字段。年龄规范化在到期后果前后出现两次有既有语义，不能随意合并消除：后果可能改变评价角色的输入。S0的22青年构造样本覆盖load先修复路径；S1另覆盖直接公共训练动作进入READY与offer修复。

## 2. Pending与指纹

建议新增keyMatchMoment模型、纯引擎模块和严格schema。Pending保存完整可读选择快照、所有三档profile结果、权重/difficulty/risk、rulesVersion=1、templateRevision=1；不只存模板ID再读取新字典。旧rulesVersion解析器保留，扩池不变更已有快照。

原始基础输入仍是GameState主体，不复制一份完整GameState进Pending。指纹v1采用递归排序对象键、保持数组顺序、拒绝undefined/NaN/Infinity的canonical JSON；明确hash算法和`fingerprintVersion=1`。可复用项目确定性checksum，但它只是完整性/上下文绑定而非安全签名，不声称防恶意篡改。为避免漏掉下游权威字段，使用GameState除phase、pendingKeyMatchMoment、save/data版本以外的全部字段：含完整player（不展示潜力）、draft、history、lastReport、contract、全部offer及顺序/选择/谈判、nationalTeam、cashEuro、事件队列/历史/story、bonus、训练、角色/进度、arrival等。外观属于独立UI settings，不加入。版本由Pending规则/指纹版本与schema另行约束。

冻结实际offer/基础stats摘要及准备后属性/状态、actualTeamLevel；在解析时由相同base重新准备，与快照一致后使用。规范化变更须迁移与重新验证，禁止自动刷新指纹以掩盖冲突。新输入只允许服务于新Moment，旧报告快照完全只读。

RNG：四个独立namespace绑定careerSeed/windowIndex/momentId；每次只保存/重现一个hidden roll。选择A/B/C均解释该roll，页面不显示roll/概率/潜力。身份包含seed、window、club、template/revision；不能把局部choiceId当全局身份。

## 3. phase与动作合同

|入口|合法条件|写入|禁止|
|READY无Pending|训练/事件已完成，未有本窗history；预演实际一线队appearances>0|触发则base+未选Pending+KEY_MATCH_MOMENT；不触发正式报告|把预演playerAfter或消费后队列写入暂停档|
|KEY_MATCH_MOMENT|Pending未选；careerSeed/player.id/window/club/moment/choice/fingerprint全部匹配|一次保存choice+resolution，phase RESULT|重复/陈旧/错误phase重抽或额外保存|
|RESULT|已选匹配且确定性解析一致|保存READY+resolvedPending，再执行同base正式结算|先清Pending或直接按页面delta写报告|
|READY resolved|完整跨字段校验通过|同base重算+一次完整报告/history/现金/合同/国家队/荣誉，清Pending|重新抽模板/roll，重复加delta|
|REPORT|Pending空，已有本窗history|原F分流/只读逻辑|再次模拟|

未选Pending不能放READY；非Moment/READY phase不容许Pending；选择与resolution同空/同非空；全部ID、窗、队一致；template恰好3个唯一choice；权重总和1±.001；delta goals/assists 0/1且和≤1、yellow0/1、red0、额外rating[-.15,.15]，有限。加载时重新解析冻结参数比较tier/delta，不能信任存档给出的任意数值。phase纠正只针对已批准旧档语义，不把不合法新Pending自动删掉。

临时只读导航可用，返回保留Pending。职业偏好编辑、训练、转会等改变指纹的动作在Pending期间拒绝/延后，不只是隐藏按钮。新生涯是显式替换旧生涯，所有旧回调通过careerSeed/player.id守卫失效。

## 4. 中断与失败

saveGame无storage当前会直接return；Moment交互不能据此宣称保存成功。对新提交路径明确抛可重试存储错误（非浏览器单测必须提供独立Storage）。保留现有老流程语义的范围由S1测试确定，不全局制造新失败。

新持久写入后回读原encoded完全一致并decode/校验；配套测试写入抛错、读回不一致、配额不足。`commit`先持久再set，错误留原页面；若已落盘但readback/后续set前中断，刷新恢复首次选择。重试要先识别磁盘已保存同moment/choice，不能用另一次选择覆盖。最终报告落盘但UI未更新时同理：重载报告；旧callback无权再加收入。

未知规则/输入冲突属于有意义的恢复失败，必须区别于普通损坏档：禁止走现有loadGame的catch→backup覆盖当前路径而悄悄丢进度。保持当前raw和backup不变，提供错误与原档保留信息；不重抽、不提交、不忽略贡献。该分支需要typed error或等价鉴别，不使用宽泛catch吞掉。

保存步骤是选择Pending→结果Pending→READY resolved→完整报告，各步骤可恢复；不是整半年只写一次。最终结算一次增加history且合同-1、收入一次，旧history/事件/国家队前缀按原规则保持。

## 5. V13与备份

建议S1 SAVE/DATA一起13/13；package仍2.0.0直到最终2.5.0统一发布。旧11→12分支目前直接引用最新常量，必须改为显式11→12，再显式12→13，加pending=null。旧report/history新字段absent，严禁追补Moment或把已有一线队履历当首秀。

有效V12原envelope首次被覆盖前：独立`career_save_v12_backup`不存在时原字节写入并读回逐字一致；已有不覆盖，V11备份不动。current及backup恢复入口都遵守。备份失败停止迁移，不改current/轮换backup。已有V12备份无效需明确失败/警示，不能默默覆盖。V11直接升13保留原V11；不得把迁移中的虚拟V12称作原始V12备份。

新生涯/自动保存不删除持久备份；显式deleteCareer目前删除current/轮换/V11，新增V12按相同“全部删除”语义处理并同步清晰说明。导入/导出当前未有通用入口，S1不要扩大造系统，仅对实际存在路径测试；退休PNG不是存档备份。

发布回退留S4/P1-R：记录7421b44及最终候选；代码回退后只能恢复升级前V12进度，不能声称旧客户端可读V13或保留新增窗口。回退前保留V13 raw，不造未验收降级器。

## 6. 最小文件范围

新增：data/keyMatchMomentTemplates.ts；engine/keyMatchMoments.ts；engine/simulationPreparation.ts（两级共享准备）；screens/KeyMatchMomentScreen.tsx；需要时models/keyMatchMoment.ts以避免互相引用。
修改：models/game.ts；persistence/save.ts；engine/simulateProfessionalHalfYear.ts；store/gameStore.ts；App.tsx；screens/HalfYearReportScreen.tsx、CareerHistoryScreen.tsx；styles/main.css仅新模块局部；有真实需要时导航/职业方向组件作Pending只读守卫；engine/trainingPlan.ts仅Pending阶段规范化接入，参数不改。
对应正式测试：新引擎、准备/OFF等价、store中断及persistence schema/备份、报告/导航/确认受影响回归。现有完整流程遇到新phase必须真实选择/继续，不全局Feature OFF；只有原算法配对的指定用例传明确OFF。

S1不得扩到12模板/新系统、改变训练或原市场规则；三个模板候选见parameters.json与parameter-review.md。新文件与旧改动逐项列候选SHA。
