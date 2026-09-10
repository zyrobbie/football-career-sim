# M-03实施前状态及动作契约

2026-09-08。H=最后history.windowIndex（报告自身没有窗口编号，不从日期文案反推），W=当前windowIndex。保存版本12/12，无新持久字段。

| 状态 | 判定 | 处理 |
| --- | --- | --- |
| 已结算、未开市场 | PRO_STAGE_COMPLETE且W=H | 原机会/表现/失约/合同/年龄条件决定；新生成才W+1 |
| 普通非空/空市场 | TRANSFER_WINDOW；选择非null，空市场以STAY表示；无transferDecision | 已生成，不看数组长度，不检查新开机会；重复开市不写、不推进 |
| 到期市场 | 同上，合同0，续约1＋外部0–3 | 先复用；MR-05持久化规则不改 |
| 已签约/到队/完成 | TRANSFER_ARRIVAL或TRANSFER_STAGE_COMPLETE，transferDecision记录签约 | 禁止开市或重复确认；按原到队/进入计划动作继续 |
| 下一训练计划 | HALF_YEAR_PLAN；W=H+1，selectedTransferChoiceId为null、旧报价已清理 | 禁止重开上一市场；正常训练后产生新H |
| 旧回看/结束页中的市场 | HALF_YEAR_REPORT或PRO_STAGE_COMPLETE，W=H+1，选择非null、无transferDecision | 恢复为TRANSFER_WINDOW，原报价/选择不变；无新机会筛选，无新生成 |
| 旧回看中的签约状态 | 上述旧phase，W=H+1、选择非null、有transferDecision | TRANSFER且arrivalChoice为null恢复到队；否则恢复完成转会 |
| 旧回看中的下一计划 | 上述旧phase，W=H+1、选择null且报价空 | 恢复HALF_YEAR_PLAN，不再W+1 |
| 当窗报告/当窗结束页 | W=H | 报告允许原advance一次；结束页保留原F流程，本批不合并 |

已有数据未发现上述关键字段相同却需要相反处理的合法档。恢复仅面向明确旧phase与W=H+1组合；不使用时间、种子猜测或marketId。任何实际反例将停止并交D-C1统筹。

## 当前方向编辑允许表

同时要求player与职业contract存在。允许：HALF_YEAR_PLAN、HALF_YEAR_REPORT、CAREER_DASHBOARD、PRO_CONTRACT_OFFER、PRO_CONTRACT_COMPLETE、PRO_STAGE_COMPLETE、TRANSFER_WINDOW、TRANSFER_ARRIVAL、TRANSFER_STAGE_COMPLETE。部分phase自然不会有合同，合同前提仍生效。

禁止：HOME、四个CREATE_*、PLAYER_REVEAL、ACADEMY_OFFERS、ARRIVAL_EVENT、SPECIAL_EVENT、SPECIAL_EVENT_RESULT、SIMULATION_READY、RETIREMENT_DECISION、CAREER_RETIRED。若pendingCareerEvent仍存在，同样禁止。入口只在TrainingPlan与TransferWindow，由共享允许函数决定。

updateCareerPreferences只允许两个player字段；方向枚举与现有PREFERRED_LEAGUES共享校验，先验证输入再规范化，联赛去重后最多3个，DOMESTIC清空；非法值不部分写入。重复规范化同值不commit。draft与其他字段完整不变，不调用随机或市场生成器。

回看是非持久store视图标志，App显示只读报告；返回、任意导航、加载、换生涯清除。goToPhase仅保留已用开局回退边及只读回看请求；职业阶段不可任意跳转。advanceAfterReport限真实当窗报告，counter/confirm限TRANSFER_WINDOW；恢复先于新开门槛。市场完成后沿原动作清理报价，不激活旧结果。

类型核验补正：HalfYearReport没有windowIndex；H只取history。历史为空的最小状态，仅当PRO_STAGE_COMPLETE且报价空、选择null、转会决定null时沿phase声明允许新市场，再走原条件。无H不进行旧phase恢复推断。
