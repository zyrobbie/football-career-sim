# ASTRA-F04 预定范围（执行前锁定）

2026-09-09；仅F-04。HEAD 3f290407a299790665b58c4bc7c2bf8455d24bbd，12/12。14组按布局风险分配；不搜索种子，不追加长期观察。W为windowIndex，H为history末窗口。所有页面在新4194 origin、临时Chromium context；真实按钮推进，模块探针只装载/读取。先直接加载raw，无backup；必要REPORT构造仅phase单字段，saveGame后再次continueCareer校验。

| ID | 来源（B=docs/evidence/CEU-20260907） | 起点W/H及phase | 尺寸 | 预定真实动作及截图 |
| --- | --- | --- | --- | --- |
| ordinary-wide | F-01/results-final-r2 ordinary raw | 4/4 REPORT，首职业半年 | 1280×720 | 首屏/动作区，一步计划，保存刷新 |
| ordinary-mobile | 同上 | 4/4 REPORT | 390×844 | 首屏/动作区，一步计划，回看/返回/导航/刷新 |
| long-report | F-03/results ordinary.report实际逐动作状态 | 5/5 REPORT | 1366×768 | save/load该已记录状态；长报告/训练摘要、正式机会入口 |
| opportunity | F-01 opportunity raw | 5/5 REPORT | 390×844 | 报价→选择STAY→确认→计划 |
| breach-no | F-01 breach-no-opportunity raw | 4/4 REPORT | 320×568 | 次入口留队直达计划 |
| breach-yes | F-01 K09-breach-opportunity raw | 5/5 REPORT | 430×932 | 次入口留队→市场已选STAY→确认→计划 |
| expiry | F-01 expiry raw，读入后STAGE→REPORT单字段构造 | 11/11 REPORT | 1280×720 | 报告→市场，较长外部报价→确认→NONE→计划 |
| scarce-zero | M-02-R1/results quantity-and-successor count0 renewal raw | 12/11 MARKET | 390×844 | 已生成稀缺市场→只读报告→返回→续约→计划 |
| scarce-one | 同文件count1 external raw | 12/11 MARKET | 1366×768 | 已生成市场→只读报告→返回→外部签约→NONE→计划 |
| voluntary | F-01 optional-cancel raw，STAGE→REPORT构造 | 52/52 REPORT | 390×844 | 临时确认/取消/刷新/导航/最终确认→档案 |
| old-decision | 同raw，保持旧STAGE | 52/52 STAGE | 430×932 | 打开旧DECISION→刷新→取消回旧STAGE |
| mandatory | F-01 mandatory-55 raw | 55/55 REPORT | 320×568 | 强制决定，无取消/国家队→最终退役 |
| national | F-01 national-confirm raw，STAGE→REPORT构造 | 52/52 REPORT | 1280×720 | 原生dialog取消/接受，刷新，俱乐部继续 |
| event-result | F-01 SPECIAL_EVENT_RESULT raw（S0 v11原档） | 4/3 RESULT | 390×844 | 提示及合法继续→报告，首次完成本窗；不扩连续观察 |

每组首屏及动作区域截图；签约/到队/完成、确认/档案、只读等相邻布局额外截图。截图独占命名，逐图列目视/仅生成；发现问题保留并停止相关断言，不改生产。R1稀缺样本保留既有构造标签，不能称自然采集，也不把已生成市场的只读报告返回冒称新生成。

复用：F-02状态契约/73项及29旧状态、F-03六条各一个半年/实际双击/626全量、F-02构建。先核对产物与生产哈希；本批不重采结算矩阵。定向报告/store/保存/导航/确认/退役测试及typecheck；无正式测试变更则不重复全量/build。真实手机、其他浏览器、线上、旧客户端v12、发布备份/回退未执行，转Q/R授权阶段。

## 目视后补齐来源缺口（执行前追加，最终16组）

F-03 ordinary.report是年轻摘要；保留原long-report命名历史，但不以它证明老将训练长说明。追加veteran-wide（1280×720）与veteran-mobile（390×844）：直接读取T-02/migration-v12/real-veteran-LOW_35.json（原真实老将输入的v12结果，原来源标签继承），不改字段。首屏→长摘要区域（整段截图）→职业动作→合法下一页→刷新。仅展示已结算报告，不新增模拟。最终仍≤20组。
