# S1验证路径与后续样本锁定

## 输入与断言

1. baseline-results.json八例input/normalized/raw：明确构造、seed不变；raw是本批save/load真实输出，不是假称自然历史。S1从raw直接load，无预先重编码/backup；OFF业务字段与final全等，白名单仅版本与新增pending=null；旧history/report新字段absent。无resolution直接职业引擎输出也需独立配对。
2. 年轻原normal→Moment→选择→结果→READY→report；31 BODY/34 BODY/34 recovery与consequence相同链。准备态比对S0；consequence体能47→42→52恢复，bonus1+2归成长，不得保存消费后player与未消费队列；即时morale73是明确构造，不冒称真实事件已点击。S1另引用F-01 RESULT实际原档完成真实事件确认后链路。
3. 22-youth输入load规范化成FIRST_TEAM，完整offer/contract/role须幂等；另在公共chooseTraining链中观察commit，不以load路径替代。youth8实际YOUTH不得触发，即使期末升队；零出场由现有injury单元输入构造，须记录无出场来源，不扩大种子搜索。
4. 所有S0职业样本history为空：用于首秀边界候选（不是自然首次职业样本），首秀判断读取actualTeamLevel/appearances；另取已有一线队history的TLD2最终raw，验证旧档无Moment字段不算首秀。
5. 选择前、选择写入前/后、结果刷新、READY保存后、最终报告保存前/后七个故障注入点；独立Storage，current/轮换/V11/V12分别比较；双击与陈旧callback、错误phase/window/career/club/fingerprint无新收益。invalid新Pending不能静默fallback覆盖当前raw。
6. legacy READY/RESULT见source-manifest；T v11直接load→显式迁移→合法继续，保留originalraw。新13四类Pending（未选/已选/READY/已报告）snapshot不被扩池或修订重抽；非法组合逐项拒绝。
7. 全流程原用例遇到Moment要选择实际可见选项继续；只在原算法等价组显式OFF。S1当前候选全量/typecheck/build；不靠统一关功能绿灯。save无Storage、写抛错、写成功读失败/不一致都必须覆盖。
8. terminal54仅冻结原职业模拟，不证明退休链；S1再走report→原退休合法后继，不能超窗。市场报告导航及已经签约上下文复用T/M/F既有证据并覆盖插入Moment后的下一窗，不重开已关闭问题。

## UI操作

Browser plugin not available。后续使用已安装隔离Playwright，临时context、新localhost端口（例如4310，先确认空闲）、匿名Storage，不碰真实profile。`npm run dev -- --host 127.0.0.1 --port 4310 --strictPort`，关闭时记录PID；不能把已关闭URL写成可用入口。

S1至少三模板真实按钮链：计划→事件（若有）→Moment→结果→完成→报告→履历只读→回到当前。选择页刷新，结果页刷新，导航返回各一次；比较phase/W/H/raw/合同/cash/贡献，不只看页面。场景加载探针仅装载匿名raw；关键动作不可store替代点击。记录console/遮罩、实际hit center、截图目视、保存恢复。三档结果可明确构造，不冒称自然触发率。

## 后续范围（未执行）

S2由统筹/体验者实际5次含成功/失败/防守，记录选择理由/时长/跳读；自动点击不冒充人工。S4至少100独特种子清单见long-career-plan.json，11位置每组≥8；固定属性适配与轮换两策略、相同初始raw ON/OFF，事件/市场采用首个合法候选的稳定ID次序，遇分流记录。S0只固定种子/政策，尚未生成这些起始档/运行生涯；S4开跑前冻结实际raw+SHA及全部选择政策，不把计划JSON当已跑证据。

触发观察单独≥1000合资格普通窗口，保留上一半年有/无；首秀/青年/零出场分桶。P1再100条×24次合成轨迹五组各20条；不得以合成替代自然全生涯。无界搜索不属于任何关卡。
