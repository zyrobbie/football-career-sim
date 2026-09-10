# ASTRA-T04训练综合验收交付（待验收）

2026-09-07；GPT-6 Astra轻度。用户明确转交T-04授权，仅验证和文档收口。生产HEAD `3f290407a299790665b58c4bc7c2bf8455d24bbd`，本地既有改动未提交，版本12/12和全部首轮参数不变。完成后停止，由用户转Codex审核；未进入M/F/Q/R、未提交/推送/部署、无代理。

## 入口

- [验收总表](../../../21-career-experience-upgrade-qa.md)：主台账T-A七项目标逐项对应已有证据、本次补证、实际结果及风险。
- [运行前政策](policy.md)：来源、固定种子、选择/分流规则及界限，先写后运行。
- [来源清单](inputs.json)：**17真实匿名旧档＋4构造边界档**，原始路径、SHA、种子、窗口和phase；inputs/另存明确构造的v12起点，不冒充真实旧档。
- [逐步流程结果](verification.json)：21旧档＋3跨年龄路径＋9条长期分支；每步公开动作、phase/window/history，实际计划与训练摘要。results/为新保存的匿名v12 envelope。
- [长期汇总](long-summary.json)：状态范围、四能力净减少与逐窗负变化累计、恢复和饱和次数、focus变化及无卡住结论。
- [四种视口及事件预览](page-verification.json)、[事件46→45](event-flip.json)、[报告其他视口](report-viewports.json)、[真实重复点击](dedupe.json)。均非动作spy。
- [命令记录](commands.json)、[定向](targeted.txt)、[全量](full.txt)、[类型](typecheck.txt)、[构建](build.txt)、[离线证据核查](audit.txt)。
- [问题与未完成项](issues.md)、[保护核验](protection-verification.json)、[改动文件](changed-files.json)、[产物哈希](artifact-hashes.json)。

## 复用与补证范围

T-01冻结54组年轻输入/324输出、ST/CM/CB边界；T-02 900次配对与21档迁移/事件/到期后果一次性验证；T-03 1280×720及390×844的52图与真实页面流程均复用，原产物逐文件哈希复核且不覆盖。

本次直接从七份S0、十份老将、四份TR-01输入启动新的Chromium context。旧档第一次加载保留history/事件前缀，非READY同时比对旧报告、报价、pending；READY允许一次新结算。训练计划用页面点击，其他阶段用公开store动作到新报告；每份再保存重载、重复continue，完整state相等。21份均新增恰好1报告，未发现非法后继。不是21份全部真实采集。

原TR-01四份是SIMULATION_READY，加载直接结算；**饱和旧计划在选择页继续**另用PLAN_35的明确构造v12副本（form100、旧attack）覆盖，见inputs/old-saturated-430.json。没有将READY的结算路径冒称计划页面交互。

跨年龄起点分别窗口35/41/47、seed ceu-t04-boundary-30/33/36，取真实PLAN_35副本，仅改起点窗口与种子。后续不手改phase，公开流程完成两次新报告及下一窗口默认值。首次选择心理类、普通重渲染和“球员→生涯”返回后保留；新窗BODY_CARE默认，不带旧草稿。构造输入历史仍来自35岁原档，不能用其旧日期论证自然生涯连续性。

长期只用固定ceu-t04-long-0/1/2。每种子的3个分支起点SHA完全一致，选择策略已预先写明；每支10窗（44–53）后停止，共90窗。每窗报告后实际reload/continue并逐字段比较完整state。发生1次低状态恢复改选、12次身体维护准备饱和零直接收益；成本与衰退说明保留，未卡住。累计能力净减少含事件等影响，不作纯年龄衰退归因或胜率推论。

## 页面步骤与截图

使用本机已缓存Playwright/Chromium、独立context，访问127.0.0.1:4185；未安装依赖、未使用用户profile。Chromium启动走工具审批后运行，命令均退出0。绝对runtime路径写在脚本中，运行时版本见runtime.json；跨机器复跑需使用本机可用的Playwright路径。不要覆盖本目录，复跑时改E输出到新目录。

| 新增视口 | 训练代表场景 | 训练截图 | 长报告截图 |
| --- | --- | --- | --- |
| 1366×768 | 31岁六项 | [完整说明](screenshots/age31-1366-plan.png)、[CTA](screenshots/age31-1366-cta.png) | [报告](screenshots/long-report-1366.png) |
| 320×568 | 35岁三项 | [完整说明](screenshots/age35-320-plan.png)、[CTA](screenshots/age35-320-cta.png) | [报告](screenshots/long-report-320.png)、[完整摘要](screenshots/long-report-320-summary.png) |
| 375×667 | 低状态恢复 | [完整说明](screenshots/recovery-375-plan.png)、[CTA](screenshots/recovery-375-cta.png) | [报告与CTA](screenshots/long-report-375-cta.png) |
| 430×932 | 饱和旧计划 | [完整说明](screenshots/old-saturated-430-plan.png)、[CTA](screenshots/old-saturated-430-cta.png) | [报告](screenshots/long-report-430.png) |

共17张新图。完整元素截图用于读文字，不能用其中固定底栏的位置判断点击遮挡；实际CTA视口图在正常滚动后保存，中心hit test通过并执行真实Playwright click。训练按钮还对原DOM再点击，完整state与首击后相等。事件结果/旧报告另对同DOM连续两次点击，比较真实收入、history、事件记录及完整state；未用spy替代模拟。

人工查看了上述代表图：训练说明14px、换行完整；320宽长页可滚动，摘要完整显示；正常滚动后CTA在底栏上方可点击；禁用原因与旧选继续说明可见；未发现本范围重叠/截断/横向溢出。报告段落逐字等于保存的eventSummary；新报告术语检查通过，旧112字恢复报告保留原文。原统计区小字与桌面留白没有重做。

恢复反转：恢复375输入fitness45→实际事件A给+4→49，最终维护；event-flip-46输入正常46→相同事件C减1→45，最终恢复。两者都从真实计划页开始，无手改phase伪造完成，实际选择/存档见page-verification/event-flip及results/。前两条未反转的TRANSFER_RUMOR样本保留，不充当反转证明。

## 验证结论与限制

- 定向6文件49项、全量60文件415项（18.10秒）、typecheck/build通过；主包851.92kB、gzip236.63kB，>500kB警告保留。没有放宽断言、改冻结快照或跳过失败测试。
- 本批前377个文件中373个字节不变，4个授权文档变化；全部生产src、冻结证据与outputs相同。更改只有docs/01/02/05/20，新建docs/21及本目录。
- 通用司机每步cash诊断字段缺失，不能作为现金数字日志；现金防重证据使用完整state重载相等及dedupe.json的明确cashEuro数据，详见issues E-01。
- 真实手机未执行；Safari/Firefox、线上、旧客户端读取v12与持久v11回退演练未执行。只验证模拟视口，不自行进入Q或发布。

供用户转交统筹：

```text
请审核CEU-20260907 ASTRA-T04。先读docs/21及T-04/README，核对before/protection/artifact哈希。
重点审核17真实＋4构造的来源区别、旧阶段公开后继与新history、3组构造跨年龄及90窗有界观察、真实UI重复点击和45↔46恢复反转、四新增视口及已复用T-03证据。
注意issues.md的真实设备/发布回退/小样本/司机诊断字段限制。生产代码未改，T-04仅待验收。
请给通过或明确补证/返工范围；未经审核不要启动M-01，不提交推送部署。
```
