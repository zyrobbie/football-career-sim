# S1 有限验证表（运行前锁定）

仅冻结旧代码结果，不实现新策略。所有起点明确构造；不称自然生涯/真实匿名档。固定一次生成的CAM球员、原合法俱乐部/报价/合同，改年龄24（W22）、四能力65、三状态70、六关系60、潜力90、BALANCED、合同8半年及零事件。生成种子`psu-s1-source`只用于创建一次基础对象；主矩阵不按策略重生球员。

- 主矩阵：FRINGE/SUBSTITUTE/ROTATION/STARTER/CORE × PUSH/STEADY/TEAM_FIRST × `psu-main-000`至`099` =1500独特输入。角色同时对应合同承诺角色；跨策略只改developmentApproach。同输入各重复一次作确定性校验，重复不另计样本。
- 阈值：24岁FRINGE，form/fitness/morale分别45/46/47，其余70，三策略，27输入。固定`psu-boundary-000`，使低出场的TEAM_FIRST残留容易被直接观察；不搜索种子。
- 年龄：30 BALANCED、31 BODY_CARE、34 BODY_CARE，三策略9输入；三状态70。
- 高状态：34岁95/100三状态，BODY_CARE/MATCH_SHARPNESS/MENTAL_RESET×三策略18输入。
- 空策略：正常70、低form45各一例，与同输入STEADY比较；2输入。
- 青年分流：21岁/22岁YOUTH、ROTATION、有效青年合同，各三策略，共6输入。记录load修正及实际模拟分支，22岁不能被误计青年样本。
- 合计62边界，与1500主矩阵分开。边界均保存输入、完整输出、准备/维护实际探针及旧理论伤病概率。每例独立内存Storage真实save/load，原输入不改写。
- 代表READY公共store后继：正常STEADY、年轻恢复TEAM_FIRST、34维护各1例，continueCareer→报告→重载，恰好一条新history；不把引擎输出等同store国家队/事件最终组装。

伤病1000独特种子`psu-injury-0000`至`0999`仅预先列单，留S2按一般/临界/高状态/恢复/维护分组运行。连续观察留S2：24轮换、28主力、35老将，三策略各4窗；老将BODY_CARE和MATCH_SHARPNESS分别成组。现阶段不做额外长期观察或页面。

旧伤病公式0.03～0.12；现策略没有区间修正，仍有间接准备差异。恢复TEAM_FIRST残留是已批准修复目标，旧实跑仅证明缺陷，不是未来正确行为断言。

首次输入arrivalChoice=null在真实saveGame校验被拒（尚未进入模拟）；保留inputs.json及collection-initial.txt。修正为原helper的COACH，仅为READY合法性，不把报到效果重新执行；使用inputs-valid.json。主矩阵数量与种子不变。
