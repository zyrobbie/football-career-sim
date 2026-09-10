# F-01 有限预定案例（执行前）

不搜索种子。固定复用S0原raw：HALF_YEAR_REPORT、PRO_STAGE_COMPLETE、CONTRACT_EXPIRED、NEAR_RETIREMENT、SPECIAL_EVENT_RESULT、TRANSFER_WINDOW；补S0-v11-supplement/READY_attack。各例独立Storage，无backup先直读；v11经正式迁移。构造只基于加载后12版，记录全部字段差异、sourceSHA、seed；不生成v11。

1. 青训W2/H2、第四窗W3/H3：基于S0报告裁剪history/设窗口/去职业合同，明确构造；保持报告→计划/首合同链。
2. 首职业报告W4/H4与旧结束页：原raw。无机会报告→结束→计划，重复动作不多推进。
3. 正式机会W5/H5：原报告基础构造W/H及stats(10场7.5分)，有效合同；报告→结束→市场。
4. 失约W4无机会、W5有机会：上一组加brokenPromiseWindows=2，同步report.contract展示字段。分别继续留队、另支申请市场；K-09期望当前拒绝而未来应进入STAY市场。
5. 到期原W11/H11：不能直接继续，开到期市场。已有0/1/2/3外部沿用R1原raw，通过M-03定向恢复测试，不重新制作稀缺池。
6. 自愿退役可/不可、取消及确认：原NEAR_RETIREMENT，原年轻结束页；纯函数检查W33/34/38/40/41/46/47/48/52/53/54/55。
7. 末期到期W53/W54、强制W55、最后年有效W53/W54：NEAR原档构造W/H和合同remaining=0或1；对照报告直达与旧结束页兼容，不规避当前错误。
8. 国家队：NEAR原caps>0；取消确认、确认退出/重复/俱乐部继续；年轻、caps0、已退出、强制窗口分别核对UI与store资格。
9. 原事件结果：直读不模拟，continueAfterCareerEvent一次模拟/后续拒绝；READY_attack直读首次continue一次模拟、重复continue不再模拟。
10. 已有市场、旧市场phase、签约后继、只读回看：直接复用M-03原15raw/14构造旧phase定向测试，不重复54窗。

页面1280×720和390×844：各普通W4报告和到期W11报告，两次点击抵达计划/市场（必要后续确认不删除）；保存刷新计为验证操作不计流程点击。补390的K-09有机会失约页真实点击；补国家队确认/取消与自愿退役取消用于验证原确认契约。临时Chromium新origin，不读用户profile。先定位案例再运行，不扩大条件全排列。
