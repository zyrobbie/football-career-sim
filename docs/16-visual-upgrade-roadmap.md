# 绿茵生涯：视觉升级实时路线图

> 本文是视觉升级工作的单一事实来源（Single Source of Truth）。<br>
> 初始设计原则见 [04-visual-direction.md](04-visual-direction.md)；已经完成的专项验收见 [14-honor-visual-system-v1-audit.md](14-honor-visual-system-v1-audit.md) 与 [15-china-club-crest-source-audit.md](15-china-club-crest-source-audit.md)。<br>
> 后续每个视觉批次开始、返工、验收、提交或发布时，都必须同步更新本文。

最后更新：2026-08-27<br>
当前仓库基线：`2a932f7`（已推送至 `origin/main`）<br>
当前进行阶段：**V7-B1 8 枚意甲原创圆形队徽视觉样板——PRODUCT_APPROVED**<br>
下一主阶段：**V7-C 按联赛继续概念研究与每批 14 枚绘制；运行时接入保留至 V7-D**

## 1. 这次视觉升级要解决什么

视觉升级不重做游戏，而是在保留“职业档案、体育编辑设计、纸张排版、移动端优先”基因的前提下，加强三层身份：

1. **赛事身份**：不同奖杯和个人奖项一眼可区分，重复荣誉能够汇总；
2. **俱乐部身份**：队徽、配色与地域图腾共同建立俱乐部辨识度；
3. **生涯阶段感**：转会后界面氛围随俱乐部变化，让每段效力经历有明确视觉记忆。

视觉升级不得改变比赛、成长、合同、转会、荣誉结算、国家队或存档规则。

## 2. 状态定义

| 状态 | 含义 |
| --- | --- |
| `NOT_STARTED` | 尚未开始，没有生产文件改动 |
| `IN_PROGRESS` | 正在制作或返工，不能作为完成成果 |
| `WAITING_VISUAL_REVIEW` | 静态稿或资产已完成，等待用户判断画风 |
| `WAITING_QA` | 视觉方向已接受，等待真实组件、响应式或导出验收 |
| `READY_TO_COMMIT` | 视觉、自动化、页面与导出验收均通过，尚未提交 |
| `SHIPPED` | 已提交并推送至正式分支；是否部署另行记录 |
| `DEFERRED` | 有意暂缓，不阻塞当前主线 |
| `BLOCKED` | 缺少可靠数据、权限或技术条件，不能伪装完成 |

“代码写完”“测试通过”“用户视觉接受”“已提交”“GitHub Pages 已更新”是五个不同事实，本文必须分别记录。

## 3. 当前总览

| 阶段 | 目标 | 当前状态 | 验收／提交证据 | 下一动作 |
| --- | --- | --- | --- | --- |
| V0 | 建档移动适配与退役 PNG 稳定导出 | `SHIPPED` | `2fcc853`；正式 PNG、二维码、长生涯与响应式验收通过 | 仅做回归维护 |
| V1 | 42 项荣誉图标、聚合与联赛限定文案 | `SHIPPED` | `e52c38b`、`4cc2907`；42 SVG；[专项验收](14-honor-visual-system-v1-audit.md) | 仅做回归维护 |
| V2 | 32 家中国虚构俱乐部原创队徽 | `SHIPPED` | 32 个本地 SVG、40 条清单记录；合法状态、正式 DOM、正式 PNG、完整命令与 Git 范围审计全部通过；`4b5acb5` 已推送；用户后续测试通过 | 仅做回归维护 |
| V3 | 俱乐部主题 Token 与切换底座 | `SHIPPED` | 功能提交 `49a716e` 与视觉补丁 `23f29a6` 均已推送至 `origin/main`；用户已完成 GitHub Pages 测试 | 仅做回归维护 |
| V4 | 14 套标准主题模板与 366 家静态归类 | `SHIPPED` | `2a932f7`；V4-A2 静态归类、V4-B1 样板、V4-B2 正式流程／转会／固定退休边界通过；用户后续 GitHub Pages 测试通过 | 仅做反馈驱动的回归维护 |
| V5 | 海外模板归类扩展 | `MERGED_INTO_V4` | 海外 334 家已随 V4 的 366 条静态映射统一接入、验收与推送 | 无独立后续阶段 |
| V6 | 全局界面统一性与细节反馈 | `NOT_STARTED` | — | 在主题系统稳定后处理导航、身份带与动效 |
| V7 | 海外 334 家原创队徽扩展 | `PRODUCT_APPROVED` | [可行性审计](18-overseas-club-crest-v1-feasibility-audit.md)、14 套队徽色板、[意甲 20 家概念清单](data/overseas-club-crest-concepts-v1.csv)与 8 枚视觉样板均获确认；尚未接入运行时 | V7-C 按联赛继续研究并每批绘制 14 枚 |
| V8 | 视觉版本发布验收 | `NOT_STARTED` | — | 真实设备、完整生涯、转会切换、退役导出与线上回归 |

## 4. 已锁定的产品决定

### 4.1 荣誉视觉

- 现实赛事冠军奖杯应根据正面参考图重绘，保留最关键轮廓，不能只做松散抽象。
- 金球奖采用可识别的金球奖杯表达。
- 金靴、赛季最佳阵容、联赛最佳球员允许原创。
- 履历和退役档案按 `scope + type + competitionLabel` 聚合，例如“意甲冠军 ×10”。
- 联赛个人荣誉必须带赛事名称，例如“意甲最佳阵容”“中甲金靴”，不能只显示同一段通用文字。
- 42 项现有荣誉资产已经锁定，后续不得无任务重绘。

### 4.2 中国原创队徽

- 32 家中国俱乐部使用原创 SVG；现实俱乐部只作为配色与气质参考。
- 配色统一使用 `REFERENCE_APPROXIMATION`，不声称是现实俱乐部官方色、继承关系或授权资产。
- 圆形、盾形、椭圆形等传统足球徽章外形允许重复；队徽必须仍然看起来像足球俱乐部徽章。
- 差异化集中在内部 `primaryMotif`、构图、负形和地域元素，不再要求外轮廓、首层 path 或黑色剪影强行唯一。
- 不直接复制现实队徽的字标、官方盾形、吉祥物或注册图形。
- 当前 32 枚资产在最终页面验收前不得继续随意返工。

### 4.3 俱乐部动态主题

- 主题改变的是俱乐部身份层，不推翻纸张档案式基础设计。
- 不能只替换深色背景：浅色区域的标题、边框、选中态、导航 active、焦点环也必须使用同一主题体系。
- 国际米兰样板应形成蓝黑深色外壳，并使用白色或金黄色高对比文字；不能残留默认绿色标题。
- 北京国安参考样板应形成绿色外壳、黄色强调与黑／深绿文字组合。
- 竞技状态、危险、成功、禁用等语义色不随俱乐部任意变化。
- 主题由当前俱乐部只读派生，不进入 `GameState`、存档或存档版本。
- 无俱乐部、建档、球员揭晓和异常数据使用默认“绿茵生涯”主题。
- 退役 PNG 第一批继续使用稳定的档案主题，不随最后一家俱乐部染色；待主题系统稳定后再单独评估。

### 4.4 发布与线上验收渠道

- 唯一代码远端为 GitHub 仓库 `zyrobbie/football-career-sim` 的 `origin/main`；
- 唯一公开试玩与线上验收地址为 [GitHub Pages](https://zyrobbie.github.io/football-career-sim/)；
- 后续发布报告只区分“已推送 GitHub”与“GitHub Pages 已完成线上／实机验证”；
- 不再等待、检查、部署或汇报 Netlify，也不将 Netlify 状态作为任何阶段的完成条件。

### 4.5 标准主题模板，而非一队一色板

- 366 家俱乐部不再分别维护 366 套完整 Token；统一使用少量、经过响应式与可访问性验证的标准主题模板。
- 同一视觉家族允许完全复用同一模板，例如国际米兰、亚特兰大、布鲁日使用蓝黑模板；尤文图斯、乌迪内斯、阿斯科利、纽卡斯尔使用黑白模板；拉齐奥、曼城、那不勒斯使用天蓝模板。
- 首版目标为 **12 套标准模板 + 1 套无俱乐部默认主题**：蓝黑、黑白、天蓝、皇家蓝、红黑、红白、蓝红、绿黄、黄黑、酒红蓝、橙色、紫／粉。只有只读归类审计证明存在无法合理容纳的大类时，才允许增加模板；上限暂定 14 套。
- 模板名称代表视觉家族，不要求俱乐部现实色值的细微差异；同模板俱乐部的 Token 必须完全相同，不增加球队级颜色 override。
- “蓝黑”不等于在深蓝底强制使用不可读的黑字。深色承载面继续使用白／浅金高对比文字，黑色可用于纹理、深层背景或浅纸张标题；所有模板仍须通过既有 WCAG AA 检查。
- 黑白模板允许浅色 shell，但必须作为正式模板完整校准导航、分隔线、active、focus ring 与按钮，不能只把背景改白。
- 当前四套已确认样板转为模板锚点，并尽量保持现有视觉不变：国际米兰 → 蓝黑，北京御华 → 绿黄，上海东港 → 蓝红，AC 米兰 → 红黑。
- 运行时不得按名称、国家、联赛或随机数猜主题。每家俱乐部必须通过 canonical ID 显式归入一个模板；workbook ID 继续先经兼容查询层解析。
- 主题归类仍是只读展示数据，不进入 `GameState`、存档、localStorage 或存档版本；转会后只随 `selectedClubId` 同步切换。

## 5. 分阶段执行计划

### V2：中国 32 家原创队徽 V1 收口

状态：`SHIPPED`

已经完成：

- 32 个本地原创 SVG；
- 32 家 canonical ID 与 workbook 兼容 ID 接入；
- `CLUB_CREST_MANIFEST` 共 40 条，其中 32 条为本地原创资产，8 条为不可渲染的现实参考记录；
- 32／56／128px 栅格化、安全检查、定向测试、全量测试、typecheck、build 与数据校验。

仍需完成：

- 390×844 与 1280×720 的正式 `CareerHistoryScreen`、`RetirementScreen` 验收；
- 32 枚 DOM 图片全部加载且 fallback 为 0；
- 32 家超长履历的正式退役 PNG；
- Sharp RGBA、二维码、1,200 万像素预算、末项和页脚不裁切；
- 用户最终视觉确认；
- 精确提交并推送，排除既有 `outputs/019facd8-3fee-7b80-bfcd-2d1d35e522ba/`。

完成定义：上述验收已经全部通过，功能提交 `4b5acb5` 已推送至 `origin/main`，当前为 `SHIPPED`。

第一次正式页面验收尝试于 2026-08-25 停止：隔离 origin `4207` 能启动正式应用，但仓库没有可直接复用的 32 家合法退休状态入口。执行者没有伪造 DOM 或 PNG 结论，且已关闭标签页和服务、清除临时代码。当前缺口是**验收基础设施**，不是已发现的队徽资产故障。

后续验收拆成两个独立小批次，避免再次把状态构造、双尺寸 DOM、正式按钮导出、Sharp 与二维码检查塞进一次执行：

1. **V2-QA-A：合法退休夹具与正式 DOM**
   - **QA-A1 已完成**：新增 `src/testing/createRetirementVisualAuditGame.ts` 及测试；工厂构造 1–32 家 `CAREER_RETIRED` 状态，32 家时窗口为 24–55，并在返回前调用 `validateGameState()`；
   - **QA-A2 已完成**：移除非空类型断言并补齐空数组、重复、未知、超过 32 家、单家边界、workbook ID、窗口唯一、32 家汇总、输入不变与确定性测试；
   - **QA-A3 已完成**：将已验证状态注入隔离内存 store，正式挂载 `CareerHistoryScreen` 与 `RetirementScreen`；
   - 390×844、1280×720 的履历与退役页均无横向溢出；四组页面均为 32 个 asset、0 fallback、32 个完整加载图片，控制台无 error/warn；
   - 32 家逐项中文名、资源路径和 `150×150` 原始尺寸一致；临时入口、4217 服务与浏览器标签均已清理；
   - QA-A 已通过，可以进入 QA-B。
2. **V2-QA-B：正式退役 PNG**
   - **QA-B1 已完成**：复用同一合法状态，实际走正式保存按钮、`RetirementRecordExportActions`、`renderRetirementRecordPng()` 与预览 Blob；
   - 正式 PNG 为 `1793×6633`、990,191 bytes、11,892,969 像素，Sharp 完整 RGBA 解码成功，jsQR 严格得到正式网址；
   - 32 枚多色队徽、首末俱乐部、二维码、边框、文案与页脚完整；二维码后约 28.9 CSS px 收尾，无大块白边或深绿边；
   - 390×844 与 1280×720 正式预览均无页面级横向溢出或控制台问题；关闭后再次生成成功；
   - 临时入口、4217／4218 服务、桥接器与验证脚本均已清理；
   - **QA-B2 已完成**：完整工程验收链和 Git 范围审计通过；44 个测试文件、325 项测试通过，typecheck、build、俱乐部生成检查、二维码验证、依赖安全与 diff check 均通过；
   - 最终候选范围为 32 个 SVG、清单、两项既有队徽测试、可复用状态工厂及其测试、README、第 15 号审计与本文，共 40 项；
   - `outputs/019facd8-3fee-7b80-bfcd-2d1d35e522ba/` 明确排除且未触碰；
   - V2 已以 `4b5acb5` 提交并推送至 `origin/main`，`outputs/` 未进入提交。

### V3：主题系统前置审计与 4 个样板

状态：`SHIPPED`（功能提交 `49a716e` 已推送至 `origin/main`；等待用户线上测试）

V3-A 已锁定结论：

- 当前俱乐部唯一事实源为 `game.selectedClubId`，须经兼容查询层解析；不得使用 `lastReport`；
- 主题 Provider 位于 `App` 顶层，动态 CSS 变量只挂到 `.app-frame`，避免污染首页、建档与退休档案；
- `CAREER_RETIRED` 和退役 PNG 继续使用固定档案绿金主题；
- 俱乐部身份色与成功、危险、警告、禁用、荣誉等固定语义色必须分离；
- 国际米兰、北京御华、上海东港、AC 米兰四套样板的关键文字组合均已完成 WCAG AA 对比度校准；
- `--gold-dark`、`--gold-soft`、`--ink-soft`、`--negative` 存在引用但未定义，B1 必须用明确 Token 收口，不能继续叠加无定义变量。

已完成的只读审计范围：

1. 找出当前 CSS 中所有硬编码的绿色、金色、纸张色与 active 状态；
2. 确认主题挂载边界，应优先位于 `AppShell` 或其上层展示容器；
3. 确认转会完成后使用哪个当前俱乐部字段，避免旧报告污染主题；
4. 设计独立于存档的 `ClubVisualTheme` 只读结构；
5. 选择四种有代表性的样板：
   - 国际米兰：蓝黑＋金／白；
   - 北京御华：绿黄；
   - 上海东港：蓝红双色；
   - 一支浅色或红黑俱乐部，用于验证反差边界。

V3-B1 实际完成：

- 新增只读 `ClubVisualTheme` 注册表与同步解析器；只读取 `game.selectedClubId`，先通过运行时兼容查询解析为 canonical ID；未注册、未知、无俱乐部与 `CAREER_RETIRED` 均回退默认主题；
- App 顶层 Provider 同步派生主题，只有 `AppShell` 的 `.app-frame` 获得 `data-club-theme` 和 `--club-*` 变量；不写入 `GameState`、store、localStorage 或文档根节点；
- 国际米兰、北京御华、上海东港、AC 米兰四个样板已接入；上海保持深蓝正文承载面、红色第二强调和低透明度双色纹理，不混成紫色；
- `.app-frame` 内的侧栏、顶栏、移动底栏、导航 active、主按钮、浅底标题、表格边线、状态条、队徽短标衬底及焦点环使用主题 Token；成功、危险、警告、禁用、删除、错误 toast、纸张和荣誉徽章仍是固定语义；
- 已完成纯函数、CSS 边界、兼容 ID、AA 对比度测试，以及 390×844 / 1280×720 隔离浏览器样板烟雾检查。该检查不等同于 B2 的青年队、合同、转会、报告、四项导航和退役导出完整流程验收；
- 审核图：`/tmp/club-theme-v3-b1-review.png`。真实 iPhone Safari 与 Android Chrome 仍待后续发布验收。
- 2026-08-26 用户确认四个样板视觉方向通过；不再返工 B1 色板，正式进入 B2。

V3-B2 实际完成：

- 使用隔离 origin 的合法状态夹具挂载正式 `App`、`AppShell` 与流程页面；18 个要求 phase 在 390×844、1280×720 共 36 次检查均命中预期主题或固定边界，`clientWidth === scrollWidth`；
- 正式导航按钮验证北京御华、国际米兰、上海东港、AC 米兰的生涯／球员／履历／设置往返，`data-club-theme` 不变，`aria-current` 与 3px focus-visible 轮廓正确，流程状态指纹完全一致；
- 上海东港 → AC 米兰使用正式报价卡、接受、融入与继续职业半年动作；属性观察序列精确为 `CN_SHANGHAI_DONGGANG → ITA_AC_MILAN`，无 `DEFAULT` 或旧主题延迟；
- 发现并修复职业合同页在桌面侧栏下的真实 CSS 收缩遗漏：`.contract-actions` 的两列改为 `minmax(0, …)`，1280px 从 `scrollWidth 1404` 恢复为 `1280`，不改变色板或页面结构；
- `CAREER_RETIRED` 无 `.app-frame`，固定绿金档案未受 AC 米兰主题污染。正式“保存我的生涯记录”预览在两种视口均为单张图片、可关闭并再次生成；最终正式 Blob `/tmp/club-theme-v3-b2-retirement-audit.png` 为 2360×2850、6,726,000 像素、579,911 bytes，Sharp RGBA 解码 26,904,000 bytes，jsQR 为 `https://zyrobbie.github.io/football-career-sim/`；二维码、页脚和约 28px 收尾完整，无大块白边或深绿边；
- 浏览器实际支持 `color-mix()` 与 `--club-*` 自定义属性；上海东港双色 pattern 已计算；仅过渡 color、background-color、border-color，无 `transition: all`。成功、危险、禁用和荣誉仍为固定语义。真实 iPhone Safari、Android Chrome 仍是发布前实机风险。
- 审核图：`/tmp/club-theme-v3-b2-flow-review.png`、`/tmp/club-theme-v3-b2-transfer-review.png`、`/tmp/club-theme-v3-b2-retirement-review.png`。

V3.0.1 线上视觉补丁实际完成：

- 根因一：策略卡 10px 效果说明沿用金色装饰 token；在北京御华等浅纸张主题中不适合作为正文信息。`.app-frame .path-choice button em` 现只使用既有高对比 `--club-paper-ink`，不修改任何主题色板，也不影响金色标题、图标和边框；默认、国际米兰、北京御华、上海东港、AC 米兰的实测最低对比度均高于 4.5:1。
- 根因二：移动端 `.season-honors-report` 将赛季表现和荣誉卡排在同一行，荣誉的固有宽度会压缩三项赛季表现。小于等于 760px 时改为两列、两行：赛季名称与三项表现位于第一行，荣誉区跨整行并使用两列可收缩网格；无荣誉与单项荣誉跨整行，两项等宽，三项自动换行。
- 隔离浏览器正式组件验收覆盖北京御华 `TrainingPlanScreen`、国际米兰 `HalfYearReportScreen`：320×568、390×844、1280×720 均无横向溢出；0／1／2／3 项荣誉矩阵保持首行表现完整、名称不省略、底部导航不遮挡，控制台无新增 error/warn。审核图：`/tmp/v3-0-1-visual-fixes-390.png`、`/tmp/v3-0-1-visual-fixes-1280.png`。
- 本补丁已以 `23f29a6` 推送至 `origin/main`，状态为 `SHIPPED`；真实 iPhone Safari 与 Android Chrome 仍需在发布前实机复核。

建议的最小 Token：

| Token | 用途 |
| --- | --- |
| `shell` | 顶栏、侧栏、移动底栏主背景 |
| `shellDeep` | 深色层级与按压态 |
| `shellText` | 深色区域正文与图标 |
| `accent` | 选中、主按钮边线、关键强调 |
| `accentText` | accent 上的文字 |
| `paperInk` | 浅底标题与关键数字，不允许残留默认绿 |
| `paperMuted` | 浅底次级区域的轻微主题染色 |
| `lineTint` | 分隔线和表格边界 |
| `focusRing` | 键盘焦点与可访问性高亮 |
| `crestBackdrop` | 队徽周围的稳定衬底 |

样板验收必须包含：

- WCAG 对比度检查；
- 390×844 与 1280×720；
- 生涯、球员、履历、设置四页；
- 青年队、一线队、合同、转会、报告等主要 phase；
- 转会前后主题即时切换，切回查看页不改变流程状态；
- `prefers-reduced-motion` 下无颜色闪烁；
- 不修改 `GameState` 或 localStorage。

### V4：标准主题模板与 366 家静态归类

状态：`SHIPPED`（提交 `2a932f7` 已推送；GitHub Pages 用户测试通过）

本阶段不再制作 32 套独立色板，拆成四个可单独停止与审核的小批次：

1. **V4-A：只读归类审计**
   - **V4-A1 已完成**：冻结 12 套候选模板；确认运行时目录没有颜色字段；生成 366 行显式归类表。32 家已有原创队徽审计色板的中国俱乐部已归类，334 家海外俱乐部暂为 `UNASSIGNED / NEEDS_REVIEW`；本批没有把缺少目录字段误报为完成覆盖；
   - **V4-A2 已完成**：依据用户明确授权，已对 334 家海外俱乐部完成逐条产品近似静态归类；显而易见的球队标为 `PRODUCT_APPROXIMATION`，不要求逐家证明官方色值。弗鲁米嫩塞固定为 `CLARET_BLUE`，聚尔特瓦勒海姆固定为 `RED_WHITE`；`NEEDS_REVIEW` 已清零；
   - 生成 366 家俱乐部的显式归类草案，字段至少包含 canonical ID、workbook ID、中文名、联赛、模板 key、归类理由与审核状态；
   - “允许产品近似静态归类”不等于允许运行时猜色：生产映射最终仍必须逐条保存 canonical ID → template key；
   - 黄色＋蓝色与红色＋金色已在 V4-A2 形成第 13、14 套模板；已达到 14 套上限，后续不能再新增模板而应提交产品复核；
   - V4-A 只产出审计表和统计，不改生产主题代码。
2. **V4-B：模板引擎与 14 套样板**
   - 将现有“canonical ID → 完整主题对象”重构为“模板注册表 + canonical ID → 模板 key 映射”；
   - 既有四个样板成为蓝黑、绿黄、蓝红、红黑模板锚点，重构前后视觉 Token 保持一致；
   - 新增其余模板的同屏审核图，并覆盖深色 shell、浅色 shell、双色与高饱和边界；
   - 每套模板独立通过完整 Token、WCAG AA、390×844、1280×720 与 focus-visible 检查。
   - **V4-B1 已完成并获视觉确认**：生产运行时已使用 14 套共享只读 Token 与 366 条 canonical ID 显式映射；workbook 兼容 ID 先解析为 canonical ID；无俱乐部、未知 ID 与退休边界保持 `DEFAULT`。14 套隔离正式 `AppShell` 样板在 390×844、1280×720 无横向溢出、控制台无 error/warn。
   - **V4-B2 已完成**：14 套模板分别覆盖 `HALF_YEAR_PLAN`、`HALF_YEAR_REPORT`、`TRANSFER_WINDOW`、球员、履历与设置页，并在 390×844、1280×720 均无横向溢出；全部现有可导航职业 phase 已以 `BLUE_BLACK` 与 `BLACK_WHITE` 合法状态覆盖。八条异色正式转会链与国际米兰→亚特兰大同模板链均只出现源主题→目标主题，不经过 `DEFAULT`。退休决定仍跟随当前俱乐部，确认退休后移除 `.app-frame`，退役档案与正式 PNG 固定绿金；正式 PNG 为 2360×2486、5,866,960 像素、447,298 bytes，Sharp RGBA 与 jsQR 均通过。真实 iPhone Safari 与 Android Chrome 仍须在 GitHub Pages 推送后实机复核。
3. **V4-C：中国 32 家显式归类**
   - **已完成**：依据已审核队徽配色把 32 家中国俱乐部分配到标准模板，没有球队级 override；
   - canonical ID 与 workbook ID 得到同一模板，32 家 production fallback 为 0；
   - 队徽衬底、长中文名、浅色／深色导航与移动底栏已纳入正式页面验收。
4. **V4-D：中国转会链与回归**
   - **已完成**：异色与同模板正式转会链均无旧主题残留或 `DEFAULT` 闪烁；
   - 四项导航往返不改变 GameState；
   - 退役档案与 PNG 保持固定绿金边界。

建议首版标准模板：

| 模板 key | 视觉家族 | 典型归类 |
| --- | --- | --- |
| `BLUE_BLACK` | 深蓝外壳、黑色深层、白／浅金文字 | 国际米兰、亚特兰大、布鲁日 |
| `BLACK_WHITE` | 浅灰白外壳、黑色正文与强调 | 尤文图斯、乌迪内斯、阿斯科利、纽卡斯尔 |
| `SKY_BLUE` | 天蓝、深蓝、白 | 拉齐奥、曼城、那不勒斯 |
| `ROYAL_BLUE` | 皇家蓝、深海军蓝、白 | 切尔西、埃弗顿、沙尔克等 |
| `RED_BLACK` | 黑色外壳、红色强调、白字 | AC 米兰及同类红黑俱乐部 |
| `RED_WHITE` | 红色外壳、白色主文字、深红层级 | 阿森纳、拜仁、马竞、本菲卡等 |
| `BLUE_RED` | 稳定深蓝承载面、蓝红双强调 | 上海东港及同类蓝红俱乐部 |
| `GREEN_YELLOW` | 绿色外壳、黄／白强调 | 北京御华及同类绿色俱乐部 |
| `YELLOW_BLACK` | 黑色或深炭外壳、黄色强调 | 多特蒙德及同类黄黑俱乐部 |
| `CLARET_BLUE` | 酒红、天蓝、米白 | 阿斯顿维拉、西汉姆、伯恩利等 |
| `ORANGE` | 橙色、深蓝／黑、白 | 橙色主视觉俱乐部及山东泰岳等近似家族 |
| `PURPLE_PINK` | 紫／粉、深紫／海军蓝、白 | 佛罗伦萨、巴勒莫及同类俱乐部 |

模板名单在 V4-A 用户审核后冻结；如果某一颜色家族覆盖明显不足，只能在 14 套上限内补充，不允许退回“一队一套”。

### V5：海外 334 家模板归类

状态：`MERGED_INTO_V4`

- 海外 334 家已在 V4-A2 完成产品近似静态归类，并随 V4-B 统一接入生产映射；
- 366 家运行时俱乐部全部且唯一命中一个非 `DEFAULT` 模板，canonical ID 与 workbook ID 结果一致；
- 海外俱乐部不需要原创队徽，也没有新增 334 套独立 CSS 或球队级颜色 override；
- 跨模板、同模板转会和旧主题泄漏检查已在 V4-B2 完成，因此不再保留独立 V5 开发阶段。

### V6：全局视觉统一与反馈

状态：`NOT_STARTED`

主题稳定后再做，避免反复返工：

- 顶栏加入更明确的俱乐部身份带与队徽；
- 四项导航 active、按钮、选项边框和表格标题统一使用主题 Token；
- 转会完成时加入一次克制的主题过渡，建议 180–240ms；
- 荣誉获得时使用现有奖杯图标做轻量揭示，不增加粒子雨或长动画；
- 长名称、长荣誉和长履历继续保持移动端不横向溢出；
- 保持纸张层次、宋体数字与体育档案秩序，不改造成高饱和电竞 UI。

### V7：海外原创队徽扩展

状态：`PRODUCT_APPROVED`（V7-A1 概念与 V7-B1 的 8 枚视觉样板均获用户确认；尚未接入运行时）

- 用户已重启本阶段，并锁定简化方向：海外队徽统一圆形；颜色复用已上线的 14 套主题归类；圆内图腾优先采用俱乐部长期身份符号，其次采用城市建筑、地理或文化符号；
- “吉祥物优先”在执行口径中统一为“俱乐部长期身份符号优先”，避免把历史昵称、神话符号或城市象征误报为正式吉祥物；
- 当前技术链路可复用：`ClubCrest` 已有懒加载和失败回退，退休 PNG 已能栅格化队徽图片；334 枚新增资产不需要重写展示或导出系统；
- 统一圆形只解决外框一致性，差异化必须由主图腾姿态、正负形、构图和克制的城市辅助线索承担；同为鹰／狼／狮子时禁止只换颜色；
- 配色不再逐队取精确官方色值，但应先把 14 套 UI 主题冻结成 14 套 `crestPrimary / crestSecondary / crestNeutral / crestOutline` 队徽色板，不能机械把所有 UI Token 直接塞入 SVG；
- 每家绘制前必须有 canonical ID、workbook ID、主题模板、来源类型、主图腾、辅助图腾、构图 key、来源链接、理由与审核状态；
- 不使用真实 Logo 文件，不复制现实队徽的字标、成立年份、官方盾形、官方吉祥物角色造型或完整构图；
- **V7-A1 已完成并获产品审核**：意甲 20 家概念清单以显式 canonical／workbook ID、主题模板、来源类型、图腾、构图 key 与链接记录；20 家唯一覆盖，`NEEDS_REVIEW` 为 0，尚未绘制海外 SVG。亚特兰大明确不用现行的五分头部线条，罗马明确不用母狼哺育双子，科莫改用市政府来源；固定的 8 枚样板为国际米兰、AC米兰、拉齐奥、罗马、亚特兰大、科莫、博洛尼亚、威尼斯；
- **V7-B1 已完成并获用户确认**：8 枚意甲样板统一为透明安全区、异色外环、内部 field、高对比主图腾与可选小面积强调色；外环／field 低对比时仅使用细浅色 separator。最终 AC米兰采用正面双角獠牙魔鬼脸，罗马采用金色右向咆哮狼头，威尼斯采用横向贡多拉；仍未修改 `clubCrests.ts`、运行时 manifest、正式页面或导出链路；
- 样板通过后，按联赛完成概念研究、每批 14 枚绘制并逐批审核；334 枚共 24 个视觉批次；
- 完整设计、工程结构、验收门槛与停止条件见 [第 18 号审计](18-overseas-club-crest-v1-feasibility-audit.md)。

### V8：视觉版本发布验收

状态：`NOT_STARTED`

最终至少覆盖：

- 320×568、360×800、390×844、430×932、1280×720；
- 真实 iPhone Safari 与 Android Chrome；
- 建档五步、青训、合同、转会、报告、四项导航、退役档案；
- 连续转会后的主题切换；
- 退役 PNG 普通、长生涯、超长三档；
- 控制台、横向溢出、对比度、键盘焦点、减少动态效果；
- 全量测试、typecheck、build、数据生成检查、二维码验证、依赖安全与 Git 范围审计。

## 6. 当前不做

- 不恢复已停止的赛季目标系统；
- 不修改比赛、成长、合同、转会或荣誉概率；
- 不把主题写入存档；
- 不把 334 枚海外原创队徽作为主题系统前置条件；
- 不让退役 PNG 立即跟随最后俱乐部主题；
- 不使用现实俱乐部 Logo、赛事 Logo、球衣或赞助商资产；
- 不以响应式桌面浏览器冒充真实 iPhone／Android 实机验收。

## 7. 每次更新本文的固定流程

每个视觉任务都必须同步完成以下记录：

1. 更新顶部“最后更新、当前基线、当前进行阶段、下一主阶段”；
2. 更新“当前总览”中对应阶段状态；
3. 在阶段章节写清实际完成、未完成、验证与风险；
4. 若用户改变设计口径，更新“已锁定的产品决定”，不能只留在聊天记录；
5. 在下方更新日志追加一条，不删除旧记录；
6. 提交后记录 Git commit；GitHub Pages 更新后另记线上地址与实机结果；
7. 若失败或阻塞，使用 `BLOCKED`，不得把局部测试包装成完成。

建议每次交付报告固定分成：

- 实际修改；
- 视觉结论；
- 自动化验证；
- 浏览器／导出验证；
- 未验证风险；
- Git 状态；
- 路线图更新内容。

## 8. 更新日志

| 日期 | 阶段 | 变化 | 状态变化 | 证据 |
| --- | --- | --- | --- | --- |
| 2026-08-27 | V7-B1 最终视觉确认 | 用户否决 AC米兰与罗马的多轮低辨识构图后，最终锁定正面双角獠牙魔鬼脸与金色右向咆哮狼头；其余六枚保持不变。8 枚样板整体获确认，仍不接入运行时 | `WAITING_VISUAL_REVIEW → PRODUCT_APPROVED` | `public/assets/clubs/crests/ita-*.svg`、用户视觉确认 |
| 2026-08-26 | V7-B1-R1 圆形队徽对比度与异色外环返修 | 为未来海外圆形队徽冻结“透明安全区→异色 ring→field→高对比 motif→小面积 accent”规则；8 枚意甲样板完成对比度与外环返修，罗马改为原创狼头、威尼斯改为横向贡多拉，未接入运行时 | `WAITING_VISUAL_REVIEW → WAITING_VISUAL_REVIEW` | [第18号审计](18-overseas-club-crest-v1-feasibility-audit.md)、概念 CSV、`/tmp/overseas-club-crests-v7-b1-round2-review.png` |
| 2026-08-26 | V7-B1 意甲圆形队徽样板 | 新增 14 套固定队徽色板与 8 枚候选 SVG；确认同色模板下蛇／女神、鹰／湖山等图腾构图不同。未接入 runtime、页面或退役导出 | `PRODUCT_APPROVED → WAITING_VISUAL_REVIEW` | `docs/data/club-crest-palettes-v1.csv`、`public/assets/clubs/crests/ita-*.svg`、`/tmp/overseas-club-crests-v7-b1-review.png` |
| 2026-08-26 | V7-A1 意甲概念清单 | 以当前运行时目录完成 20 家意甲唯一覆盖；产品审核后修订亚特兰大、罗马、科莫、那不勒斯的原创边界与来源表达，固定 8 枚样板。只新增审计 CSV，未绘制或接入海外 SVG | `IN_PROGRESS → PRODUCT_APPROVED` | `docs/data/overseas-club-crest-concepts-v1.csv`、[第18号审计](18-overseas-club-crest-v1-feasibility-audit.md)、数据生成检查 |
| 2026-08-26 | V7-A 海外原创队徽可行性审计 | 用户重启海外 334 枚资产项目；锁定统一圆形、复用 14 套主题配色、俱乐部长期身份符号优先／城市文化补位的方向。确认展示与退休导出链路可复用，并建立先意甲概念清单、再 8 枚样板、后续每批 14 枚的执行门槛 | `DEFERRED → IN_PROGRESS` | `docs/18-overseas-club-crest-v1-feasibility-audit.md`；现有队徽清单、主题映射与导出链路只读审计 |
| 2026-08-26 | V4 发布与用户线上验收 | 14 套标准模板与 366 家显式映射以 `2a932f7` 推送至 `origin/main`；用户随后在 GitHub Pages 实际测试并确认无问题 | `READY_TO_COMMIT → SHIPPED` | `2a932f7`；用户线上测试反馈 |
| 2026-08-26 | V4-B2 正式流程、转会切换与退休边界 | 14 套模板完成正式职业页面、8 条异色与 1 条同模板转会链、导航不变性、固定退休档案及正式 PNG 验收；退休 PNG 2360×2486、5,866,960 像素、447,298 bytes，Sharp RGBA/jsQR 通过 | `WAITING_QA → READY_TO_COMMIT` | `/tmp/club-theme-presets-v4-b2-flow-review.png`、`/tmp/club-theme-presets-v4-b2-transfer-review.png`、`/tmp/club-theme-presets-v4-b2-retirement-review.png`、`/tmp/club-theme-presets-v4-b2-retirement-audit.png`；完整工程链 |
| 2026-08-26 | V4-B1 标准主题模板与 14 套样板 | 将 366 条静态归类固化为 canonical ID → preset key 的运行时映射；14 套共享只读 Token 保留四个 V3 锚点不变，兼容 ID、对比度、静态分布与隔离正式 AppShell 样板通过 | `IN_PROGRESS → WAITING_VISUAL_REVIEW` | `/tmp/club-theme-presets-v4-b1-390.png`、`/tmp/club-theme-presets-v4-b1-1280.png`、主题定向测试与完整工程命令链 |
| 2026-08-26 | V4-A2 海外近似归类 | 在不做运行时猜色、不主张官方色值的前提下，完成 366 条 canonical ID 静态映射；新增 `YELLOW_BLUE`、`RED_GOLD` 两套模板，总数 14。海外 334 家均为产品近似归类 | `IN_PROGRESS → COMPLETE` | `docs/17-club-theme-preset-audit.md`、366行CSV、数据生成检查 |
| 2026-08-26 | V4-A1 归类边界审计 | 确认366家目录无颜色字段；冻结12套模板并生成366行CSV；32家中国俱乐部完成归类，334家海外俱乐部保守标记待审。后续改由产品近似静态归类，不要求逐家官方色值证明 | `NOT_STARTED → IN_PROGRESS` | `docs/17-club-theme-preset-audit.md`、366行CSV、数据生成检查 |
| 2026-08-26 | V4 产品规划 | 放弃 366 套球队级色板，改为 12 套标准模板加 366 条 canonical ID 显式归类；四个已确认主题转为模板锚点，不写入存档 | 规划锁定，开发仍为 `NOT_STARTED` | 用户产品决定；现有主题注册表与俱乐部目录审计 |
| 2026-08-26 | 发布渠道治理 | 用户确认后续只使用 GitHub 仓库与 GitHub Pages 试玩地址，不再考虑 Netlify | 长期口径锁定 | README 公开地址与用户决定 |
| 2026-08-26 | V3.0.1 补丁发布 | 对比度与移动荣誉布局补丁精确提交并推送，既有 `outputs/` 未纳入 | `READY_TO_COMMIT → SHIPPED` | `23f29a6` |
| 2026-08-26 | V3.0.1 视觉补丁 | 策略效果说明改用高对比 paper ink；移动赛季荣誉改为首行表现、次行两列荣誉，0／1／2／3 项矩阵及三种视口通过 | `等待修复 → READY_TO_COMMIT` | `/tmp/v3-0-1-visual-fixes-390.png`、`/tmp/v3-0-1-visual-fixes-1280.png`；47 文件／339 测试 |
| 2026-08-26 | V3.0.1 线上视觉反馈 | 北京御华主题下策略效果说明为米黄底金字、对比不足；移动端同赛季获得两个荣誉时，荣誉卡的固有宽度挤压赛季表现栏 | `SHIPPED` 后补丁待修复 | 用户线上截图；定位至 `.path-choice button em` 与移动端 `.season-honors-report` 网格 |
| 2026-08-26 | V3 发布 | Theme Token、四个主题样板、正式流程与转会切换修复完成精确提交并推送；既有 `outputs/` 保持未跟踪且未纳入 | `READY_TO_COMMIT → SHIPPED` | `49a716e` |
| 2026-08-26 | V3-B2 正式流程与退休验收 | 18 个 phase × 两种视口、四项导航、上海东港→AC 米兰正式转会、固定退休档案与正式 PNG 均通过；修复职业合同页桌面网格收缩遗漏 | `WAITING_QA → READY_TO_COMMIT` | 三张 `/tmp/club-theme-v3-b2-*.png` 审核图；正式 PNG Sharp/jsQR；完整工程命令链 |
| 2026-08-26 | V3-B1 用户视觉审核 | 用户确认国际米兰、北京御华、上海东港、AC 米兰四套样板通过，同意进入 B2 | `WAITING_VISUAL_REVIEW → WAITING_QA` | 用户审核反馈；`/tmp/club-theme-v3-b1-review.png` |
| 2026-08-26 | V3-B1 主题样板 | 新增只读主题注册表、同步 Provider 与 AppShell scoped CSS Token；国际米兰、北京御华、上海东港、AC 米兰样板在隔离浏览器完成 390×844 与 1280×720 烟雾检查 | `IN_PROGRESS → WAITING_VISUAL_REVIEW` | `/tmp/club-theme-v3-b1-review.png`；主题定向与完整工程命令均通过 |
| 2026-08-26 | V3-A 主题前置审计 | 确认 `selectedClubId` 为唯一事实源、Provider 位于 App、变量限定在 AppShell；完成颜色清单、四样板 AA 色板、退休隔离与实施/验收矩阵 | `NOT_STARTED → IN_PROGRESS` | Terra 只读审计报告；仓库零改动 |
| 2026-08-25 | V2 用户验收 | 用户在推送后完成实际测试并确认通过；未报告新增队徽、布局或导出问题 | 保持 `SHIPPED` | 用户验收反馈 |
| 2026-08-25 | V2 发布 | 40 项中国队徽、清单、测试基础设施与文档完成精确提交并推送；既有 `outputs/` 保持未跟踪且未纳入 | `READY_TO_COMMIT → SHIPPED` | `4b5acb5` |
| 2026-08-25 | V2-QA-B2 | 32 SVG／40 条清单、兼容 ID、静态安全、完整测试、typecheck、build、数据、二维码、依赖与 Git 范围审计全部通过；候选提交排除 `outputs/` | `WAITING_QA → READY_TO_COMMIT` | 44 文件／325 测试；0 vulnerabilities；执行报告 |
| 2026-08-25 | V2-QA-B1 | 正式按钮链路生成 32 家退役 PNG；Sharp RGBA、jsQR、像素预算、首末项与约 28.9px 收尾全部通过；临时环境已清理 | 进入 QA-B2 | `/tmp/china-club-crests-v1-retirement-audit.png` |
| 2026-08-25 | V2-QA-A3 | 正式履历／退役页在 390×844 与 1280×720 完成 32 家 DOM 验收；asset 32、fallback 0、加载 32、无溢出及控制台问题 | QA-A 通过，进入 QA-B | `/tmp/china-club-crests-*.png` 与逐项执行报告 |
| 2026-08-25 | V2-QA-A2 | 状态工厂移除非空类型断言，展开为可维护格式，并补齐长度、兼容 ID、窗口、汇总、不变性与确定性边界测试；正式浏览器入口仍未建立 | 保持 `WAITING_QA` | 工厂测试 3 项与 typecheck 通过 |
| 2026-08-25 | V2-QA-A1 | 新增可复用退休视觉验收状态工厂；32 家合法状态、汇总与确定性测试通过；正式页面尚未挂载 | 保持 `WAITING_QA` | `createRetirementVisualAuditGame.ts` 及测试；定向 13 项通过 |
| 2026-08-25 | V2 中国队徽 | 第一次隔离页面验收停止：缺少可复用的 32 家合法退休夹具；4207 标签、服务和临时代码已清理，无正式 DOM／PNG 结论 | 保持 `WAITING_QA` | 执行报告；`git diff --check` 通过 |
| 2026-08-25 | 文档治理 | 建立视觉升级实时路线图，整合荣誉、队徽、主题与后续发布计划 | 新建 | 本文 |
| 2026-08-25 | V2 中国队徽 | 32 枚原创资产、清单与工程集成完成；正式页面和超长退役 PNG 尚未验收 | `IN_PROGRESS → WAITING_QA` | [队徽审计](15-china-club-crest-source-audit.md) |
| 2026-08 | V1 荣誉视觉 | 42 项视觉、聚合、联赛限定个人荣誉文案完成并推送 | `READY_TO_COMMIT → SHIPPED` | `e52c38b`、`4cc2907` |
| 2026-08 | V0 稳定性 | 建档移动适配、退役 PNG 媒体查询和几何裁切修复完成并推送 | `READY_TO_COMMIT → SHIPPED` | `2fcc853` |

## 9. 最近一次检查点

检查日期：2026-08-26。

- 中国原创队徽功能提交：`4b5acb5`，已推送至 `origin/main`；
- 用户已在推送后完成测试并确认通过；
- 中国本地原创队徽文件：32 个；
- 中国队徽、清单、测试基础设施、README 与第 15 号审计文档已经提交；
- 合法退休工厂、边界测试和 QA-A 正式 DOM 已完成；
- QA-A 审核图位于 `/tmp/china-club-crests-history-390.png`、`/tmp/china-club-crests-retirement-390.png` 与 `/tmp/china-club-crests-retirement-1280.png`；
- QA-B1 正式 PNG 位于 `/tmp/china-club-crests-v1-retirement-audit.png`；
- QA-B2 完整命令与 Git 范围审计已通过，V2 当前为 `SHIPPED`；
- V3-A、B1、B2 已完成；四套样板视觉未变，功能提交 `49a716e` 已推送至 `origin/main`，当前为 `SHIPPED`；
- V3.0.1 已修复策略说明文字对比不足与移动端双荣誉卡挤压赛季表现，补丁 `23f29a6` 已推送至 `origin/main`，当前为 `SHIPPED`；
- V4 产品方向已实现为“14 套标准模板 + 366 家显式归类”，不再制作一队一套 Token；提交 `2a932f7` 已推送至 `origin/main`，用户在 GitHub Pages 测试通过，当前为 `SHIPPED`；
- V4-A2 已完成：32 家中国俱乐部保持既有归类，334 家海外俱乐部按产品近似口径逐条映射；弗鲁米嫩塞固定为 `CLARET_BLUE`、聚尔特瓦勒海姆固定为 `RED_WHITE`，`NEEDS_REVIEW` 已清零；
- V7 已由用户重新启动；可行性审计完成，下一步只做意甲 20 家核心图腾与构图方向清单，不直接批量画 334 枚；
- 唯一线上验收渠道为 `https://zyrobbie.github.io/football-career-sim/`；后续不再考虑或汇报 Netlify；
- 既有 `outputs/019facd8-3fee-7b80-bfcd-2d1d35e522ba/` 为未跟踪审核输出，必须保留且不得进入提交；
