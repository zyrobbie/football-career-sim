# 旧断言 → M-03目标

历史S0/M-01/M-02/R1 JSON、统筹复核及源码副本全部只读；不重新采集。修改当前测试含义，不能要求新行为继续复现旧缺陷。

| 原用例 | 原断言／缺陷 | 当前目标与证据 |
| --- | --- | --- |
| regular-reentry | 回看改phase后，新开cadence拒绝恢复 | 回看只改视图；advance/goToPhase过期动作无效；open原样复用，error null、完整state相等 |
| expiry-reentry | 回看结束后W+1，续约/外部重生成、谈判重置 | W、完整报价顺序、选择与谈判全部不变，先识别已有市场 |
| empty-reentry | 空市场恢复因新开节奏拒绝 | 空TRANSFER_WINDOW＋STAY也代表已生成，原样复用 |
| empty-forced-reentry | 回看后open(true)又推进和产生非空报价 | 强制申请入口也不能重抽已生成空市场；完整state相等 |
| S0 report reentry gap | HALF_YEAR_PLAN误调用advance变PRO_STAGE_COMPLETE | advance仅真实报告可用；计划完整不变，回看结束页也不改phase |

当前修改位置：gameStore.ceuM01.test.ts的4项行为检查及gameStore.ceuS0Baseline.test.ts的1项守卫检查。其他旧档、规则及边界测试继续执行，无整文件skip、无快照覆盖。M-02-R1的21项稀缺持久化/异常用例保持原样通过。

新增gameStore.ceuM03.test.ts共29项：15个原始envelope完整后继、1允许表、5非法输入、4种旧回看场景（各2phase）、1旧后继纯判定、1最新方向真实开市及下一半年、1新开门槛、1真实签约/到队/计划的6个旧phase保存恢复。数量是测试项，不把循环子例重复算成独立Vitest项。

初版工程失败保留：initial-full.txt（9个旧断言/稀疏构造守卫失败）；store-initial.txt（错误要求旧envelope加载完全不写，忽略现有loadGame格式规范化）。改为要求原始直读data完整相等，并在编辑动作前清空写入spy；同值保存/非法输入仍严格要求无写入。未为测试放宽Player/报价或随机标准。
