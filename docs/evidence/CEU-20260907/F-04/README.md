# ASTRA-F04（待验收）

2026-09-09用户授权，仅F专项桌面/移动视口页面验收与文档收口。F-01至F-03及T/M已验收，K-09、国家队资格、MR-03/MR-05保持关闭。**F-04待Codex统筹验收，Q/R未开始。** 本批发现既有报价说明省略样本F04-V01，交统筹决定，不自行补修或宣布专项通过。

## 交付索引

- [case-plan](case-plan.md)：先锁定14组，目视后追加2组真正老将长摘要，最终16组，无种子搜索/长期扩展。
- [页面汇总与来源](page-summary-final.json)、[页面审查](page-review.md)、[截图逐文件清单](screenshot-inventory.json)：五种尺寸，16组48次真实按钮点击；成功63图、失败首轮4图、诊断2图，共69图，实际目视43图。
- `pages-r1/result.json`：前三组成功、第四组脚本阶段名错误停止，原错误和4图保留；`pages-r2/result.json`：未完成11组成功；`pages-r3/result.json`：补长摘要2组成功。所有结果含来源SHA/构造、input raw、逐步完整game/实际保存及最终raw；每个run保留当时script.cjs。没有手改phase推进流程；仅三个旧STAGE起点明确构造为REPORT。
- [问题/限制](issues.md)：F04-V01的1280截图、实际宽度/字体、源码位置及最小建议；390小字限制仍在。签约路径成功不等于环境文字完整性通过。
- [工程日志](targeted.txt)与[targeted命令](targeted-command.json)：11文件181项通过；[typecheck](typecheck.txt)及[命令](typecheck-command.json)退出0。无正式测试/生产改动，未重复全量/build。
- [复用产物核验](reuse-audit.json)：F-02 129产物＋F-03 33产物匹配；[源码核验](reuse-source-audit.json)：F-02交付后150个src文件匹配。引用F-03全量69文件626项及F-02 build成功，859.40kB大包警告保留。新增F-03测试也受本批before保护。
- [F-A当前总表](../../../21-career-experience-upgrade-qa.md)：九行逐项区分本批/复用/限制；开发完成、专项验收、整次升级可交付和发布完成分开。
- [命令补记](additional-commands.json)、`pages-r*-command.txt`、[只读复跑](readonly-check.txt)、`head-offer-style.txt`及`offer-diagnostic.json`保存实际结果。首轮脚本错误与哈希格式读取错误均保留，不改生产/快照/数值期望。
- `before-hashes.json`、`git-before.txt`、`protection-verification.json`、`changed-files.json`、`artifact-hashes.json`：实际工作树及冻结保护，不只用HEAD代替源码身份。

## 已证实与未放行

报告一步分流；有机会STAY/到期续约仍须确认；外部签约→NONE→下一计划；新退役临时取消/刷新与旧决定取消来源不同；W55强制不可取消；国家队原生确认取消零变化、接受仅两字段，俱乐部可继续；只读不推进；老将保存摘要逐字显示并保留换行。完整单次结算、15市场raw/14旧phase、READY/事件、旧令牌与训练守卫复用F-02/F-03及本批定向，未重新制造旧档。

本批一次事件结果合法继续会首次结算（1条history），其余页面没有新半年；没有重跑市场54窗、训练90窗或F-03六分支采集。各次保存恢复与完整报价/报告/事件数据可在逐动作结果审阅；截图不替代引擎证据。

F04-V01是既有报价卡环境文字省略，**到期视觉完整性子项待统筹判断**；其余已覆盖动作与新增footer布局未发现新反例。原有移动小字、桌面留白、长页滚动和430底栏的正常滚动限制保留。没有真实手机、其他浏览器、线上、旧客户端v12验证；不称跨设备/发布通过。

## 复跑与Q交接

`node docs/evidence/CEU-20260907/F-04/pages.cjs`默认只读检查既有16组，不启动浏览器/写证据；`inspect-offer.cjs`同样默认只读。需要新页面复验须显式`F04_CAPTURE=1 F04_RUN=pages-新的唯一名称`，新目录独占，校验本批前源码/依赖SHA及12/12，已存在目录拒写。浏览器使用4194本地服务，全部输入匿名；正常单元测试不启用旧采集开关。`run-checks.py`日志独占，再次运行已存在日志会拒写；不要覆盖历史结果。

本批4194服务已Ctrl-C关闭（退出130），临时contexts/browser全部关闭，端口无监听。HEAD仍`3f290407a299790665b58c4bc7c2bf8455d24bbd`，SAVE_VERSION/DATA_VERSION=12/12。只改docs01/02/20/21及新增F-04证据/独立脚本；不改生产、样式、参数、迁移、依赖、正式测试或冻结数据。未提交、推送、部署，无代理。

Q阶段在后续授权下处理综合完整生涯、三专项组合、旧档总矩阵、全局确定性、退役导出与真实设备；发布前另处理持久v11备份、旧客户端读取v12限制、版本与回退方案。本批不执行这些，也不把已有精准通过项重新列作未知。

**唯一下一动作：用户转交Codex审核ASTRA-F04，并决定F04-V01处理归属和F专项是否收口。**
