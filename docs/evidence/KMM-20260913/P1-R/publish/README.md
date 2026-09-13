# V2.5.0 正式发布记录

完整40模板V2.5.0已发布：[在线游戏](https://footballcareer.zyrobbie.site/)。存档/数据13/13。产品提交`404572eb6e557bf050b337a513c88c693cf5b7b7`，测试补正`b08ac9e014c8facd515a6ef00b165e21ac00b20f`；[Pages34746326886成功](https://github.com/zyrobbie/football-career-sim/actions/runs/34746326886)。最后的纯文档提交/部署身份另存本地`docs-closeout.json`与`docs-ci.json`，不递归新增提交。

## 精确发布范围与失败记录

批准166路径、实际165项产品变更，48份默认测试输入随产品提交；`product.json`、`commands.json`、`staged-paths.json`记录实际操作。未使用全量add、清理工作区、强推。`v2.5.0`指向404572e，`rollback/pre-kmm-v2.5.0`指向7421b442983d27bc17f535cf741a7f065b1ee87e。后续测试/文档提交不移动标签。

初次CI34745481895两次均795/796：首次单个生涯复演5211ms超过默认5秒；同提交有限复跑后另一确认测试缺Storage。原输出保留`ci-failure.log`、`ci-retry-failure.log`。补正仅两测试文件：两组长生涯预算30秒，全部样本/断言/动作上限保留；确认测试使用独立Storage与确实触发时刻的固定seed ci-confirmation-77，并断言报告/历史时刻相等。详见`ci-fix.md`及诊断输出。未改生产守卫。

补正48项定向、隔离全量78文件796项、typecheck通过（`ci-fix-targeted.log`、`ci-fix-full.log`、`ci-fix-typecheck.log`）。最终full包含新增历史一致性断言。一次旧预算诊断误匹配本地候选副本所得86项不算新增覆盖；正式隔离full没有重复目录。GitHub实际npm ci、796项及build/deploy成功，原始日志`ci-fix-deploy.log`。本地复用node_modules不冒称网络安装。

## 线上实际验证

`online-assets.json`：HTML953字节、JS963050字节、CSS133081字节均与验收候选SHA完全相等。`online-assets.py`为只读抓取工具。`online.cjs`使用真实在线应用、两个全新隔离Chromium context，无本地源码注入或真实用户profile。

- V12：S0/baseline-results.json young原始匿名raw；直接写入隔离current后由页面继续迁移，13/13、V12备份与原raw逐字相等、V11备份未凭空产生。选择A→结果→刷新/继续→完成半年→设置→返回。
- V13：P1-C/page-inputs.json第1项的自然ST Pending（该文件明确原始路径与种子），用原选择。加载完整状态、结果及最终报告分别与冻结原输出深比较相等。刷新未重抽。
- 每例6次真实按钮点击，中心命中检查；两个报告各新增一条history，旧前缀不变，实际报告时刻等于保存结果。设置显示2.5.0、13/13；返回不改变报告。没有框架遮罩，console error/warning均0。

原始动作前后存储、备份与截图在本地`online/`；8张390×844截图均已逐张目视，清单`online-viewed.json`。选择/风险文字、结果、当时比分、报告贡献及下一步按钮可读，正常滚动可达；没有以DOM全文或HTTP200替代页面验证。两个新半年仅为上线烟测，不重跑长期观察。上下文由脚本finally关闭，无本地服务启动。

## 保护与限制

`protection-closeout.json`逐项比较发布前5910文件：无缺失，只有5份本批收口文档和2份授权测试补正不同。全部既有其他证据/outputs及生产源码保持；新统筹review由统筹独立添加。最后只按确切Markdown路径提交，不打包大JSON、截图、outputs或dist。

回退代码已做810文件隔离相等演练；V13不能无损降级。保留V13后再由用户明确选V12备份，会丢升级后进度，不能自动覆盖。真实手机、其他浏览器、人类阅读耗时未测；正常滚动与紧凑字号沿用。963.05kB大包警告，以及CI第三方action运行时deprecation提示保留，不为消警告扩大依赖改动。近期四次抽取、300完整运行与CDM归因边界沿用已验收P1-C，不声称最终平衡。

[统筹发布复核](../coordinator-release-review.md)；[用户版本说明](../../../../key-match-moment-v2.5-release.md)。本轮完成后停止，不追加功能。
