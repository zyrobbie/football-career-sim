# 来源与旧断言 → 新目标

| 当前测试/来源 | 旧断言/构造 | 批准目标/实际适配 |
| --- | --- | --- |
| gameStore.ceuF01 | 从当前引擎重建27项；报告先STAGE | 直接读F01/results-final-r2中原raw/inputSHA，24流程＋2事件＋1年龄表；普通/机会/到期按新分流；永久拒绝旧采集开关 |
| F01 K09 / breach-no-opportunity | 先advance至STAGE再选留队；K09报错 | 在原报告直接选留队；无机会PLAN，有机会MARKET/STAY待确认；新F02各同时测REPORT/STAGE |
| F01 national-mandatory-store | W55直接退出成功 | 完整状态不变，UI模型也无国家队次入口 |
| gameStore.test 四窗链 | 到期报告→STAGE，再开市 | 报告直接TRANSFER_WINDOW；过期继续/重复开市不改市场；普通一次PLAN另以明示legacy-stage分支保留市场节奏/失约检查 |
| gameStore.test 末期/国家队/自愿构造 | 改W但H不匹配或无history | 末期改读F01冻结合法输入；其他年龄构造同步最后history.windowIndex，标明构造；不放宽生产W=H |
| v1ClubWorkflows | 职业STAGE有合同但history=[] | 仅STAGE夹具加入F01 ordinary最后history的构造标记（windowIndex=9、clubId=测试现队），保留既有球队/报价/数值生成断言 |
| createCopyAuditGame/confirmationFlows | 通过advance生成旧STAGE，年龄构造只改W | 新报告不生成旧阶段；仅审计测试fixture明确构造phase=STAGE，年龄构造同步H。生产首合同流程未改 |
| gameStore.ceuT01 | 先试开市，检查特定拒绝文案，再继续 | 原v11 raw迁移后使用共享合法主动作；保持21档历史/报告/报价/实际后继断言 |
| M03/M04/R1等 | 原恢复、稀缺、偏好及生成契约 | 不修改测试或冻结数据；全部继续通过 |

F02新增构造仅基于F01最终输入更换REPORT/STAGE或明确破坏单个上下文字段，逐项写store-results。15市场raw来自冻结M03记录中的M01/R1原envelope，14旧phase来自冻结M03记录；直接放入全新Storage、初始无backup。签约、到队NONE、下一PLAN单列实际前后状态；无字段重写掩盖首次加载。

初始测试失败日志full-initial.txt保留（14失败/533通过），不是旧产品回归被静默忽略。F01生成源码修前副本f01-before.test.ts.txt在正常发现范围外；原F01 JSON/失败日志均保持。新旧raw从未批量改版本。
