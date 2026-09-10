# ASTRA-T01 交付、覆盖与T-02交接

2026-09-07，执行任务01a07a1f-d1f8-7f43-a89a-4a75d75a0c2d。仅T-01，状态**待统筹验收，饱和真实夹具有缺口**。生产HEAD仍为main/3f290407a299790665b58c4bc7c2bf8455d24bbd，所有受核对生产文件与该HEAD逐一同哈希。

## 交付入口

- [老将夹具及覆盖表](../S0-v11-supplement/README.md)：10份原生v11 envelope、逐份manifest及哈希、完整动作序列、100种子200条生涯搜索记录、独立加载继续验证。
- `src/store/gameStore.ceuT01.test.ts`：独占写入生成保护；正常运行直接读磁盘夹具、逐份隔离恢复；第二用例复演各自公开动作并观察精确保存值。
- `src/engine/__tests__/ceuTrainingBaseline.test.ts`及`ceuTrainingBaselineFixture.ts`：构造引擎输入与完整输出冻结，**不是公开生涯存档**。当前构造引用版本常量，冻结JSON固定为v11；旧存档中的11不替换。
- training-v11/young-full.json：13至30每一整岁×ST/CM/CB，共54个输入组，每组六种旧焦点，共324个原引擎输出。13/14岁走simulateHalfYear，15至30走simulateProfessionalHalfYear；一线队状态为定向构造，非声称所有年轻球员真实都在一线队。完整输入/输出供后续逐字段比较。
- training-v11/representative-full.json：35岁、三状态80、四能力70/潜力90，ST/CM/CB×ceu-training-0..99，共300组/1800个六焦点输出；同输入五种普通焦点Player与stats相等，ADAPTATION另有作用。
- training-v11/boundary-full.json：三位置×七年龄30/31/33/34/36/37/39的21组；35岁各单项状态45/46/95/100共36组；属性达到潜力3组，共60组/360输出。边界固定ceu-training-0，不做巨大全组合。
- training-v11/artifact-hashes.json记录大小/哈希，训练JSON合计约9.53MB，使用紧凑JSON保存完整输出；不要把尺寸误作截图或用户数据。

## 覆盖与缺口

| 门槛 | 本轮结果 | T-02前动作 |
| --- | --- | --- |
| 35岁未选计划 | 已采且恢复通过 | 直接作为null焦点迁移输入 |
| attack/physical事件处理中及结果 | 均采到；两者也有已选路线档 | 对照pending及旧事件即时效果，禁止重新选事件 |
| 真实SIMULATION_READY | 两种焦点均采到；覆盖有事件/无事件 | v12入口规范化后只模拟一次 |
| 老将低状态 | plan及已选attack路线fitness43 | 验证恢复覆盖、不重复即时效果 |
| 老将饱和真实存档 | **未采到**；200条限定路径无old attack/form≥95 | 统筹决定接受构造边界替代、或另授权更有针对性的公开选择策略补采；执行者不自行放行 |
| 饱和单元输入 | 95/100及能力=潜力均已冻结 | 可测公式/默认解释，不能冒充真实存档 |
| 新维护效果、11→12迁移 | 未实现、未验证 | T-02获授权后实施，不能以本轮通过代替 |

## 验证结果

最终命令（项目根执行）：

```sh
npm run test:run -- src/store/gameStore.ceuT01.test.ts src/engine/__tests__/ceuTrainingBaseline.test.ts src/store/gameStore.ceuS0Baseline.test.ts
npm run typecheck
```

最终定向3文件/7项通过，退出0；typecheck退出0。日志targeted-tests.txt/typecheck.txt。生成日志capture-generation.txt为初次1项/40.66秒（当时尚未新增复演测试）；training-generation.txt为1项通过。再次开启补采开关故意触发已存在目录拒写，退出1属预期保护验证，exclusive-write-guard.txt保留原始“1 failed/1 passed”结果，不标成常规测试通过。命令及退出码详见validation.json。

原S0全部文件、S0-R1、已有outputs、README、文档23/24/25与旧S0测试均通过开始前哈希核对；protected-hashes.json为清单。生产文件既与开始前哈希一致，也与指定git HEAD逐项一致。全量、build、真实浏览器/手机未执行；本批无生产行为修改，不需要声称页面验收通过。

## T-02窄范围交接

先由Codex审核本交付，**处理饱和夹具缺口并验收T-01后**再另发T-02指令；本批不自动解锁T-02。实现配置按文档25建议中度。

1. 直接读取原S0七份及补采十份envelope，每份新Map/空store，不能先用v12重演旧生涯。核验原哈希后load→continue→save v12→reload；新结果只写T/migration-v12，绝不写S0或补采目录。
2. 原history和已有报告/报价、已存事件选择保持；待结算35岁attack→MATCH_SHARPNESS、physical→BODY_CARE，仅规范化一次，canonicalState供引擎/保存/新history。ready只模拟一次、result不重做事件、null继续等待选择。
3. 旧v11-only生成/逐字复演测试必须作为历史工具明确归档到当前自动发现范围外（保留源码、冻结产物与单独历史复跑说明）；当前生产套件换成新维护及直接读v11迁移用例，不机械改版本11、不重生成旧档、不无声skip。年轻输入保持冻结，调用新引擎与young-full输出逐字段比较；老将representative/boundary是旧行为对照，新收益另设断言。
4. 恢复/策略/事件的时点按文档23：选择时<46不承诺维护；事件/延迟后果后判定恢复；策略之后不再判一次。用低状态真实档及单元45/46、95/100组合验证。事件跨阈值的精确构造需单独标识，不能改真实夹具。
5. 完整报告链必须同时有合同hint、现金上限hint、国家队hint，eventSummary仍保留真实维护结果/覆盖原因；保存后不重算旧报告。这些是**未来验收清单，本批未通过**。
6. 参数+4、−2/−3、身体衰退×0.8是已确认首轮候选；新实施后同输入配对检验成本、上限、低状态优先和衰退保留。100种子代表组与边界组分开。年轻13–30不得改变结果。

下一执行者可复制：

```text
你接手CEU-20260907训练专项。先读docs/25和T-01/README，核对主台账T-01验收状态及饱和真实夹具缺口的统筹决定。
没有T-02明确授权不得开始生产修改。获授权后仅按本索引六项交接和文档23训练/迁移契约实施，不做M/F。
直接读冻结v11原S0与补采envelope逐份隔离迁移，保护历史、事件、报价；新结果写新目录，不开启旧生成开关。
年轻原输入输出逐字段对照，老将旧输出仅作为差异基线；新维护与完整报告链另验证。更新主台账及真实证据后停在统筹验收，不提交、推送或部署。
```
