# 实施边界与旧快照

生产只改src/engine/keyMatchMoments.ts：availableMomentTemplates接收已经按位置筛选的合法池与history，倒序取四次实际Moment；先排除全部记忆，池空则逐条pop最旧记忆，直到有候选。只一模板仍返回它；空合法池仍空。原createKeyMatchMoment的资格、首秀、45%/75%触发、随机盐、准备和roll均未改。历史无Moment窗口不清记忆；未添加持久字段或规则版本。

新算法只在create阶段调用。validate/resolve/snapshot未变，旧Pending中的三选项和一次roll不会重新抽取。旧S1的15raw与5组后继由目录定向测试复验；P1A/P1B共10条Pending由原文件直接加载，Result/报告从各自已冻结实页归档无改动提取。公开选择、保存刷新、finish得到完整原Result/报告；finish写入钩子捕获真实READY，独立无backup载入再继续也得到原完整报告。另从旧Result直接继续finish确认。READY为本次由旧Pending公开动作新产生，不冒称此前已有raw；见ready-fixtures和legacy-fixtures/index。

100×24为选择器合成轨迹，固定seed和空窗间隔，不把伪history写成游戏存档或自然生涯。100条全部8/8，单模板最多5，组内合并8；小池退化/位置变化单独测试。自然审计另验证每次实际生成都不在最近四次中，证明生产调用接入。

S4非Moment政策文件逐字节复用；审计允许差异只为路径/候选锁、合同资格分桶纠正、近期四次断言、详细窗口及预选5路径保存钩子。audit-diff.patch可逐行复核，未重设计训练/事件/合同策略。audit-source锁定当时408个既有源码/资源等；其后只新增本批默认测试文件，不改变运行时生产源码，最终candidate-source另列完整身份。

P1B目录SHA及矩阵身份复用；1800矩阵又随定向和全量只读通过，未重写P1-B输出。页面组件、CSS、参数、版本全部保持。新的长期统计与S4不可混称同一候选结果。
