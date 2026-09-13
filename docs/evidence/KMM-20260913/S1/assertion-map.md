# S0协议 → S1实际断言

正式测试 `src/store/gameStore.keyMatchMoment.test.ts`，33项。共享回归全量见命令索引，不用测试标题代替实际故障注入。

| 断点/契约 | 实际验证 |
| --- | --- |
| 选择前关闭 | 页面主三例Pending刷新并点击继续，完整game/raw相等 |
| 选择写入前失败 | write failure…注入setItem抛错，内存Pending不变，恢复写入可重试 |
| 选择写成功读失败 | write succeeds…注入current写后读抛错；旧UI改选B时采用磁盘A，不再次写入 |
| 结果刷新 | 页面主三例RESULT刷新保持快照；READY resolved测试从磁盘恢复 |
| READY保存前失败 | READY before-write，current仍RESULT，轮换仍合法RESULT，重载完成一次 |
| READY保存后读失败 | READY after-write-read，current为READY，重载一次report |
| 最终报告写入前失败 | REPORT before-write，current仍READY，恢复完成一次 |
| 最终报告写后读失败 | REPORT after-write-read，current已report，重载不重复结算 |

上述最后四例分别保存并比较current和轮换backup的phase/history，V12原raw精确相等、V11哨兵不变；最终全GameState与预先纯计算expected全等，旧history前缀/现金/事件/国家队包含其中，重复finish和continue零写入。没有宣称全部阶段仅写一次：READY和report是两个既有保存步骤。

其他：非法Pending不从备用档静默回退；V12备份失败保留current与V11；11→12→13保留真正V11 raw，无伪造V12；迁移/backup回写被静默丢弃时显式失败；报告/履历错位拒存且current不变。实际修改目录title/scene/choice/outcome再load/resolve/finish验证冻结文字与结果不变，finally恢复目录。扩到新模板与旧规则版本的综合验证留后续。

8例OFF只允许版本与pending字段差异。三模板×三选项×三结果共27次直接计算是构造tier，不是假称自然抽到。7例完整链冻结准备前player/contract/history/consequence/bonus；只在结束后消费并增加一条history。错误career/player/window/club/id/fingerprint选择零写。两次真实鼠标点击另见supplement：第二击目标是结果P，不冒充同一旧回调再次执行；陈旧store回调由自动化单独证明。

S0指定F事件/READY旧恢复由本轮相关F03/训练回归与V11 raw迁移组复用；没有新增声称完整自然生涯或所有旧阶段新实页。terminal54专项仅至report，年龄终点后继由既有完整流程回归覆盖；统筹若要求同一terminal54 raw的单独退休轨迹，应作为明确补证，不以该单测冒充已执行。
