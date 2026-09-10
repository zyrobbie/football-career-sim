# F-02 实施前状态契约与计划改动

用户2026-09-08授权，仅F-02；HEAD锁定3f290407a299790665b58c4bc7c2bf8455d24bbd，版本12/12。W=当前窗口，H=最后history窗口。依据文档35 FR-01/02/03。

| 上下文 | 动作及提交 |
| --- | --- |
| 旧REPORT/STAGE，W=H+1 | 先复用marketContext恢复市场/到队/完成/计划，0加窗，原报价/选择/谈判保留 |
| REPORT/旧STAGE，W=H，有player/合同/有效现队，无事件 | 重新判定合法动作；匹配预期窗口才推进 |
| W55或W53/54到期 | AGE_LIMIT决定，一次提交，0加窗，无国家队退出/取消 |
| 到期且可签约 | 一次提交W+1及续约1+外部0–3，无STAY |
| 连续失约且可开市 | 申请进入市场；留队在正式机会时市场/STAY待确认，否则PLAN；仅+1一次 |
| 正式机会 / 普通 | 分别一次到市场 / PLAN，W+1；不模拟、不改已结算事实 |
| 新REPORT自愿退役 | 仅内存确认token（生涯/窗口/phase）；取消/刷新回报告，最终重新校验并一次保存RETIRED/VOLUNTARY |
| 旧STAGE及旧DECISION | 原持久决定兼容；自愿取消STAGE，强制不可取消 |
| 只读回看、事件、训练、签约后继及陈旧动作 | 不按新报告推进；只读仅返回；训练仅PLAN及预期上下文匹配 |

国家队共享次入口资格；确认仅retired/currentRole变化。所有commit、导航/回看、读取、新生涯清临时确认；旧token不能作用新生涯/窗口。

计划修改：新增store/professionalNextAction.ts和共享ProfessionalReportActions；gameStore相关入口；HalfYearReport/ProfessionalStageComplete/Retirement/App/TrainingPlan最小接线；局部CSS按需要；F02测试和当前旧断言适配；docs01/02/20/21。冻结证据及outputs只读，测试采集默认关闭。无引擎参数、存档schema/版本/迁移或依赖修改。


## 实际接口补记

生产已实现professionalNextAction及allowsProfessionalAction；真实报告按钮携带expectedWindowIndex和careerSeed。chooseTraining第三参数为可选CareerWindowContext，UI必传；旧两参数合法PLAN调用仍可用。新确认令牌除生涯/窗口/phase匹配外还检查对象身份，取消后重新打开的旧回调失效。旧confirmRetirement支持可选预期生涯/窗口，真实确认页传入。所有临时状态均不属于GameState；存档12/12、迁移未改。

ProfessionalReportActions供新报告和旧STAGE复用；国家队确认内容从旧页移至共享组件，旧导出保留兼容。App展示真实game配合confirmation属性，未伪造phase/reason。closeReportReview同时清临时确认，现有导航调用点无需另改。
