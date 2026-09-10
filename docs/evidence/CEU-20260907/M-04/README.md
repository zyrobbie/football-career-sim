# ASTRA-M04 市场综合验收交付（待验收）

2026-09-08用户明确授权，仅市场验收、有限连续窗口、旧档恢复及文档收口。M-01至M-03已验收，MR-03/MR-05保持关闭。本批不改生产行为、不新增字段、不进入F/Q/R；未提交、推送、部署，无代理。HEAD `3f290407a299790665b58c4bc7c2bf8455d24bbd`，SAVE_VERSION/DATA_VERSION=12/12。

## 结果与证据

| 层次 | 实际结果 | 原始证据 |
| --- | --- | --- |
| 完整确定性 | E-03完整输入3方向×100固定种子，300组/900份报价逐字段与M-02一致。国内总数CONDITIONAL103、DOMESTIC203、STRONG3；前两者逐窗保证保持；STRONG无必出频率要求 | results.json首行；ceuMarketPolicy直接资格/开放槽测试；targeted.txt |
| 三路径 | 复跑47组边界、48组受控稀缺池、9组生成连接及R1；外部≤3、续约另计总≤4、自由转会费0、救济严格改善/不足回退、排除现队/去重及年龄门槛通过 | targeted.txt；哈希匹配的M-02/boundaries.json、scarcity.json及R1/results.json |
| 原始恢复 | M-01原8份＋R1原7条，独立无backup Storage直接放入raw；load/continue，连续三次编辑、同值无写盘、回看/过期重复动作、报价全字段/顺序/选择/谈判保护，签约/到队/下一计划、保存重载通过 | restore-inputs.json；targeted.txt中的15个preserves original raw条目；M-03/store-results.json完整逐步证据 |
| 旧phase | 4市场×报告/结束phase=8；3个公开签约/到队/下一计划×2旧phase=6，合计14明确构造例恢复正确；未重新激活处理完市场 | targeted.txt；M-03/store-results.json与legacy-successors.json，来源/哈希见restore-inputs.json |
| 有限观察 | 3种子×3方向策略×6窗=54个独特观察窗口，实际15次生成市场；青年36窗、35岁起老将18窗。9分支全部回HALF_YEAR_PLAN。窗口/history各+6，cashEuro为有效实际数字；每动作保存重载完整相等 | observation-plan.json（先写后跑）；results.json、continuous-summary.json |
| 工程 | 新增10项；定向16文件207项；全量66文件520项；typecheck/build退出0。主包857.65kB，>500kB警告保留 | targeted/full/typecheck/build-command.json及对应txt |
| 实页 | 两主尺寸1280×720、390×844各一条新市场完整流程及一条稀缺到期完整流程；另430×932滚动保存/返回；补2组稀缺签约CTA，共7组，25图。主5组console error/warning均0 | pages.cjs、pages-result.json、pages-detail.cjs/json、页面原始txt |

定向/全量中的常规测试会只读复跑同一预定54窗，不增加种子或独特覆盖，不把重复执行累计为更多观察样本。3个种子与9分支仅用于流程契约，不证明最终平衡或统计显著。青年样本W4→10（15→18岁）、老将W44→50（35→38岁）。实际转会/事件路径不同，因此不是整条生涯单变量对照。

输入来源：匿名S0/HALF_YEAR_PLAN及S0-v11-supplement/PLAN_35原档先经正常loadGame迁移，仅替换careerSeed。完整迁移后input、seed前后差异和sourceSHA均保留；属于构造起点，不冒称原种子自然历史。训练采用适龄默认/低状态恢复，STEADY；事件首条合法路线及首条合法选择；市场按原节奏，无机会继续职业半年；选第一未撤回外部、否则续约、否则STAY，到队NONE。没有制造失约或绕过市场门槛。

结果格式说明：results.json连续分支中的`input`是完整起始GameState；`inputEnvelope`字段名误称，实际内容为循环结束时写盘的**最终envelope**，与`final`对应，不能当作起点。原始已生成证据不重写。起点可由input经saveGame恢复；来源与构造差异已独立记录。这是测试证据字段命名限制，不是存档产品缺陷。

## 实际页面与目视

独立origin `http://127.0.0.1:4189`，已有Playwright运行时、临时Chromium contexts，无用户profile。新市场起点直接使用上述老将构造input，经saveGame载入后全部游戏推进为真实页面点击；不是手改phase。保存DOMESTIC→刷新→训练/事件/报告/自然开市，完整输出与开市前最新player方向直接计算的生成器结果一致。已生成再改CONDITIONAL，报价不变；选报价/加薪→回看→返回→刷新→球员/履历/生涯→签约→NONE报到→下一计划。

稀缺页面直接置入R1 count=1、choice=external的原始raw，未先重编码；来源为已接受构造候选池。两尺寸均通过完整后继。球员页分列开局方向与当前方向；实际导航不改game，履历来自既存history。CareerHub摘要依当前player/合同，未把当前编辑追写draft/history。

实际查看本批8张：new-market-1280-market、new-market-390-review、new-market-390-player、sparse-390-market、scroll-430-save、scroll-430-return、sparse-1280-sign-cta、sparse-390-sign-cta（均png）。另查看并复用M-03-review/veteran-320-save-viewport-r2.png，原M-03同名图和源码身份保持。其余17张只作自动截图，不声称逐张目视通过。

结论限于相关流程可达：编辑器文字/换行及保存按钮清楚；报告保存摘要完整换行、返回可用；签约CTA滚动后可见且中心命中并真实点击；无横向溢出。桌面长匿名名换行、较多留白、旧报价小字/省略展示仍存在，未擅自改全站布局。430固定底栏在部分滚动位置覆盖内容的既有限制保留，正常滚动后保存/返回可点，不声称任意位置无遮挡。320引用旧独立证据而非本批重跑；真实手机未执行。

## 命令、保护与失败

工程原始命令、时间、exitCode由run-commands.py独占记录；默认测试无采集开关、只读。首次新增测试实际命令为`CEU_M04_EVIDENCE=1 npm run test:run -- src/store/gameStore.ceuM04.test.ts`，10项通过，原始directed-initial.txt；仅该首次命令写results.json，wx拒绝覆盖。源码哈希守卫检查所有已有非测试src。不要删除输出来重开旧证据写入。

页面命令：`npm run dev -- --port 4189 --strictPort`，首次沙箱listen EPERM见server.txt；获权后成功见server-authorized.txt。两次脚本命令分别为`node docs/evidence/CEU-20260907/M-04/pages.cjs`和`node docs/evidence/CEU-20260907/M-04/pages-detail.cjs`，获权运行退出0，原始空stdout见pages-initial.txt/pages-detail.txt，JSON提供真实动作与结果。未因主机失败修改生产或降低断言。

before-hashes.json/git-before.txt保存现场；protection-verification.json及changed-files.json记录最终前后比较；artifact-hashes.json记录本批产物。reuse-hash-audit.json核对M-01的72项、M-02的39项、R1的19项、M-03的92项，共222份产物全部匹配。对应生产源码身份另见source-identity.json。保护所有旧证据/outputs，不改冻结快照。

## 问题与停止点

没有发现本批范围内的新持久化或状态判定缺陷。限制：自然救济起点未补采；稀缺/撤回沿用明确构造补证；54窗非全生涯平衡；真实手机、Safari/Firefox、线上、旧客户端读取v12未执行。v11持久备份、发布回退仍属后续发布前决定；本批不批准发布。旧小字/430滚动限制保留给统筹/Q-04，不自行扩展。

修改仅新增M-04测试、docs/20/21/23与本目录证据。M-01至M-03结论不重开；M-04为**待验收**，是否收口M专项由Codex统筹决定。唯一下一动作：**用户转交Codex审核ASTRA-M04**。
