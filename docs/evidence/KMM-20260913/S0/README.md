# ASTRA-KMM-S0 / KM-01：待统筹验收

2026-09-13。HEAD `7421b442983d27bc17f535cf741a7f065b1ee87e`；package2.0.0、SAVE/DATA12/12。仅S0基线与协议，不实现新玩法，不进入S1。完整版本目标V2.5由统筹逐关放行。主台账为[主规范第24/29节](../../../football-career-key-match-moment-upgrade-v1.1.md)。

## 交付入口

- [固定case-plan](case-plan.md)、[S1准备/Pending/存储协议](s1-protocol.md)。
- [三模板取舍](parameter-review.md)、[135行候选与315条评分合成边界](parameters.json)。不是正式引擎注入结果/平衡验收。
- [S1验证路径](s1-verification.md)、[V2.0视觉复用及五视口硬门槛](visual-plan.md)。
- [8例完整原算法输入/raw/准备诊断/最终保存](baseline-results.json)、[全部构造字段差异及规范化变化](input-differences.json)。原始来源本身为PSU构造档，均不是自然年龄生涯样本。准备diagnostic仅一线队适用，youth8实际走青年原分支。
- [来源与14个文件SHA](source-manifest.json)、[20组旧页面computed](visual-baseline.json)、[810文件工程身份复核](baseline-reuse.json)。大型来源只引用不复制；原TLD2归档仍在outputs，临时路径消失可按既有归档恢复到新目录。
- [命令/退出码](commands.json)、[保护清单](before.json)、[最终核验](protection.json)。

## 实际结果与界限

统筹本轮运行75文件/747测试、typecheck、build均通过，本批核对810文件SHA零差异后引用，没有重跑整套。main bundle911.56kB旧警告保留。

本批新跑8例，另只读复跑8例，都是同8个构造输入而非16独特样本；每例公开continueCareer产生一个报告、history+1，保存/加载一致，重复报告继续不增加存储写入或结算。没有人工页面操作。22岁青年输入经原validate修复为一线队；youth8报告actualTeamLevel=YOUTH。第一轮脚本的无效sourceEventId失败与主机socket限制保留baseline-initial.log，修正构造及授权临时socket后通过；没有修改生产解决失败。

原算法OFF契约、准备规范化、备份与参数矩阵已经具体化，但新功能的OFF、Pending恢复、注入评分、三模板页面、人工体验尚未实现/验证。100独特种子清单是后续计划，未生成raw、未跑生涯。三个模板135行覆盖有限画像，不证明全域不存在固定劣势或最终平衡；中卫保守项在均衡画像占优是明确预期。

V2.0截图与computed只读复用，6个生产候选身份一致、14来源哈希核验；本批新增截图0、目视0、页面click0。真实手机/其他浏览器/微信/Safari/线上/相册均未测，本批未启动页面服务。临时Vite模块服务finally关闭。

复跑：在仓库根目录执行`node docs/evidence/KMM-20260913/S0/baseline.mjs`、`node docs/evidence/KMM-20260913/S0/parameter-matrix.mjs`；默认比较只读。`--collect`目标已存在会拒绝覆盖；原源码哈希变化则baseline工具拒绝，S1应写自己的差异核验工具，不移除旧保护。此前采集开关未开启。

## 停点

执行者仅修改主规范并新增S0证据。统筹同期新增coordinator-baseline.md，其SHA另列并原样保留；不是执行者改动或旧冻结证据变化。所有既有源码/测试/证据/outputs保护见protection.json；没有为S0commit/push/deploy。用户本次“推送”已执行`git push origin main`，结果Everything up-to-date，没有增加远端提交；此事实与后续V2.5发布分开。

下一动作唯一：Codex统筹审核ASTRA-KMM-S0，放行KM-02/S1。待定项是候选协议/参数的关卡确认，不是已复现生产缺陷；不自行宣布升级完成。
