# ASTRA-F04-R1：待验收

仅F04-V01环境说明显示补修。生产仅src/styles/main.css既有环境规则增加white-space:normal、overflow:visible、text-overflow:clip三条；无需TSX。字号、文案、价格、角色、卡片列数、谈判与签约规则不变。F04-V01修复待统筹验证，不自行宣布F专项通过。

## 证据和实际结果

- before/result.json、after/result.json：五尺寸1280×720、1366×768、390×844、320×568、430×932，同一F-04/pages-r2/result.json expiry.actions[3].after完整中间状态，W12/H11，广州南粤已选、3外部＋续约。现有saveGame/continueCareer加载后完整相等；不是新自然采集。两个稀缺来源是M-02-R1/results.json quantity-and-successor count0/1 renewal原raw，先直接加载，不借backup。
- before五组、after七组；真实逐卡选择共30次按钮点击。1280/390外部确认→NONE→完成→计划，最终game与原F-04 expiry.final完全相等；零外部续约到计划。history/现金均无额外半年，保存刷新完整保持。没有新种子/数量构造/长期观察。
- comparison.json：五尺寸输入、文字、全部卡片字体不变；每张卡选中/未选中环境说明无裁切。1280原9px字体113px容器需116px，修改后自然两行，卡片必要增高；1366及三个移动尺寸内容保持，原小字限制没有扩大。
- screenshots.json：33图中32张实际目视；唯一仅生成是after/1366-1-action.png，其同页面cards/selected已查看。before全部10图、after五尺寸cards/action/selected及稀缺/完成页已查看。环境全文可读、标题/年薪/角色无新增截断重叠，未出现逐字竖排；手机正常滚动后完整按钮中心可点，非承诺任意滚动位置无遮挡。原生真实手机未测。
- 页面身份/非空/无框架遮罩/console无error及warning，真实click逐步game/saved相等。浏览器为新4195 origin临时Chromium；Browser plugin not available，按frontend-testing-debugging使用安装好的Playwright；未访问用户profile。
- targeted-command.json/typecheck-command.json/build-command.json及对应txt：181项定向、typecheck、build退出0。build仍859.40kB大包警告。reuse.json核验F-03 33产物含626全量日志，CSS外源码身份保持，不重复全量。

## 命令及保护

实际命令：`npm run dev -- --host 127.0.0.1 --port 4195 --strictPort`；先`R1_CAPTURE=before node docs/evidence/CEU-20260907/F-04-R1/pages.cjs`（退出0），最小修改后`R1_CAPTURE=after node docs/evidence/CEU-20260907/F-04-R1/pages.cjs`（退出0）；stdout见before-command/after-command.txt。`python3 .../checks.py`执行工程检查，原始命令/时间/退出码均保存。

pages.cjs默认只读不写；before/after目录独占，已有目录拒写。新脚本校验源码SHA，after仅允许CSS；authorized-css-diff.txt及protection.json验证该授权差异恰为三条声明、其他受保护文件不变。旧脚本/采集保护未修改。before-hashes/git-before记录整个原工作树，sources.json记录输入文件SHA；artifact-hashes为本批证据索引。

HEAD 3f290407a299790665b58c4bc7c2bf8455d24bbd，SAVE/DATA12/12。仅main.css、docs20/21及新R1证据变化；docs01/02无须修改。4195服务已Ctrl-C关闭，contexts/browser由finally关闭。未提交、推送、部署，无代理。

真实手机、其他浏览器、线上、旧客户端v12、发布备份回退未执行；保留移动既有小字和滚动限制。Q/R未开始。唯一下一动作：用户转交Codex审核ASTRA-F04-R1。
