# ASTRA-F01 交付（待验收）

2026-09-08用户授权，仅报告后入口盘点、有限基线与F-02设计。M专项已验收，MR-03/MR-05关闭；F-02未开始。无生产修改、无代理、未提交推送部署。HEAD `3f290407a299790665b58c4bc7c2bf8455d24bbd`，版本12/12。

- [当前→目标流程及交接](flow-and-handoff.md)：逐行W/H、资格、按钮/store、字段变化、恢复、点击数、源码定位，分开M-03已完成与F-02待办。
- [预定case-plan](case-plan.md)：有限代表输入、无种子搜索；原S0/v11直接读，构造完整差异记录。未使用M-04误名inputEnvelope。
- [最终27项结果](results-final-r2.json)：24流程/资格例、2事件恢复例、1年龄表。每例sourceSHA、seed、changes/requested/input/raw及实际steps/最终状态。构造不冒称自然生涯。
- [定向命令](targeted-command.json)/[原始日志](targeted.txt)：10文件106项通过，含27新增、M-03原15raw/14旧phase恢复、报告/store/导航/确认/训练恢复回归。typecheck-command.json/typecheck.txt退出0。
- [页面脚本](pages.cjs)/[完整操作](pages-result.json)：独立4191 origin，临时Chromium contexts，Browser plugin not available，使用现有Playwright。1280×720、390×844各普通报告/到期报告，390另K-09、国家队确认取消、退役取消，共7组13图；console error/warning均0。
- before-hashes.json/git-before.txt、protection-verification.json、changed-files.json、artifact-hashes.json：现场及交付保护。

## 主要发现

**K-09仍可稳定复现**：results中的K09-breach-opportunity，构造W=H=5、有效合同、连续失约2、10场7.5分，正式机会available。报告→结束页，实际点击“继续留队半年”被store拒绝，显示“这半年已经有正式转会机会，请先决定去留。”game完全不变。影响为该次要按钮不可用，主“提出转会申请”仍可进入市场，并非整个生涯死锁。未来有机会留队应入MARKET/STAY并保留确认，无机会直接PLAN。原始截图K09-error.png；本批仅立证。

国家队强制退役上下文：UI隐藏退出按钮，store在W55仍接受直接退出（年龄/caps/retired/phase通过）。无重复结算，但不符合统一入口资格；交F-02共享守卫覆盖。chooseTraining仍仅检查game存在，是源码确认的陈旧回调风险，未在本批重复模拟造损失；不宣称已修。

自愿取消目前固定回PRO_STAGE_COMPLETE。新报告入口需保留来源；交接提出非持久确认视图与旧决定档兼容方案，避免自行新增字段。末期到期旧STAGE会由save/load规范化为AGE_LIMIT决定，实证纠正了初版测试的“应原phase不变”错误，不能将这一路径报告为持久化卡住。

## 页面计数与目视

普通报告→结束页→计划：两尺寸均2次；到期报告→结束页→市场：两尺寸均2次。刷新/继续生涯只作保存验证，不计流程点击。批准目标各1次，必要报价/续约/STAY/退役确认不删除。

国家队真实dialog取消零变化、接受只改retired/currentRole，刷新保持后可继续俱乐部；自愿退役刷新后取消回旧结束上下文。页面操作均实际点击及中心命中，非调用store代替点击。

已实际查看7图：ordinary-1280-stage、ordinary-390-stage、expiry-1280-stage、expiry-390-stage、K09-error、voluntary-cancel、national-club-continues（png）。另6张报告/阶段截图已保存，但不称逐张目视。按钮在正常滚动后可见可点，无横向溢出；桌面留白/标题换行和移动小字保持原布局。K-09错误toast遮住底部区域是实测错误反馈，未以隐藏错误凑通过。页面数据/布局基线不等于F-02目标通过。

## 原始失败与复跑

首次`CEU_F01_EVIDENCE=1 npm run test:run -- src/store/gameStore.ceuF01.test.ts`退出1：25项中2个构造国家队输入不合法（caps与history不一致、退出仍保留currentRole）；initial.txt和results.json保留。修正为createNationalTeamState及retired/null合法构造，不改生产校验。

第二次同命令退出1：27项中2个旧末期到期输入预期错误，save规范化为退役；directed-final.txt/results-final.json保留。typecheck-initial.txt另有测试optional字段undefined类型错误，改用delete。第三次同命令退出0，27项，输出新results-final-r2.json。没有覆盖旧结果、skip/todo、放宽数值或删断言掩盖产品问题。

正常复跑不带CEU_F01_EVIDENCE，默认只读。run-checks.py为实际定向/typecheck命令执行器，日志独占。首次证据开关只写F-01固定结果名且wx拒覆盖；不能删除旧输出重开采集。

页面命令`npm run dev -- --port 4191 --strictPort`及`node docs/evidence/CEU-20260907/F-01/pages.cjs`获权执行；server.txt/pages.txt保留原始输出，页面脚本退出0。浏览器context均关闭，本地4191服务已停止。中断后核对pages-result有7行完整结果，未无理由复跑。

## 范围、限制与停止

本批修改：新增src/store/gameStore.ceuF01.test.ts，更新docs/20、21，新增本目录。所有既有源码/测试、冻结证据和outputs应与前哈希一致，详见最终保护核验。构建缓存可能由typecheck更新，非生产行为。未重复全量/build/54窗/年龄全排列；既有大包警告保留。真实手机、其他浏览器、线上未执行；当前步骤数不能当作未来优化已实现。

**F-01待验收。唯一下一动作：用户转交Codex审核ASTRA-F01。** F-02最小设计须统筹审核后另获授权，不进入后续实现。
