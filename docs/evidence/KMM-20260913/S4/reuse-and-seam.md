# 本轮接缝与复用边界

OFF仅在公开流程已生成但未选择的新Pending处接入：清除pending、恢复SIMULATION_READY，调用现有纯runReadySimulation(...,{keyMatchMoments:false})，经真实saveGame后同步store。保存基础player、后果队列、bonus、合同仍未消费，未改游戏源码。不会把ON也关掉；ON使用真实chooseKeyMatchMoment/finishKeyMatchMoment。未触发窗口继续同一公开流程。S0八例OFF原算法全业务等价由当前默认全量中的S1专项复验。

audit.config.ts是独立显式入口，career.audit.ts不是默认*.test.ts，不在默认全量中重复跑300生涯；README分别报告两个命令，不把没有跑的跳过测试计入。程序固定输入SHA、401候选源码SHA，mkdir独占outputs/KMM-20260913-S4；正常复跑会因目录存在拒写。再运行需明确新输出目录并保存修改后的脚本SHA；不得删除旧结果。

每次公共动作结束，保存JSON.data与内存完全一致，loadGame再与内存完全一致；历史旧前缀与唯一窗口、球队合同、有限数值检查。Pending/Result不得提前改变现金/player/history/后果/bonus。Storage写钩子逐次保留READY中间写与最终报告hash；首个seed每策略各首次phase有原raw压缩checkpoint，全部生涯有完整最终raw。没有宣称每次READY中间写都本轮再注入故障。

S1故障注入矩阵（选择写前/写后读、READY写前/写后读、报告写前/写后读、V12备份失败）与S3旧15raw跨扩池的实际公开操作由本轮全量复验。S1原日志是当时证据，目录已扩12；当前全量通过才是当前目录上的同测试重跑。S3 build/页面身份见reuse.json；生产/组件没有改变，只引用不重跑。真实手机、其他浏览器、线上均未执行。

新增审计依赖：outputs/KMM-20260913/coordinator/S4-inputs/initial-raws.json（100raw，SHA见run-manifest），S3/candidate-source-sha.json、S4/policy.md。这是显式大审计所需输入；最终CI/归档若需重跑必须提供这些文件，不能仅上传脚本。默认正式测试输入仍以S1/S3 required-test-inputs清单为准。未选择发布文件或stage任何文件。
