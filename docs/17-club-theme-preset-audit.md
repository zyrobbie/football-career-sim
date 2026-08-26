# V4-A2：14 套标准主题模板与 366 家静态产品归类

日期：2026-08-26。范围：产品编辑近似归类；本文件与 CSV 是静态设计输入，不是运行时按名称、国家、联赛或随机数推断的规则。

## 结论与边界

- V4-A2 已将 366 家运行时俱乐部全部逐条映射到 14 套标准模板之一；没有使用 `DEFAULT` 或 `UNASSIGNED` 掩盖未填项。
- 这是一份 `PRODUCT_APPROXIMATION` 视觉家族判断：参考俱乐部长期稳定、广为人知的队徽／主场球衣主视觉，不宣称官方 HEX、品牌授权、继承关系或官方主题。
- 映射必须在未来以 canonical ID → template key 的静态表进入运行时；禁止在运行时按名称、国家、联赛或随机数猜主题。
- 同一模板将复用同一套 Token；不保留球队级颜色 override。
- `DEFAULT` 仍只用于无俱乐部、未知外部数据和 `CAREER_RETIRED` 固定退休边界。
- V4-B1 已将这份静态归类固化为运行时 canonical ID → preset key 映射；浏览器运行时不读取本文件或 CSV，不按名称、国家、联赛或随机数猜色。V4-B2 已验证 14 套模板的正式页面、八条异色转会与一条同模板转会，退休档案仍固定绿金；本文件不改变存档、游戏逻辑或队徽。

## 14 套模板定义

| 模板 | 视觉家族 | shell／文字口径 | 典型俱乐部 | 不适合反例 |
| --- | --- | --- | --- | --- |
| `BLUE_BLACK` | 蓝黑条纹／深蓝黑身份 | 深蓝黑 shell，金／白强调；深色区白／浅金文字，浅纸张深蓝黑标题 | 国际米兰、亚特兰大、布鲁日 | 天蓝、红白、黄黑 |
| `BLACK_WHITE` | 黑白条纹或白色主视觉 | 近黑 shell，白色正文与高反差中性色；浅纸张墨黑标题 | 尤文图斯、纽卡斯尔、乌迪内斯 | 蓝黑、天蓝、黄黑 |
| `SKY_BLUE` | 天蓝主视觉 | 海军蓝承载 shell，天蓝强调，白色正文；浅纸张深蓝标题 | 曼城、拉齐奥、那不勒斯 | 皇家蓝、蓝黑 |
| `ROYAL_BLUE` | 深蓝／蓝白主视觉 | 皇家蓝 shell，白色正文与浅金／白强调；浅纸张深靛蓝标题 | 切尔西、埃弗顿、沙尔克04 | 天蓝、蓝红 |
| `RED_BLACK` | 红黑主视觉 | 炭黑 shell、红色强调、白色正文；浅纸张酒红黑标题 | AC米兰、弗拉门戈、勒沃库森 | 红白、酒红蓝 |
| `RED_WHITE` | 红白主视觉 | 深红 shell、白色正文；浅纸张深红标题 | 阿森纳、拜仁、河床 | 红黑、黄蓝 |
| `BLUE_RED` | 蓝红主视觉 | 深蓝 shell、红色第二强调、白色正文；浅纸张深蓝标题 | 上海东港、巴塞罗那、巴黎圣日耳曼 | 蓝黑、红白 |
| `GREEN_YELLOW` | 绿白／绿黄主视觉 | 深绿 shell、黄／金强调、白色正文；浅纸张深绿标题 | 北京御华、皇家贝蒂斯、葡萄牙体育 | 黄黑、红黄 |
| `YELLOW_BLACK` | 黄黑主视觉 | 近黑 shell、黄色主强调、白／浅黄正文；浅纸张炭黑标题 | 多特蒙德、狼队、柏太阳神 | 绿黄、橙色 |
| `CLARET_BLUE` | 酒红天蓝主视觉 | 深酒红 shell、蓝色辅助、白色正文；浅纸张酒红标题 | 阿斯顿维拉、西汉姆联、都灵 | 红黑、紫色 |
| `ORANGE` | 橙色主视觉 | 深炭／深蓝 shell、橙色强调、白色正文；浅纸张深橙标题 | 赫尔城、清水心跳、山东泰岳 | 黄黑、红黄 |
| `PURPLE_PINK` | 紫色或粉色主视觉 | 深紫 shell、白色正文；浅纸张深紫标题 | 佛罗伦萨、图卢兹、安德莱赫特 | 酒红蓝、蓝红 |
| `YELLOW_BLUE` | 黄蓝主视觉 | 深海军蓝 shell、黄色主强调、白／浅黄文字；浅纸张深海军蓝标题 | 博卡青年、比利亚雷亚尔、拉斯帕尔马斯、帕尔马 | 黄黑、绿黄 |
| `RED_GOLD` | 红黄／酒红金主视觉 | 深红／酒红 shell、金黄强调、白／浅金文字；浅纸张深酒红标题 | 罗马、莱切、朗斯 | 红白、橙色 |

其中新增的第 13、14 套为 `YELLOW_BLUE` 与 `RED_GOLD`，用于黄蓝与红黄／酒红金这两类在原 12 套中无法稳定容纳的主要视觉家族；总数已达到路线图允许的 14 套上限。

## 静态归类清单与审核状态

完整逐项表：[club-theme-preset-assignments-v1.csv](data/club-theme-preset-assignments-v1.csv)。字段为 `canonicalClubId, workbookId, displayName, league, templateKey, reason, reviewStatus`。

- `USER_CONFIRMED`：四个既有锚点——国际米兰 → `BLUE_BLACK`；北京御华 → `GREEN_YELLOW`；上海东港 → `BLUE_RED`；AC米兰 → `RED_BLACK`。
- `CONFIRMED`：其余 30 家中国原创队徽俱乐部，沿用既有审计色板。
- `PRODUCT_APPROXIMATION`：海外俱乐部的人工视觉家族归类。
- `NEEDS_REVIEW`：本轮已清零；若未来新增真实歧义，必须先以显式静态模板记录候选，不能退回运行时推断。

| 审核状态 | 数量 |
| --- | ---: |
| `USER_CONFIRMED` | 4 |
| `CONFIRMED` | 30 |
| `PRODUCT_APPROXIMATION` | 332 |
| `NEEDS_REVIEW` | 0 |

## 模板分布

| templateKey | 俱乐部数 |
| --- | ---: |
| `BLUE_BLACK` | 5 |
| `BLACK_WHITE` | 31 |
| `SKY_BLUE` | 25 |
| `ROYAL_BLUE` | 70 |
| `RED_BLACK` | 37 |
| `RED_WHITE` | 82 |
| `BLUE_RED` | 17 |
| `GREEN_YELLOW` | 36 |
| `YELLOW_BLACK` | 5 |
| `CLARET_BLUE` | 7 |
| `ORANGE` | 10 |
| `PURPLE_PINK` | 11 |
| `YELLOW_BLUE` | 22 |
| `RED_GOLD` | 8 |

## 按联赛覆盖

| 联赛 | 运行时数 | 已分配 | NEEDS_REVIEW | 完成率 |
| --- | ---: | ---: | ---: | ---: |
| Premier League（20） | 20 | 20 | 0 | 100% |
| EFL Championship（24） | 24 | 24 | 0 | 100% |
| LaLiga EA Sports（20） | 20 | 20 | 0 | 100% |
| LaLiga Hypermotion（22） | 22 | 22 | 0 | 100% |
| Serie A（20） | 20 | 20 | 0 | 100% |
| Serie B（20） | 20 | 20 | 0 | 100% |
| Bundesliga（18） | 18 | 18 | 0 | 100% |
| 2. Bundesliga（18） | 18 | 18 | 0 | 100% |
| Ligue 1（18） | 18 | 18 | 0 | 100% |
| Ligue 2（18） | 18 | 18 | 0 | 100% |
| Eredivisie（18） | 18 | 18 | 0 | 100% |
| Liga Portugal（18） | 18 | 18 | 0 | 100% |
| Belgian Pro League（18） | 18 | 18 | 0 | 100% |
| J1 League（20） | 20 | 20 | 0 | 100% |
| K League 1（12） | 12 | 12 | 0 | 100% |
| Campeonato Brasileiro Série A（20） | 20 | 20 | 0 | 100% |
| Liga Profesional（30） | 30 | 30 | 0 | 100% |
| 中国顶级联赛（16） | 16 | 16 | 0 | 100% |
| 中国次级联赛（16） | 16 | 16 | 0 | 100% |

## NEEDS_REVIEW 完整清单

无。弗鲁米嫩塞已按酒红主身份固定为 `CLARET_BLUE`；瓦勒海姆聚尔特已按深红与大面积白色固定为 `RED_WHITE`。两项均为 `PRODUCT_APPROXIMATION`，不表示现实俱乐部官方品牌色或授权关系。

## 静态校验口径

- CSV 恰好 366 条数据；canonical ID 与 workbook ID 各自唯一，每家只出现一次。
- 366 条均使用上述 14 个合法模板 key；无 `DEFAULT`、无 `UNASSIGNED`。
- 四个锚点模板与状态固定正确；32 家中国俱乐部保持既有归类，334 家海外俱乐部均为人工 `PRODUCT_APPROXIMATION`。
- 兼容查询层仍应把 workbook ID 解析到 canonical ID 后再读取静态映射；本文件不改变任何运行时逻辑。

## V4-B2 正式验收事实

- 366 个 canonical ID 均显式命中非 `DEFAULT` 模板；workbook 兼容 ID 解析后与 canonical ID 得到同一模板。14 套模板均至少被一家俱乐部使用，审核状态合计为 `USER_CONFIRMED` 4、`CONFIRMED` 30、`PRODUCT_APPROXIMATION` 332、`NEEDS_REVIEW` 0。
- 14 套模板在正式 `HALF_YEAR_PLAN`、`HALF_YEAR_REPORT`、`TRANSFER_WINDOW`、球员、履历、设置页，以及 390×844／1280×720 下均保持 `clientWidth === scrollWidth`。现有职业 phase 还以 `BLUE_BLACK` 与 `BLACK_WHITE` 合法状态复核；`ACADEMY_OFFERS` 因尚未选择俱乐部按设计使用 `DEFAULT`，其余已选俱乐部 phase 使用当前俱乐部模板。
- 异色链 `BLUE_BLACK→BLACK_WHITE`、`BLACK_WHITE→SKY_BLUE`、`SKY_BLUE→ROYAL_BLUE`、`RED_BLACK→RED_WHITE`、`BLUE_RED→RED_GOLD`、`GREEN_YELLOW→PURPLE_PINK`、`YELLOW_BLACK→CLARET_BLUE`、`ORANGE→YELLOW_BLUE` 均由正式报价卡、接受、融入和进入新半年完成；观察记录没有 `DEFAULT` 或报价目标预切换。国际米兰→亚特兰大保持 `BLUE_BLACK`，但 canonical club ID 正确改变。
- `RETIREMENT_DECISION` 仍使用最后俱乐部模板；确认后 `CAREER_RETIRED` 不渲染 `.app-frame`，固定绿金退役档案不受最终俱乐部主题影响。正式预览 PNG 为 2360×2486（5,866,960 像素，447,298 bytes），Sharp 完整 RGBA 解码成功，jsQR 得到 `https://zyrobbie.github.io/football-career-sim/`；二维码页脚、底部 28 CSS px 收尾与内容边界完整，未见大块白边或深绿边。
- 主题文字／按钮／active 对比度的自动化阈值均为至少 4.5:1；语义 success、danger、warning、disabled 与退休档案继续使用固定语义／固定档案色。`prefers-reduced-motion` 将主题过渡压缩为 0.01ms，不使用 `transition: all`。
- 该验收为本地隔离浏览器证据；真实 iPhone Safari 与 Android Chrome 仍须在 GitHub Pages 推送后进行实机复核。
