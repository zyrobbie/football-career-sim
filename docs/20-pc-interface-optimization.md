# 《上场》PC 端专项优化

> 本文是《上场》PC 端界面专项优化的单一执行依据。后续每次开始、返工、视觉审核、工程验收、提交或发布，都必须同步更新本文，避免因聊天记录压缩造成范围、决定和进度丢失。

最后更新：2026-08-29<br>
立项基线：`cf19e0d77800174113873e9538e7d8fc919ddb5b`<br>
当前状态：`PC-QA / READY_TO_COMMIT`<br>
当前批次：PC-D1、PC-D2、PC-D3、PC-D4 与 PC-QA-R1–R5 均已完成；PC-D0 历史审计保持不变。全项目仍等待明确提交指令。<br>
原始校对报告：`/Users/zhihu/Downloads/上场-PC端界面专项优化说明.md`

## 1. 项目目标

本项目只优化 PC／横屏大尺寸下的视觉密度、横向空间利用和信息可读性，不改变游戏的界面逻辑。

当前 PC 界面在不少页面上仍像“移动端长页面的放大版”：纵向留白偏多、大数字占位过强、有效小字过小、横向空间没有充分利用，部分 Grid 还会把中文标签压成一字一行。

优化后的目标是：

> 在保留现有页面内容、信息顺序和操作方式的前提下，让 PC 界面更像一个清晰、紧凑、横向组织的足球职业生涯工作台。

### 1.1 “一屏”的最终口径

“一个游戏阶段尽量在一个视口内完整呈现”是本项目的理想目标，不是绝对约束。

- 对内容固定、选项有限的操作页面，应优先做到在 `1280×720` 的浏览器视口内同时看见页面标题、主要信息、当前选择和主操作按钮。
- 对履历、荣誉、退役档案等内容会随生涯增长的页面，确实无法合理放入一屏时，允许保留正常的页面纵向滚动。
- 不得为了追求一屏而删除、隐藏、截断、分页或改变内容顺序。
- 不新增 Tabs、分页器、局部详情面板、抽屉或新的信息切换流程。
- 不把现有纵向完整内容拆成多个需要点击切换的视图。
- 页面可以纵向滚动，但不得出现页面级横向滚动。

判断优先级如下：

1. 信息完整；
2. 操作逻辑不变；
3. 文字可读；
4. 尽量一屏；
5. 视觉装饰。

当这些目标冲突时，必须牺牲“一屏”或装饰，不得牺牲信息完整性和可读性。

## 2. 明确不做什么

本项目不得修改：

- 游戏规则、比赛、成长、训练、合同、转会、事件、荣誉和国家队逻辑；
- `GameState`、存档结构、存档版本、数据版本或迁移；
- 当前页面之间的流程和 GamePhase；
- 当前页面内部的信息顺序和交互含义；
- 已审核的界面文案；
- 俱乐部主题 Token、队徽、奖杯、品牌 Logo 和二维码内容；
- 退役长图的内容结构、像素预算、二维码和导出几何边界；
- 手机端已经验收的布局逻辑。

特别禁止：

- 为 PC 新增 Tabs、分页、局部详情面板或抽屉；
- 将长履历折叠成分页；
- 将转会报价改造成新的“列表＋详情”交互；
- 将退役档案改造成分区切换页面；
- 用省略号替代玩家需要阅读的有效信息；
- 修改文案来迁就布局宽度。

## 3. 当前代码基线

立项时已确认的主要事实：

- `.app-frame` 最大宽度为 `1536px`，桌面侧栏为 `220px`；
- 桌面导航项最小高度为 `76px`；
- 侧栏装饰球场高度为 `190px`；
- Topbar 最小高度为 `66px`；
- 建档位置球场高度为 `480px`；
- CareerHub 球员总览最小高度为 `184px`；
- 一线队通道／合同区最小高度为 `84px`；
- 半年报告 Footer 最小高度为 `210px`；
- `≤1100px` 时 Career Workspace 会从双栏改成单栏；
- CareerHub 履历表存在 `overflow-x:auto`；
- 部分 PC 有效信息字号为 `9–11px`；
- 球员页、履历页和设置页最大宽度约为 `1180px`；
- 游戏共有 22 个正式 `GamePhase`；
- 球员、履历、设置是覆盖当前 phase 的导航查看页，需要单独验收；
- 已有 `createCopyAuditGame()` 等合法状态工厂可供 PC QA 复用。

这些是立项基线，不代表所有数值都必须机械替换。最终以真实视口中的可读性、完整性和无横向溢出为准。

## 4. 响应式边界

### 4.1 PC 专用层

PC 优化应尽量采用独立样式文件，例如：

`src/styles/desktop.css`

并在 `main.css` 之后加载。所有 PC 规则必须受以下媒体条件约束：

```css
@media (min-width: 821px) {
  /* PC 基础布局 */
}

@media (min-width: 821px) and (max-height: 800px) {
  /* 1280×720、1366×768 等矮屏进一步压缩 */
}
```

不得为了 PC 直接改写已经成熟的 `max-width:820px`、`720px`、`520px`、`360px` 移动端规则。

如果因选择器优先级必须调整 `main.css`，必须说明原因，并证明修改不会影响 `≤820px`。

### 4.2 高度与滚动

不得给所有页面统一套用：

```css
height: 100dvh;
overflow: hidden;
```

推荐只在确实需要固定桌面框架的 Shell 上使用视口高度，并确保子 Grid／Flex 容器具备 `min-height:0`。

页面滚动规则：

- 横向页面滚动：所有 PC 页面均禁止；
- 纵向页面滚动：优先消除无意义滚动，长内容允许保留；
- 不使用 `overflow:hidden` 裁切超出内容；
- 不新增局部滚动面板来代替现有页面滚动；
- 不锁死浏览器缩放、系统大字体或辅助技术的滚动能力。

## 5. PC 字号与空间体系

以下是目标范围，不是要求每个选择器使用完全相同的固定值。

| 类型 | PC 目标字号 |
| --- | ---: |
| 页面主标题 | 28–36px |
| 重要阶段标题 | 24–30px |
| 模块标题 | 17–21px |
| 正文 | 14–15px |
| 按钮 | 13–15px |
| 数据标签 | 12–14px |
| 次要辅助文字 | 12–13px |
| 大型核心数据 | 30–44px |
| OVR 等极重要数字 | 48–56px |

原则：

- 玩家需要阅读的 PC 可见文字原则上不得低于 `12px`；
- `9–11px` 只允许用于不承载信息的纯装饰标记；
- 不得通过把字号统一缩小来达成一屏；
- PC 按钮高度可调整至约 `38–42px`；
- 手机端触摸尺寸保持现状；
- 不再让 `78px` 以上的装饰数字长期占据页面主要高度。

PC 主要间距优先从下列尺度选择：

```text
4 / 8 / 12 / 16 / 24 / 32
```

常规页面左右 Padding 建议约 `20–32px`，模块间距约 `10–24px`。确有构图意义的留白可保留，但应停止使用没有功能的 `50–120px` 空白。

## 6. 标签横排与动态文字

“一字一行”主要是 Grid 列宽不足造成的，不应通过全局禁用正文换行修复。

适合保持单行的内容：

- 状态和关系标签；
- 合同字段名；
- 球队级别；
- 角色；
- 卡片短标题；
- 一线队关注度等短字段。

可以针对这些短标签使用：

```css
white-space: nowrap;
word-break: keep-all;
overflow-wrap: normal;
writing-mode: horizontal-tb;
```

正文、说明和事件内容仍应正常换行。

不得简单把所有正文设为 `nowrap`，也不得为解决宽度而隐藏、截断或擅自缩写文案。

## 7. PC 主框架

### 7.1 侧栏

目标：

- 常规宽度约 `180–190px`；
- 821–1100px 可进一步缩至约 `165–175px`；
- 导航项高度约 `50–56px`；
- 完整 Logo 适度缩小，但比例和安全区不变；
- 高度不超过 800px 时，装饰球场缩至约 `90–110px`；
- 高度约 720px 时，可以隐藏纯装饰球场；
- 存档状态压缩为一至两行。

侧栏信息和导航逻辑不变。

### 7.2 Topbar

目标高度约 `50–54px`。

必须继续显示现有：

- 当前窗口；
- 当前阶段；
- 自动保存状态；
- 当前俱乐部。

不得删除信息，只调整间距、字号和排列密度。

### 7.3 内容宽度

PC 最大内容宽度可提高至约 `1680–1760px`，但 1920px 屏幕仍保留适度外边距。

球员页、履历页、设置页不应继续机械限制在 `1180px`，应根据内容使用更充分的横向空间。

## 8. 页面专项目标

### 8.1 首页

保持现有结构和品牌层级，不重新设计 Hero。

优化重点：

- 缩小无意义的顶部和按钮区留白；
- Logo 约 `170–190px`；
- 主标题约 `36–44px`；
- 正文约 `15–16px`；
- 按钮约 `40–42px`；
- 三个玩法原则数字约 `24–28px`。

目标是在 `1280×720` 尽量完整显示 Logo、日期、标题、介绍、按钮和三个玩法点。若浏览器缩放、系统字体或异常文案导致放不下，应允许正常纵向滚动。

### 8.2 五步建档

不改变五步流程、步骤顺序和当前操作逻辑。

- Header 目标高度约 `76–88px`；
- 正文使用剩余桌面空间；
- 第一步利用横向空间排列姓名、号码、惯用脚；
- 第二步改为左侧球场、右侧当前位置说明／能力权重／副位置；
- 球场高度目标约 `300–340px`；
- 第三步职业追求使用四列或 `2×2`；
- 第四步留洋态度与联赛选择横向分区；
- 第五步身份／OVR／能力与职业偏好横向组织。

这些只是桌面排版变化，不得改变字段、选择数量、默认值和提交动作。

### 8.3 青训邀请

- 保持三家俱乐部三列对比；
- 不改成上下卡片或新的选择流程；
- 顶部进度约 `48–54px`；
- 标题约 `30–36px`；
- 俱乐部 Header 约 `88–96px`；
- 对比行约 `38–42px`；
- 底部确认区约 `72–90px`；
- 取消或缩小纯装饰性巨大编号。

### 8.4 CareerHub

保留现有信息顺序：

```text
球员总览
状态与关系
合同／一线队通道
履历摘要＋当前阶段操作
```

目标：

- 总览约 `110–130px`；
- OVR 约 `48–56px`；
- 状态关系约 `48–58px`；
- 合同／通道约 `54–64px`；
- 剩余高度交给履历摘要和当前操作；
- 六项状态标签横排；
- 履历摘要在 PC 上不得横向滚动；
- 当前操作按钮尽量位于首屏。

821–1100px 不再因为旧断点直接变成上下长页面，应尽量维持左右布局；若真实宽度无法保证内容完整，可以调整左右比例和表格列宽，但不得新增面板、分页或折叠逻辑。

“查看全部履历”继续使用现在的逻辑。不得改成弹层或分页。

### 8.5 半年计划、到队、特殊事件

这些页面继续使用现有选择与确认流程。

桌面卡片布局建议：

- 2 项：两列；
- 3 项：三列；
- 4 项：`2×2`；
- 6 项训练：`3×2`。

卡片目标高度约 `58–76px`，标题 `13–15px`，说明和结果预览 `12–13px`。不得隐藏说明。

### 8.6 半年报告

保持现有报告内容和阅读顺序，不增加 Tabs 或分区切换。

可以继续利用现有左右结构：

- 左侧约 60–65%：比赛数据、能力变化、荣誉；
- 右侧约 35–40%：国家队、事件、状态关系、合同和财务；
- 底部行动区压缩至约 `50–64px`；
- 报告数字约 `28–34px`；
- 属性行约 `32–38px`；
- 荣誉和合同有效标签提高至至少 `12px`。

信息确实超过视口时允许页面向下滚动，不能把 Footer 固定后遮住正文。

### 8.7 首份合同与转会

不改变合同选择、反报价、留队、续约、报价选择和确认流程。

合同：

- 五个核心条款利用横向空间；
- 三个反报价选项桌面并排；
- 签约按钮与财务说明减少纵向占用。

转会：

- 保留当前报价卡、详情、谈判和确认顺序；
- 不新增右侧 Detail Panel；
- 可以通过横向 Grid、压缩间距和更合理的卡片内部布局减少页面高度；
- 长报价、长条件或多个方案确实放不下时允许纵向滚动。

### 8.8 阶段完成页

覆盖青训完成、合同完成、职业阶段完成、转会完成。

- 装饰数字最大约 `48–64px`；
- 结果标题约 `26–32px`；
- 核心数据横向展示；
- 按钮尽量在首屏；
- 不改变下一步动作和当前决定流程。

### 8.9 球员页

利用桌面宽度将现有区块组织为更紧凑的矩阵，但不改变区块顺序和字段：

```text
球员身份／OVR
四项能力      职业取向
当前合同      状态与关系
生涯标签
```

OVR 目标约 `44–52px`。内容较短时争取一屏；长俱乐部名、联赛偏好或合同说明不得裁切。

### 8.10 履历页

保持现有四个区块依次展示：

1. 生涯概览；
2. 生涯时间线；
3. 俱乐部生涯；
4. 国家队与荣誉室。

不得增加 Tabs 或分页。

生涯时间线继续使用已经确认的“完整赛季聚合”口径，不得改回半年窗口。

PC 目标：

- 页面不得横向滚动；
- 表格有效文字至少 `12px`；
- 数字列窄、俱乐部列宽；
- 长生涯允许正常向下滚动；
- 不要求把全部赛季强塞进 720px。

### 8.11 设置页

可以在 PC 使用两列排版，但保持现有区块顺序和删除确认流程。短内容目标为一屏。

### 8.12 退役档案

不得增加 Tabs、分页或新的浏览模式。

浏览器中的退役档案继续完整纵向展示，长生涯允许正常页面滚动。

可以调整 PC 浏览状态下的宽度、字号和间距，但必须保证：

- `data-retirement-export-target` 的完整纵向内容不变；
- 导出 Clone 不继承 PC 视口高度或裁切规则；
- 二维码、Logo、页脚和约 28px 收尾不变；
- 1200 万像素预算和自动降 scale 机制不变；
- 正式分享 PNG 的内容、顺序和可读性不退化。

## 9. 最坏情况内容

每一批不能只用短名字和空荣誉状态验收。至少覆盖：

- 最长俱乐部中文名；
- 较长特殊事件标题和说明；
- 较长合同条件；
- `€1,925,625` 等金额；
- “五大联赛中下游”等长状态；
- 40 岁；
- 多项荣誉；
- 已退出国家队；
- 跨俱乐部完整赛季；
- 长转会结果；
- 不同俱乐部主题；
- `BLACK_WHITE` 浅色 Shell。

任何情况下不得出现：

- 中文一字一行；
- 信息被切掉；
- 按钮文字不完整；
- 数字顶出卡片；
- 为适应动态内容临时缩成 `9px`；
- 页面级横向滚动。

## 10. 禁止采用的伪优化

直接拒绝以下方案：

- `transform:scale(...)`；
- CSS `zoom`；
- 全局 font-size 缩小；
- 大量 `8px / 9px / 10px / 11px` 有效信息；
- `overflow:hidden` 裁内容；
- 横向 scrollbar；
- 隐藏重要说明；
- 大量使用省略号代替有效内容；
- 修改文案迁就布局；
- PC 直接套用手机布局；
- 新增 Tabs、分页、抽屉或局部详情面板；
- 改变现有页面流程和交互逻辑。

## 11. 执行批次

本项目按以下批次推进。每一批都必须先完成视觉审核，再进入下一批。

| 批次 | 范围 | 状态 | 完成证据 | 下一动作 |
| --- | --- | --- | --- | --- |
| PC-D0 | 基线审计、桌面 QA 工具和状态工厂复核 | `WAITING_QA` | 22 个正式 phase、球员／履历／设置和五种 PC 视口完成隔离基线测量；未修改生产 UI | 等待用户批准进入 PC-D1 |
| PC-D1 | 独立 Desktop Layer、AppShell、Sidebar、Topbar、CareerHub 顶部总览／状态关系／合同与一线队通道／最近履历摘要，以及当前阶段工作区的共享承载布局 | `READY_TO_COMMIT` | 用户已通过共享桌面密度与层级视觉审核；D1 既有静态、正式页面与移动回归证据保持有效 | 等待明确提交指令；不得因 D2 回头调整 D1 已审核方向 |
| PC-D2 | 首页、五步建档、球员揭晓、青训邀请、到队／计划／事件 | `READY_TO_COMMIT` | 特殊事件说明 Grid 定点修复完成；建档位置页右栏空间利用修复完成；12 个 D2 phase × 8 个指定视口，共 96 个正式页面样本通过；无页面级横向溢出；控制台 error/warn 为 0；D2 有效文字最小字号为 12px；1280×720 分类为 6 个 `FIT`、6 个 `ACCEPTABLE_SCROLL`、0 个 `FAILED_WASTED_OVERFLOW` | 等待用户明确批准进入 PC-D3，不得自行开始 |
| PC-D3 | 半年报告、合同、转会、阶段完成页 | `READY_TO_COMMIT` | 半年报告使用约 62%／38% 主次栏；荣誉按两列自然换行，0–3 项均无裁切；合同金额、角色和转会环境说明不再被 ellipsis 或 overflow 裁切；1／2／3 份转会报价均可直接比较；阶段完成页压缩无意义空白，固定状态 CTA 在 1280×720 首屏可见；8 个 D3 phase × 8 个指定视口，共 64 个正式样本通过；`clientWidth === scrollWidth`；控制台 error/warn 为 0；桌面有效文字最小字号为 12px；1280×720 分类为 6 个 `FIT`、2 个 `ACCEPTABLE_SCROLL`、0 个 `FAILED_WASTED_OVERFLOW`；D1、D2 未回改，D4 未开始 | 等待用户明确批准进入 PC-D4，不得自行开始 |
| PC-D4 | 球员、履历、设置、退役 | `READY_TO_COMMIT` | PC-D4-R1 截图上下文已纠正；R2 将 Player／History／Settings 副标题 `10.8333px`、退休决定相关文字 `10px`、退休档案桌面 `9–11px`／移动 `6–11px` 的有效信息均提升至至少 `12px`。所有修订均为精确 selector，未修改全局 `small`、`button`、`p`，未使用 zoom、transform、隐藏文字或结构调整。320／390／430px 与 1024／1280／1366／1920px 全部通过；14 套主题桌面 42/42、四套边界主题移动 12/12，console `error=0 / warn=0`，导航不改写 GameState。正式 PNG 为 `1640×7307`、11,983,480 像素、1,219,863 bytes、RGBA 47,933,920 bytes、jsQR 正确，低于 12,000,000 像素预算；1280×720 为 4 个 `FIT`、3 个 `ACCEPTABLE_SCROLL`、0 个 `FAILED_WASTED_OVERFLOW` | 等待用户明确批准进入 PC-QA；不得自行开始 |
| PC-QA | 22 phases、导航页、主题、移动回归、正式 PNG、工程链 | `READY_TO_COMMIT` | PC-QA-R1–R3 的移动信息完整性修复保持通过；R4 覆盖半年报告移动端全部有效信息；R5 以 `.career-report` 限定的桌面规则修复事件、后果和合同兑现的 9–10px／ellipsis 裁切。最终代码重新通过 200 个基础样本、42 个桌面主题样本、12 个移动边界样本、32 家正式退休 PNG 和完整工程链 | 等待明确提交指令；不得自行提交 |

状态定义：

| 状态 | 含义 |
| --- | --- |
| `NOT_STARTED` | 尚未开始 |
| `IN_PROGRESS` | 正在实现，不能视为完成 |
| `WAITING_VISUAL_REVIEW` | 已完成当前批次静态／页面稿，等待用户判断 |
| `WAITING_QA` | 视觉方向通过，等待工程或浏览器验收 |
| `READY_TO_COMMIT` | 所有要求和验证通过，尚未提交 |
| `SHIPPED` | 已提交并推送，线上验证另行记录 |
| `BLOCKED` | 存在真实阻塞，不能包装为完成 |

## 12. QA 口径

### 12.1 PC 视口

每批至少检查：

```text
1280×720
1366×768
1440×900
1920×1080
```

补充检查：

```text
1024×768
```

所有页面必须满足：

```text
document.documentElement.scrollWidth <= window.innerWidth
```

纵向高度不再采用“一律 `scrollHeight <= innerHeight`”的硬门槛。

应分别记录：

- 首屏完整，无纵向滚动；
- 因真实长内容需要纵向滚动；
- 不应滚动却仍因布局浪费而滚动。

只有第三种属于失败。

固定内容的决策页面还要检查：

- 主 CTA 是否在首屏；
- 选择卡是否完整；
- 玩家有效文字是否至少 `12px`；
- 是否出现一字一行；
- 是否有内容裁切；
- focus／selected／disabled／hover 是否正常；
- 控制台是否有 error／warn。

### 12.2 正式页面范围

最终覆盖全部 22 个 `GamePhase`，并额外覆盖：

- 球员页；
- 履历页；
- 设置页；
- 退役预览弹层。

应优先复用现有合法状态工厂，不得用无法通过 `validateGameState()` 的伪造状态包装验收结果。

### 12.3 主题

- 14 套主题至少做一次 AppShell 桌面烟雾检查；
- `BLACK_WHITE` 与至少一套深色主题贯穿关键页面复核；
- 语义 success／danger／warning／disabled 不得被俱乐部主题污染；
- Logo 版本、比例和可读性不变。

### 12.4 手机端硬回归

每批至少抽查本批涉及的页面：

```text
320×568
375×667
390×844
430×932
```

最终至少覆盖：首页、五步建档、青训邀请、CareerHub、特殊事件、半年报告、合同、转会、球员、履历、设置和退役。

要求：

- 手机继续允许正常纵向滚动；
- Mobile Nav 不变；
- 手机字号、卡片折行和按钮触摸尺寸不变；
- 手机不得继承 PC 的固定高度和溢出规则；
- 退役 PNG 不变。

### 12.5 退役 PNG

最终必须通过正式按钮链路生成 Blob，并验证：

- Sharp 可完整解码 RGBA；
- jsQR 解码为当前正式域名；
- Logo、二维码、页脚、最后一项内容完整；
- 无大块白边或深绿底边；
- 像素数不超过既有预算；
- 移动端与 PC 样式没有污染导出 Clone。

### 12.6 工程链

最终执行：

```bash
npm run generate:clubs:check
npm run verify:retirement-qr
npm test -- --run
npm run typecheck
npm run build
npm audit --omit=dev
git diff --check
git status --short
```

构建成功、测试成功、浏览器验收、视觉审核、提交和线上验证是不同事实，文档中必须分别记录。

## 13. 文件与 Git 边界

允许范围预计包括：

- `src/styles/desktop.css`；
- `src/main.tsx` 的桌面样式引入；
- 各页面和共享框架的布局 class／语义容器；
- PC 专项静态与组件测试；
- 既有合法视觉 QA 状态工厂的必要扩展；
- 本文及 `docs/16-visual-upgrade-roadmap.md`。

任何生产组件修改都只能服务于布局，不得改变业务判断、状态转换或数据派生。

现有未跟踪目录：

`outputs/019facd8-3fee-7b80-bfcd-2d1d35e522ba/`

必须持续排除，不得读取、修改、删除或提交。

## 14. 每批交付格式

每个批次完成后在本文追加记录，并向用户报告：

1. 批次状态；
2. 实际修改文件；
3. 页面结构是否保持不变；
4. 各 PC 视口是否存在横向溢出；
5. 哪些页面首屏完整；
6. 哪些页面因真实长内容保留纵向滚动；
7. 最坏内容测试结果；
8. 手机端回归结果；
9. 工程命令结果；
10. 最终 Git 状态；
11. 尚未验证的真实风险；
12. 是否可以进入下一批。

不得将“代码已写”“自动化通过”“浏览器通过”“用户视觉认可”“已推送”合并成同一个结论。

## 15. 进度日志

后续按以下格式追加，不覆盖历史记录：

| 日期 | 批次 | 变更摘要 | PC 视口结果 | 移动回归 | 状态 | 提交／发布 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-28 | 立项 | 根据 PC 校对报告建立最终执行口径；确认“一屏”为理想目标，禁止新增 Tabs、分页和局部面板 | 尚未执行 | 尚未执行 | `PLANNED` | 未提交 |
| 2026-08-28 | PC-D0 | 使用现有合法状态工厂挂载 22 个正式 phase、球员／履历／设置三个查看页；完成 PC 基线测量与问题归类，未修改生产 UI | 1280×720 全部无横向溢出；21 个有限／固定基线为 `WASTED_OVERFLOW`；半年报告与退休档案为纯 `EXPECTED_LONG`；短履历、设置为 `FIT`，长履历在未来真实长生涯中转为 `EXPECTED_LONG` | 本批未触碰移动端 | `WAITING_QA` | 未提交 |
| 2026-08-28 | PC-D1 | 新增独立桌面层；收紧 AppShell、Sidebar、Topbar 与 CareerHub 共享承载，不改任何 phase 专属卡片、数据或流程 | 1024×768、1280×720、1366×768、1920×1080 均无横向溢出；1280 起采用最近履历／当前工作区双栏，1024 自然回落为单栏；14 套正式主题与四项侧栏导航通过隔离 App 验收 | 320×568、375×667、390×844、430×932 的计划、事件、报告、球员、履历、设置均无横向溢出 | `READY_TO_COMMIT`（用户已视觉确认） | 未提交 |
| 2026-08-29 | PC-D2 | 仅在独立桌面层收紧首页、建档、球员揭晓、青训邀请、到队、半年计划与特殊事件的专属承载；不改数据、流程或后续 D3／D4 页面 | 12 个 D2 phase 在 1024×768、1280×720、1366×768、1440×900 均无页面级横向溢出；固定选择区改为可收缩网格，邀请仍保留三家并列直接比较 | 320×568、375×812、390×844、430×932 无横向溢出；长说明自然换行，无省略号或隐藏裁切 | `WAITING_VISUAL_REVIEW`（初版记录，最终状态见 PC-D2-R1） | 未提交 |

## 16. PC-D0 页面基线矩阵

### 16.1 方法与状态工厂

- 基线在新的隔离 origin `http://127.0.0.1:4231/` 完成；未访问用户浏览器存档或既有隔离 origin。
- `COPY_AUDIT_PHASES` 与当前 22 个 `GamePhase` 一致。除 `HOME`（正式无存档首页，合法返回 `null`）外，`createCopyAuditGame()` 为每个 phase 返回经 `validateGameState()` 验证的状态；`CAREER_RETIRED` 复用 `createRetirementVisualAuditGame()`。
- 球员、履历、设置从允许导航的 `HALF_YEAR_PLAN` 正式 App 通过正式侧栏按钮打开，未复制任何 Screen JSX。
- 下表的高度为 `1280×720` 下 `clientWidth×clientHeight → scrollWidth×scrollHeight`。CTA 的“首屏”仅指加载后无需纵向滚动即可到达。
- `FIT` 表示该短状态基线高度已完整；`EXPECTED_LONG` 是真实可增长内容；`WASTED_OVERFLOW` 是固定／有限内容被现有桌面布局、过大最小高度或留白推到首屏外。当前分类计数为 21 个 `WASTED_OVERFLOW`、2 个纯 `EXPECTED_LONG`（半年报告、退休档案）和 2 个短状态 `FIT`（履历、设置）。长生涯履历会转为 `EXPECTED_LONG`，但不计入当前短状态的 2 个纯 `EXPECTED_LONG`；半年报告虽属真实可增长内容，仍存在明显密度浪费，PC-D3 必须优化。D0 不修改任何问题。

| Phase / 查看页 | 正式 Screen | 根 class | 框架 | 当前 PC 主要问题 | 纵向滚动分类 | 后续批次 |
| --- | --- | --- | --- | --- | --- | --- |
| HOME | HomeScreen | `.home-screen` | 独立页 | 1280×720 为 `1280×720 → 1280×876`；CTA 可见，但 Hero／球场最小高度留下无意义滚动 | WASTED_OVERFLOW | D2 首页 |
| CREATE_IDENTITY | CreationScreen / SetupFrame step 1 | `.setup-shell--step-1` | SetupFrame | `→892`，继续按钮首屏外；固定字段页不应依赖滚动 | WASTED_OVERFLOW | D2 建档框架 |
| CREATE_POSITION | CreationScreen / SetupFrame step 2 | `.setup-shell--step-2` | SetupFrame | `→1551`，480px 球场与上下留白使 CTA 大幅掉出首屏 | WASTED_OVERFLOW | D2 建档位置页 |
| CREATE_PRIORITIES | CreationScreen / SetupFrame step 3 | `.setup-shell--step-3` | SetupFrame | `→1009`，四项固定选择仍需滚动 | WASTED_OVERFLOW | D2 建档选择网格 |
| CREATE_PREFERENCES | CreationScreen / SetupFrame step 4 | `.setup-shell--step-4` | SetupFrame | `→1232`，固定偏好内容与 CTA 不在首屏 | WASTED_OVERFLOW | D2 建档选择网格 |
| PLAYER_REVEAL | PlayerRevealScreen / SetupFrame step 5 | `.setup-shell--step-5` | SetupFrame | `→1241`，身份、能力与 CTA 可横向重排 | WASTED_OVERFLOW | D2 球员揭晓页 |
| ACADEMY_OFFERS | AcademyOffersScreen | `.app-frame` / `.career-offers` | AppShell + CareerHub | `→1638`，三列邀请、确认区和 CTA 过长；履历表 10–11px 有效数据 | WASTED_OVERFLOW | D2 青训邀请专属布局；D1 仅可影响共享承载层 |
| ARRIVAL_EVENT | ArrivalScreen | `.app-frame` / `.career-decision` | AppShell + CareerHub | `→1328`，固定到达选择页 CTA 首屏外；履历表 10–11px | WASTED_OVERFLOW | D2 到队专属布局；D1 仅可影响共享承载层 |
| HALF_YEAR_PLAN | TrainingPlanScreen | `.app-frame` / `.career-decision` | AppShell + CareerHub | `→1448`，训练与职业策略固定选项纵向堆叠；CTA 首屏外 | WASTED_OVERFLOW | D2 计划专属布局；D1 仅可影响共享承载层 |
| SPECIAL_EVENT | SpecialEventScreen | `.app-frame` / `.special-event` | AppShell + CareerHub | `→1164`，当前有限选项场景仍滚动；长剧情本身允许换行 | WASTED_OVERFLOW | D2 特殊事件专属布局；D1 仅可影响共享承载层 |
| SPECIAL_EVENT_RESULT | SpecialEventScreen | `.app-frame` / `.special-event` | AppShell + CareerHub | `→1179`，结果／继续操作在首屏外 | WASTED_OVERFLOW | D2 特殊事件专属布局；D1 仅可影响共享承载层 |
| SIMULATION_READY | TrainingPlanScreen | `.app-frame` / `.career-decision` | AppShell + CareerHub | 与计划页相同 `→1448`；按钮禁用态仍不应靠长滚动到达 | WASTED_OVERFLOW | D2 计划专属布局；D1 仅可影响共享承载层 |
| HALF_YEAR_REPORT | HalfYearReportScreen | `.app-frame` / `.career-report` | AppShell + CareerHub | `→2059`；报告、荣誉、国家队、合同均可能增长，且有 10–11px 变化数据及明显密度浪费 | EXPECTED_LONG | D3 报告密度与字号 |
| CAREER_DASHBOARD | DemoCompleteScreen | `.app-frame` / `.demo-complete` | AppShell + CareerHub | `→1362`；青年队完成页为有限内容，却由 120px padding／大编号推高 | WASTED_OVERFLOW | D3 阶段完成页；D1 仅可影响共享承载层 |
| PRO_CONTRACT_OFFER | ProfessionalContractScreen | `.app-frame` / `.contract-stage` | AppShell + CareerHub | `→1143`；有限合同条款、€ 金额与 CTA 可在 PC 双栏内收紧 | WASTED_OVERFLOW | D3 合同页；D1 仅可影响共享承载层 |
| PRO_CONTRACT_COMPLETE | ProfessionalContractScreen | `.app-frame` / `.contract-complete` | AppShell + CareerHub | `→1169`；签约结果和继续按钮首屏外 | WASTED_OVERFLOW | D3 合同页；D1 仅可影响共享承载层 |
| PRO_STAGE_COMPLETE | ProfessionalStageCompleteScreen | `.app-frame` / `.demo-complete--hub` | AppShell + CareerHub | `→1455`；固定结算／下一步页被大编号与 padding 拉长 | WASTED_OVERFLOW | D3 阶段完成页；D1 仅可影响共享承载层 |
| TRANSFER_WINDOW | TransferWindowScreen | `.app-frame` / `.transfer-window` | AppShell + CareerHub | `→1204`；单报价基线 CTA 首屏外，多个正式报价时可正常增长；环境文字已出现裁切风险 | WASTED_OVERFLOW（当前单报价基线；多报价未来可为 EXPECTED_LONG，不计入纯 EXPECTED_LONG） | D3 转会页；D1 仅可影响共享承载层 |
| TRANSFER_ARRIVAL | TransferWindowScreen | `.app-frame` / `.transfer-arrival` | AppShell + CareerHub | `→961`；有限融入选项仍有无意义滚动 | WASTED_OVERFLOW | D3 转会页；D1 仅可影响共享承载层 |
| TRANSFER_STAGE_COMPLETE | TransferWindowScreen | `.app-frame` / `.transfer-complete` | AppShell + CareerHub | `→950`；固定确认内容与 CTA 首屏外 | WASTED_OVERFLOW | D3 转会页；D1 仅可影响共享承载层 |
| RETIREMENT_DECISION | RetirementScreen | `.app-frame` / `.retirement-decision` | AppShell + CareerHub | `→1127`；有限决定页 CTA 首屏外 | WASTED_OVERFLOW | D4 退休页面；D1 仅可影响共享承载层 |
| CAREER_RETIRED | RetirementScreen | `.retirement-archive` | 独立退休档案 | `→1454`；档案／履历／荣誉会真实增长，9–11px 辅助统计需单独评估 | EXPECTED_LONG | D4 只做 PC 展示密度，不触碰 PNG |
| PLAYER 查看页 | PlayerScreen | `.player-screen` | AppShell 导航覆盖 | `→952`，固定个人档案在当前短历史下仍滚动；“生涯一览” 10.83px | WASTED_OVERFLOW | D4 PlayerScreen |
| HISTORY 查看页 | CareerHistoryScreen | `.history-screen` | AppShell 导航覆盖 | `720`，短历史基线首屏完整；长履历属于正常增长 | FIT（短履历）；长履历 EXPECTED_LONG，但不计入纯 EXPECTED_LONG | D4 履历宽度／表格 |
| SETTINGS 查看页 | SettingsScreen | `.settings-screen` | AppShell 导航覆盖 | `720`，短固定设置页首屏完整；副标题 10.83px | FIT | D4 SettingsScreen 字号 |

### 16.2 关键 PC 视口结果

所有下列样本均满足 `clientWidth === scrollWidth`，控制台 `error=0`、`warn=0`。长中文玩家名（12 字符）已用于建档、邀请、计划、报告、合同和转会样本。

| 视口 | 主要观察 |
| --- | --- |
| 1024×768 | 无横向溢出；≤1100px 的 AppShell／CareerHub 已变窄，但固定页面反而更长：位置 `1537px`、邀请 `2136px`、计划 `1957px`、报告 `2469px`。 |
| 1280×720 | 基线目标视口；除首页 CTA 外，固定阶段的主要 CTA 均首屏外。计划页 `1448px`、合同 `1143px`、转会单报价 `1204px`、退休决定 `1127px`。 |
| 1366×768 | 无横向溢出；固定阶段 CTA 仍普遍首屏外，表明问题不是单纯窄屏。 |
| 1440×900 | 首页接近完整但仍 `920px`；位置、邀请、计划、报告、合同、转会、退休决定仍纵向滚动。 |
| 1920×1080 | 特殊事件、合同报价与退休决定 CTA 可见；位置、邀请、计划、报告、转会与退休档案仍滚动，说明存在可利用的横向空间与固定高度问题。 |

### 16.3 静态 CSS 根因与 PC-D1 精确范围

以下均为 D0 证据，不是本批修复内容。

| 文件 | 选择器／组件 | 证据与建议 |
| --- | --- | --- |
| `src/styles/main.css` | `.app-frame`、`.sidebar`、`.sidebar__item`、`.sidebar__pitch`、`.sidebar__save`、`.app-surface`、`.topbar` | 当前 220px 侧栏、76px 导航项、190px 装饰球场、66px topbar 持续占用矮屏；D1 仅在 `min-width:821px` 建立紧凑共享承载覆盖。 |
| `src/styles/main.css` | `.career-hub`、`.career-overview`、`.career-meters`、`.career-meter`、`.first-team-path`、`.career-workspace`、`.career-ledger`、`.career-active` | CareerHub 在可用宽度内仍保持移动优先的纵向密度；D1 只改善顶部总览、状态／关系、合同／一线队通道、最近履历摘要和当前阶段工作区的共享承载布局，不调整任何 phase 专属卡片。 |

### 16.4 有效小字号、裁切与一字一行审计

- 9–11px 的有效信息：CareerHub 履历表 `th/td`（阶段、年龄、俱乐部、队伍、角色、能力、出场、进球、助攻）、报告中的能力／关系变化值与财务变化、Player／History／Settings 副标题、退休档案的统计 `dt` 与生涯摘要。这些均不是纯装饰，后续 PC 层应至少达到 12px。
- 本轮自动测量未发现实际“一字一行”元素，也未发现页面级横向溢出。
- 已发现有效内容裁切风险：转会 `.transfer-offer-grid__environment` 的“世界顶级训练条件 · 融入极高”，以及合同金额 `€1,970,000`／`€34,000`／`€950,000` 使用了带 `overflow:hidden` 或 ellipsis 的承载容器。SR-only Logo 省略不视为可见内容裁切。

### 16.5 PC-D1 建议范围

PC-D1 仅建议新增 `src/styles/desktop.css` 并在 `src/main.tsx` 于 `main.css` 后引入；如遇选择器优先级问题，才以最小范围触及 `src/styles/main.css`。预计不需要修改 Screen、Store、模型或流程代码。

建议首批选择器范围：

```text
.app-frame .sidebar .sidebar__item .sidebar__pitch .sidebar__save .topbar
.app-surface
.career-hub .career-overview .career-meters .career-meter .first-team-path
.career-workspace .career-ledger .career-active
```

在 `@media (min-width:821px)` 与 `@media (min-width:821px) and (max-height:800px)` 内实施；不改动手机断点、不新增 Tabs／分页／抽屉，也不改变报告、退休档案或 PNG 的数据与几何口径。建档、PlayerReveal、邀请、到队、计划、特殊事件、报告、合同、转会、阶段完成、Player、履历、设置和退休页面的专属卡片布局，均留待 D2、D3 或 D4。

### 16.6 PC-D1 实际结果（用户已视觉确认）

- 新增 `src/styles/desktop.css`，由 `src/main.tsx` 在既有 `main.css` 之后引入；其生产规则只作用于共享 AppShell 与 CareerHub 选择器，并限定在 `min-width:821px`。
- 1280px 及以上：侧栏为 186px、Topbar 为 52px，最近履历与当前工作区为可收缩双栏；1024px 以单栏回落，不引入局部横向滚动。
- 四个桌面目标视口的正式 AppShell 均为 `clientWidth === scrollWidth`；共享有效文本最小计算字号为 12px，未测得单字一行。
- 五个关键职业 phase（计划、特殊事件、半年报告、职业合同报价、转会窗口）、14 套主题以及侧栏的生涯／球员／履历／设置均通过隔离页面检查；导航只改变查看页，状态工厂注入的 GameState 指纹保持不变。
- 320×568、375×667、390×844、430×932 的移动正式页面未受桌面层影响；计划、事件、报告与三项查看页均无横向溢出、无检测到的标题或按钮 ellipsis 裁切。
- 工程验证：俱乐部生成检查、退休二维码检查、D1／主题／导航定向测试 19 项、全量测试 54 文件／368 项、TypeScript 与生产构建均通过；`npm audit --omit=dev` 为 0 vulnerabilities。构建仅保留既有的单 chunk 大小提示，非失败。
- 审核图：`/tmp/pc-d1-careerhub-1024x768.png`、`/tmp/pc-d1-careerhub-1280x720.png`、`/tmp/pc-d1-careerhub-1366x768.png`、`/tmp/pc-d1-careerhub-1920x1080.png`、`/tmp/club-theme-presets-v4-b1-390.png`、`/tmp/club-theme-presets-v4-b1-1280.png` 与 `/tmp/pc-d1-before-after.png`。这些仅用于当前批次视觉判断，不是提交产物。

### 16.7 PC-D2 初版验收记录（已由 16.8 PC-D2-R1 最终结果替代）

本节为初版验收记录，最终验收已由 16.8 的 PC-D2-R1 结果替代。

- 生产改动仍只在 `src/styles/desktop.css` 的 `@media (min-width:821px)` 中生效；没有修改任何 Screen、GameState、存档、模拟或 D3／D4 专属页面规则。
- 首页收紧为品牌、年份、标题、导语、操作与原则的连续桌面叙事；建档将位置、优先级与偏好改为可收缩的桌面分区，保留原有控件、顺序与提交行为。
- 球员揭晓采用紧凑横向信息承载；青训邀请保留三家并列对照和全部字段；到队、训练计划、模拟就绪与特殊事件采用有限选项的两／三列网格，不新增标签、分页、抽屉或局部滚动。
- 隔离正式 App 在 12 个 D2 phase × 7 个视口（320×568、375×812、390×844、430×932、1024×768、1280×720、1440×900）共 84 个样本均为 `clientWidth === scrollWidth`，控制台 `error=0`、`warn=0`；未发现旧品牌、编辑“保留”标记或未插值变量。移动端长说明仅按既有规则自然换行，未使用省略号或隐藏裁切。
- 审核图：`/tmp/pc-d2-home-1280x720.png`、`/tmp/pc-d2-position-1280x720.png`、`/tmp/pc-d2-academy-offers-1280x720.png`、`/tmp/pc-d2-training-plan-1280x720.png`、`/tmp/pc-d2-special-event-1280x720.png` 与 `/tmp/pc-d2-before-after.png`。其中对比图以 D1 共享框架基线与同一半年计划工作区的 D2 密度结果并列，供视觉判断，不是提交产物。

### 16.8 PC-D2-R1 定点返修与分类（用户视觉审核通过，`READY_TO_COMMIT`）

最终有效视口以本节为准：桌面为 1024×768、1280×720、1366×768、1920×1080；移动为 320×568、375×667、390×844、430×932。PC-D2 现等待用户明确批准进入 PC-D3，不得自行开始。

- 上一轮特殊事件卡片让 `small` 自动落入 `24px / 内容 / 18px` Grid 的箭头窄列，造成近似一字一行。R1 在桌面层明确固定编号、标题、箭头、说明、效果预览和概率的行列；说明／效果／概率均为 `grid-column: 2 / -1`，有效字号为 12px，未隐藏任何内容。
- `CreationScreen` 的 DOM 顺序为“主位置标题 → 球场 → 当前位置详情 → 副位置标题 → 副位置选项 → 说明 → 操作”。R1 只用 CSS Grid 将详情、副位置、说明与操作区放入右栏；DOM、屏幕阅读器顺序和键盘 Tab 顺序未重排，因此不需要 TSX 改动。1280×720 下四项权重、三个副位置和“上一步／继续”均完整可见。
- 正式隔离 App 已按 1024×768、1280×720、1366×768、1920×1080、320×568、375×667、390×844、430×932 复测 12 个 D2 phase，共 96 个样本：全部为 `clientWidth === scrollWidth`、控制台 `error=0 / warn=0`；桌面 D2 有效文本最小计算字号为 12px。

| Phase | 1280×720 scrollHeight | CTA 首屏 | 分类 | 理由 |
| --- | ---: | --- | --- | --- |
| HOME | 720 | 是 | FIT | 品牌、标题、操作与原则完整可见。 |
| CREATE_IDENTITY | 720 | 是 | FIT | 固定字段与继续按钮完整可见。 |
| CREATE_POSITION | 766 | 是 | FIT | 仅有 46px 自然页面收尾；球场、当前位置详情、四项权重、三个副位置和操作完整可见。 |
| CREATE_PRIORITIES | 720 | 是 | FIT | 四项排序与操作完整可见。 |
| CREATE_PREFERENCES | 720 | 是 | FIT | 偏好字段、联赛名称和生成按钮完整可见。 |
| PLAYER_REVEAL | 720 | 是 | FIT | 身份、能力与两项正式操作完整可见。 |
| ACADEMY_OFFERS | 997 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 三家并排、五项对比字段、选择和确认区均完整；高度来自真实对比信息而非局部滚动或空白。 |
| ARRIVAL_EVENT | 840 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 四项到队选择及其完整说明保留。 |
| HALF_YEAR_PLAN | 843 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 六项训练、职业策略／效果与主操作完整；仅整体页面纵向滚动。 |
| SIMULATION_READY | 843 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 与计划页相同的信息量；禁用态完整可见。 |
| SPECIAL_EVENT | 750 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 长剧情说明按中文自然换行；两步选择完整、无一字一行。 |
| SPECIAL_EVENT_RESULT | 750 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 结果文本、概率与继续操作完整，保留自然内容高度。 |

- R1 审核图：`/tmp/pc-d2-r1-position-1280x720.png`、`/tmp/pc-d2-r1-special-event-1280x720.png`、`/tmp/pc-d2-r1-special-event-1920x1080.png`、`/tmp/pc-d2-r1-academy-offers-1280x720.png`、`/tmp/pc-d2-r1-training-plan-1280x720.png` 与 `/tmp/pc-d2-r1-before-after.png`。它们只供视觉审核，不进入 Git。

### 16.9 PC-D3 正式页面承载与分类（用户视觉审核通过，`READY_TO_COMMIT`）

- 生产改动仅位于 `src/styles/desktop.css` 的 `@media (min-width: 821px)` 及其低高度补充规则；没有修改 Screen、GameState、存档、模拟、合同／转会规则、手机断点或 D4 专属页面。
- 用户视觉审核确认：长半年报告和多报价转会的纵向滚动来自完整真实信息量，属于允许的整页滚动；合同与固定阶段页已经消除浪费性溢出。
- 半年报告采用主栏约 62%／侧栏约 38% 的可收缩 Grid：比赛数据与能力变化保留在左侧，国家队、故事、状态关系、财务和合同兑现保留在右侧；数据字号为 28–34px，属性、荣誉、合同与变化等有效信息均不低于 12px。荣誉改为两列网格，单项和空状态跨整行，名称自然换行而不省略。
- 职业合同保留五项条款、三项反报价与原有动作；金额、角色、年限与说明解除 ellipsis／隐藏裁切，允许自然换行。转会继续直接比较报价，不新增 Detail Panel、Tab、分页、横向列表或局部滚动；环境和训练条件文本不使用 ellipsis。
- 隔离长内容样本验证了 0／1／2／3 项荣誉的空状态、单项跨行、两列与自动换行；一、二、三份正式报价均保持直接比较，三报价样本在 1280×720 下为 929px 的自然整体页面滚动，长训练条件与 `€1,970,000`／`€950,000` 均未裁切。
- 阶段完成页仅收紧其内部数字、数据行和间距；核心数据横向排列，操作、流程和 DOM／Tab 顺序不变。

| Phase | 1280×720 scrollHeight | CTA 首屏 | 分类 | 理由 |
| --- | ---: | --- | --- | --- |
| HALF_YEAR_REPORT | 1286 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 报告含完整能力、关系、财务与可能的荣誉／国家队／事件信息；无局部滚动、无固定 Footer 遮挡。 |
| CAREER_DASHBOARD | 720 | 是 | FIT | 阶段总结、核心数据和继续动作完整可见。 |
| PRO_CONTRACT_OFFER | 748 | 是 | FIT | 五项条款、反报价、金额说明和签约动作均在首屏可达；仅保留页面自然收尾。 |
| PRO_CONTRACT_COMPLETE | 735 | 是 | FIT | 签约结果、条款与开始职业生涯动作均在首屏可达。 |
| PRO_STAGE_COMPLETE | 720 | 是 | FIT | 职业阶段数据、下一步与复查动作完整可见。 |
| TRANSFER_WINDOW | 929 | 否，可整体滚动到达 | ACCEPTABLE_SCROLL | 报价比较、长俱乐部和环境条件保留完整；多报价属于真实信息量。 |
| TRANSFER_ARRIVAL | 720 | 是 | FIT | 四项融入选择和说明完整可见。 |
| TRANSFER_STAGE_COMPLETE | 720 | 是 | FIT | 新合同、角色、融入和继续动作完整可见。 |

- 指定 8 个视口（1024×768、1280×720、1366×768、1920×1080、320×568、375×667、390×844、430×932）共 64 个正式 D3 样本均为 `clientWidth === scrollWidth`，控制台 `error=0 / warn=0`。桌面 D3 有效信息最小计算字号为 12px；手机未继承桌面规则，仍保持既有自然整体纵向滚动。
- 审核图：`/tmp/pc-d3-report-1280x720.png`、`/tmp/pc-d3-report-long-1280x720.png`、`/tmp/pc-d3-contract-offer-1280x720.png`、`/tmp/pc-d3-contract-complete-1280x720.png`、`/tmp/pc-d3-transfer-one-offer-1280x720.png`、`/tmp/pc-d3-transfer-three-offers-1280x720.png`、`/tmp/pc-d3-stage-complete-1280x720.png`、`/tmp/pc-d3-1920x1080.png` 与 `/tmp/pc-d3-before-after.png`。它们只供视觉审核，不进入 Git。

### 16.10 PC-D4 正式页面、主题矩阵与退休边界（`WAITING_VISUAL_REVIEW`）

- 生产改动仍限定在 `src/styles/desktop.css` 的桌面媒体条件与相应静态回归；未回改 D1—D3，未修改 Screen 结构、GameState、存档、流程、主题 Token、队徽、奖杯或退休 PNG 几何。
- 8 个精确视口（1024×768、1280×720、1366×768、1920×1080、320×568、375×667、390×844、430×932）对球员、短／长履历、设置、退休决定及短／32 家退休档案均为 `clientWidth === scrollWidth`，console `error=0 / warn=0`。长内容仅使用自然整页纵向滚动。PC-D4-R1 的可见文本扫描另外记录了既有辅助文字的最小计算字号：Player／History／Settings 为 10.8333px，退休档案桌面为 9px、390px 为 7px；本次仅纠正审核截图，未以 CSS 缩小或隐藏内容来改变这些既有辅助信息。

| 页面样本 | 1280×720 scrollHeight | CTA 首屏 | 分类 | 理由 |
| --- | ---: | --- | --- | --- |
| PLAYER | 720 | 是 | FIT | 球员总览、能力、状态和一线队信息在桌面承载内完整可读。 |
| HISTORY_SHORT | 720 | 是 | FIT | 短履历时间线、俱乐部汇总、国家队与荣誉区保持完整。 |
| HISTORY_LONG | 3069 | 否，可整页滚动到达 | ACCEPTABLE_SCROLL | 16 个完整赛季、32 家俱乐部的真实长履历；没有局部滚动或名称 ellipsis。 |
| SETTINGS | 720 | 是 | FIT | 设置、说明与危险操作区在有限内容状态下完整可达。 |
| RETIREMENT_DECISION | 720 | 是 | FIT | 当前俱乐部主题下的继续／确认决定均保留既有动作与可见焦点。 |
| CAREER_RETIRED_SHORT | 1458 | 否，可整页滚动到达 | ACCEPTABLE_SCROLL | 固定退休档案结构与生涯摘要完整保留。 |
| CAREER_RETIRED_LONG | 3096 | 否，可整页滚动到达 | ACCEPTABLE_SCROLL | 32 家俱乐部、荣誉与档案信息的真实增长内容。 |

- 14 套生产 preset 由 `CLUB_THEME_PRESET_KEYS` 与生产 canonical 映射实际取样：在 1280×720 下，`PlayerScreen`、`CareerHistoryScreen`、`SettingsScreen` 共 42 个正式 AppShell 页面样本全部命中预期 `data-club-theme`，无 `DEFAULT`、无旧主题延迟，标题／正文／按钮／边线均可读，导航 active 与 `aria-current="page"` 正确；导航前后 GameState 指纹不变，console `error=0 / warn=0`。
- 390×844 对 `BLACK_WHITE`、`BLUE_BLACK`、`GREEN_YELLOW`、`RED_GOLD` 的三页面共 12 个正式样本复核通过：底部四项导航完整，浅色 BLACK_WHITE 承载面、深色 BLUE_BLACK 导航、GREEN_YELLOW 浅纸面文字及 RED_GOLD 的正文／强调分工均保持可读；无固定绿色文字污染、无标题／按钮／长名称裁切。
- 长履历专项正式挂载 `CareerHistoryScreen`：32 条半年记录聚合为 16 个完整赛季，32 家俱乐部汇总存在；兼容 ID 同队不显示假转会，跨俱乐部赛季统计合并且未完成夏季不显示。
- 32 家退休档案中队徽为 `asset=32`、`fallback=0`。退休决定仍使用当前俱乐部主题；确认退休后退出 `.app-frame` 并保持固定绿金档案。"回到初始界面"只清除内存展示，`hasSave` 仍为 true，首页“继续生涯”恢复同一 `CAREER_RETIRED` 档案。
- 正式按钮链路生成的退休预览为单张图片、`role="dialog"`、`aria-modal="true"`，可关闭并再次生成。正式 Blob 保存为 `/tmp/pc-d4-retirement-audit.png`：2112×5676、11,987,712 像素、1,346,618 bytes，Sharp 完整 RGBA 解码为 47,950,848 bytes，jsQR 为 `https://footballcareer.zyrobbie.site/`。品牌 Logo、队徽、荣誉、标签、二维码、边框与页脚完整；二维码后保持现有约 28 CSS px 收尾，无大块白边或深绿边。
- 已执行完整工程链：`generate:clubs:check`、`verify:retirement-qr`、桌面静态测试、全量测试（57 文件／379 项）、typecheck、build 与 audit 均通过；构建只有既有 chunk 大小提示，audit 为 0 vulnerabilities。临时入口、服务、桥接器和浏览器标签均已清理；`/tmp/pc-d4-*.png` 与正式审核 PNG 仅保留于 `/tmp`。

### 16.11 PC-D4-R1 审核证据纠正（`WAITING_VISUAL_REVIEW`）

- 原 `/tmp/pc-d4-*.png` 的 1280 图将约 640 CSS px 的页面画面写入 1280×720 位图，右侧出现大面积深绿；长履历又被当作 full-page 画面保存，退休档案的 full-page 捕获出现重复／断片。它们不再作为视觉审核证据。该问题来自旧临时浏览器捕获上下文，不是生产 CSS 的半屏回归。
- 干净隔离上下文中，固定 1280×720、无浏览器缩放：`window.innerWidth=1280`、`innerHeight=720`、`documentElement.clientWidth=scrollWidth=1280`、`visualViewport.width=1280`、`visualViewport.height=720`、`visualViewport.scale=1`。Player／History／Settings 的 `.app-frame` rect 均为 `left=0, right=1280, width=1280`，`.app-surface` 为 `left=186, right=1280, width=1094`；祖先 `transform=none`、`zoom=1`，没有 scale 或额外 zoom。
- 退休档案不使用 `.app-frame`：32 家长档案 `.retirement-archive` 为 `left=0, right=1280, width=1280, height=3020.25`，`.retirement-export-sheet` 为 `left=24, right=1256, width=1232`，操作区为 `left=50, right=1230, width=1180`。390×844 下 archive／sheet 均为 `0–390px`；无横向溢出。
- 新审核图均为固定真实视口的单帧 PNG，而非 full-page 缩放或拼接：`/tmp/pc-d4-r1-player-1280x720.png`、`/tmp/pc-d4-r1-history-short-1280x720.png`、`/tmp/pc-d4-r1-settings-1280x720.png`、`/tmp/pc-d4-r1-retirement-decision-1280x720.png`、`/tmp/pc-d4-r1-retirement-archive-top-1280x720.png`、`/tmp/pc-d4-r1-retirement-archive-top-390x844.png`。长履历与长退休档案各用 top／middle／bottom 三个真实 1280×720 视口段：`/tmp/pc-d4-r1-history-long-{top,middle,bottom}-1280x720.png`、`/tmp/pc-d4-r1-retirement-archive-{top,middle,bottom}-1280x720.png`；各段 `scale=1`、无重复断片。
- `/tmp/pc-d4-r1-before-after.png` 保留旧失效画面与新的同尺寸 1280×720 单帧画面，专门说明旧捕获为何不可作为视觉通过证据；它不是对生产 CSS 改动的对比，因为 R1 未修改生产 CSS、TS、TSX 或测试。
- 本轮不重做已通过的主题矩阵、长履历逻辑、正式 PNG、Sharp/jsQR、队徽、返回首页或完整工程链。临时入口和服务在本节完成后清理，状态仍为 `PC-D4 / WAITING_VISUAL_REVIEW`。

### 16.12 PC-D4-R2 有效信息最小字号返修（用户视觉审核通过，`READY_TO_COMMIT`）

- R1 的实际节点审计确认：Player／History／Settings 页面副标题 `<small>` 为 `10.8333px`；退休决定的 `p.decision-kicker`、说明文字与两项决定按钮在 390px 为 `10px`；退休档案中的统计、俱乐部、国家队、荣誉、标签、天赋、页脚与二维码附近说明，桌面为 `9–11px`、390px 为 `6–11px`。这些均是用户需要阅读、理解或比较的有效信息，不属于装饰。
- 修复严格限定在 D4 选择器：桌面信息字号规则位于 `src/styles/desktop.css` 的 `@media (min-width: 821px)`；移动端只补充 Player／History／Settings 标题 `<small>`、退休决定的精确嵌套说明／按钮选择器，以及 `.retirement-archive` 内已列出的有效信息选择器。没有扩大为全局 `small`、`button` 或 `p`，没有使用 `zoom`、`transform`、省略号、隐藏或固定高度裁切。
- 修复后所有审计页面的最小有效信息字号均为 `12px`。中文多行的本轮目标元素设为 `line-height: 1.35`（例如 390px 下退休决定 kicker、说明与两个按钮均为 `12px / 16.2px`）；长档案仅自然增加整页高度，不新增分页、Tab、局部滚动或折叠。

| 页面样本 | 1280×720 scrollHeight | CTA 首屏 | 分类 | R2 结论 |
| --- | ---: | --- | --- | --- |
| PLAYER | 720 | 是 | FIT | 副标题、字段标签和值均至少 12px。 |
| HISTORY_SHORT | 720 | 是 | FIT | 完整赛季时间线及汇总辅助信息均至少 12px。 |
| HISTORY_LONG | 3069 | 否，可整页滚动到达 | ACCEPTABLE_SCROLL | 16 个完整赛季与 32 家俱乐部的真实增长内容；无横向溢出或有效名称 ellipsis。 |
| SETTINGS | 720 | 是 | FIT | 说明、版本／存档信息与危险操作说明均至少 12px。 |
| RETIREMENT_DECISION | 720 | 是 | FIT | kicker、说明和“我还想继续踢”／“就此退役”均为 12px 以上。 |
| CAREER_RETIRED_SHORT | 1509 | 否，可整页滚动到达 | ACCEPTABLE_SCROLL | 固定档案的真实信息全部至少 12px。 |
| CAREER_RETIRED_LONG | 3379 | 否，可整页滚动到达 | ACCEPTABLE_SCROLL | 32 家俱乐部档案、荣誉、标签与页脚完整；无浪费性溢出。 |

- 复核视口为 1024×768、1280×720、1366×768、1920×1080 与 390×844；所有样本 `clientWidth === scrollWidth`、console `error=0 / warn=0`、无重叠、一字一行、非预期 ellipsis 或只读导航导致的 GameState 改写。R2 审核图均为真实单帧视口 PNG：`/tmp/pc-d4-r2-player-1280x720.png`、`/tmp/pc-d4-r2-history-short-1280x720.png`、`/tmp/pc-d4-r2-history-long-{top,middle,bottom}-1280x720.png`、`/tmp/pc-d4-r2-settings-1280x720.png`、`/tmp/pc-d4-r2-retirement-decision-1280x720.png`、`/tmp/pc-d4-r2-retirement-archive-{top,middle,bottom}-1280x720.png` 与 `/tmp/pc-d4-r2-retirement-archive-390x844.png`。
- 因退休档案属于 `.retirement-export-sheet`，已重新走正式“保存我的职业生涯”按钮链路。预览为单张 `blob:` 图片、`role="dialog"`、`aria-modal="true"`，关闭后第二次生成仍成功。原始 Blob 由临时仅本机 bridge 无重编码保存为 `/tmp/pc-d4-r2-retirement-audit.png`：`1640×7307`、`11,983,480` 像素、`1,219,863 bytes`、Sharp RGBA `47,933,920 bytes`、jsQR 为 `https://footballcareer.zyrobbie.site/`。源导出宽度为 1180 CSS px，现有像素预算自动采用 `1.39` scale；二维码、品牌 Logo、32 枚队徽、荣誉、页脚与末项完整，二维码之后仍采用正式 `28px` 几何收尾，无大块白边或深绿边。
- 14 套生产主题在 1280×720 的 Player／History／Settings 共 42 个正式 AppShell 样本，以及 BLACK_WHITE、BLUE_BLACK、GREEN_YELLOW、RED_GOLD 在 390×844 的 12 个边界样本，均命中预期非 DEFAULT 主题、无横向溢出、无 console error/warn，导航 active／`aria-current` 正确且往返前后 GameState 指纹不变。完整工程链已重新执行并通过：`generate:clubs:check`、`verify:retirement-qr`、样式／退休导出定向测试（5 文件／40 项）、全量测试（57 文件／382 项）、typecheck、build 与 `npm audit --omit=dev`（0 vulnerabilities）；build 仅保留既有 chunk 大小提示。
- 临时入口、bridge、服务和浏览器标签已清理。用户已通过 PC-D4-R2 视觉审核，状态更新为 `PC-D4 / READY_TO_COMMIT`；D1–D4 阶段通过不等同于整个 PC 专项完成，仍不进入 PC-QA，下一步必须等待用户明确批准。

### 16.13 PC-QA 初始矩阵与 R1 阻塞（`WAITING_QA`）

- PC-QA 已获授权并开始使用隔离 origin、真实 `App`、`createCopyAuditGame()`／`validateGameState()` 的合法状态，对 22 个正式 phase × 8 个指定视口执行初始 DOM 扫描。176 个样本均无页面级横向溢出，Browser 实际 console `error=0 / warn=0`；但信息完整性扫描发现生产缺陷，不能将矩阵记为通过。
- 可复现失败：`PLAYER_REVEAL`，`320×568`，正式 `PlayerRevealScreen` 的 `.reveal-meta` 第四项。`dt`“留洋倾向”计算宽度为 `29px / scrollWidth 36px`，`dd`“条件合适时留洋”为 `51.55px / scrollWidth 63px`；两者命中移动端 `.reveal-meta dt, .reveal-meta dd { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`，截图中可见“留洋意…”与“条件合适…”。这两项属于玩家需理解的偏好信息，不是装饰。
- 证据：`/tmp/pc-qa-blocker-player-reveal-320x568.png`。页面根为 `0–320px`、`scrollWidth=clientWidth=320px`，因此问题不是横向溢出，而是有效文本被内部 ellipsis 隐藏。
- PC-QA-R1 已在授权范围内完成：移动 `.reveal-meta div` 由 `9px` 提升为 `12px / 1.35`；`.reveal-meta dt/dd` 改为 `min-width: 0`、`overflow: visible`、`text-overflow: clip`、`white-space: normal`。八个指定视口均无横向溢出，320px 的“留洋倾向”与“条件合适时留洋”均完整显示，计算样式为 `12px / 16.2px`，无 ellipsis；对应静态 4 文件／19 项与 typecheck、`git diff --check` 通过。
- 但按最终代码重新执行 22 phase × 8 个精确视口的 176 个正式 App 样本后，页面级横向溢出为 0、console `error=0 / warn=0`，仍发现新的真实裁切，不能继续 PC-QA：`CREATE_PREFERENCES` 的 320px／375px 偏好说明 `small` 被 `overflow: hidden` 的固定 20px 高度截断（例如“联赛、出场机会和合同都合适，我才会考虑出发。”，`84×20px` 容器、`scrollHeight=30px`）；320px 的 `ACADEMY_OFFERS`、`ARRIVAL_EVENT`、`HALF_YEAR_PLAN`、`SPECIAL_EVENT`、`SPECIAL_EVENT_RESULT`、`SIMULATION_READY`、`HALF_YEAR_REPORT`、`CAREER_DASHBOARD`、`PRO_CONTRACT_OFFER`、`PRO_CONTRACT_COMPLETE`、`PRO_STAGE_COMPLETE`、`TRANSFER_WINDOW`、`TRANSFER_ARRIVAL`、`TRANSFER_STAGE_COMPLETE`、`RETIREMENT_DECISION` 均将当前俱乐部摘要压入 `.career-ledger__club` 的 `47px` 宽 ellipsis（如“武汉江城”显示宽度 `47px / scrollWidth 59px`）。部分 320px 流程引导文字也以 `overflow: hidden` 固定高度截断。
- 这些均为玩家需要阅读的真实信息，不属于本轮唯一授权的 Player Reveal 选择器。按 PC-QA 停止规则，不运行主题终审、正式 PNG 或完整工程链，不再修改生产 CSS。本阶段回到 `PC-QA / WAITING_QA`，等待用户明确批准下一轮最小修复范围。辅助证据：`/tmp/pc-qa-r1-create-position-320x568.png`、`/tmp/pc-qa-r1-create-priorities-320x568.png`；Player Reveal 修复审核图保留于 `/tmp/pc-qa-r1-player-reveal-{320x568,390x844,1280x720}.png`。

### 16.14 PC-QA-R2 三类移动裁切返修与新阻塞（`WAITING_QA`）

- 已在 `max-width:720px` 的精确选择器中修复三类已授权问题：`CREATE_PREFERENCES` 的 `.preference-editor .select-row small` 取消固定截断并改为 `12px / 16.2px` 自然换行；`.career-ledger__club` 取消 ellipsis，允许完整俱乐部名自然换行；流程 `.career-panel-lead` 取消固定高度裁切，且 `transfer`／`special-event` 的高特异性规则也固定为 `12px / 16.2px` 和 `overflow-wrap:anywhere`。Player Reveal R1 的 `.reveal-meta` 规则保持不变。
- 定点实测覆盖四个移动和四个桌面指定视口，以及 200 个命中节点样本：偏好说明、15 个职业 phase 的当前俱乐部名、8 个 phase 的流程引导说明和 Player Reveal 元数据均完整显示；目标节点没有 ellipsis、hidden 截断或 nowrap，页面均为 `clientWidth === scrollWidth`、console `error=0 / warn=0`。定点图保留于 `/tmp/pc-qa-r2-preferences-320x568.png`、`/tmp/pc-qa-r2-preferences-390x844.png`、`/tmp/pc-qa-r2-player-reveal-320x568.png`、`/tmp/pc-qa-r2-career-ledger-320x568.png`、`/tmp/pc-qa-r2-flow-guidance-320x568.png` 与 `/tmp/pc-qa-r2-affected-pages-1280x720.png`。
- 从返修后最终代码重新扫描 22 个正式 phase × 8 个视口（176）以及 Player／History／Settings × 8 个视口（24），共 200 个正式样本：页面级横向溢出、实际文字宽高裁切和 console error/warn 均为 0。14 套主题的 Player／History／Settings 桌面矩阵为 42/42，四套边界主题移动矩阵为 12/12，均不命中 DEFAULT，导航不改写 GameState。
- 正式 `RetirementScreen → 保存我的职业生涯 → RetirementRecordExportActions` 链路重新生成 32 家档案预览；单张 `blob:` 图、`role="dialog"`、`aria-modal="true"`、asset=32、fallback=0。原始 Blob 经仅本机 bridge 无重编码保存为 `/tmp/pc-qa-r2-retirement-audit.png`：`1640×7307`、11,983,480 像素、1,219,863 bytes、Sharp RGBA 47,933,920 bytes，jsQR 为 `https://footballcareer.zyrobbie.site/`；品牌、队徽、二维码、页脚和约 28px 收尾完整。
- 但完整有效信息字体审计发现第四类范围外问题：320×568 的 CareerHub `.career-ledger th, td` 均为 `9px / normal`，并使用 `overflow:hidden`、`text-overflow:ellipsis` 和 `white-space:nowrap`。这些单元承载阶段、年龄、俱乐部、队伍、角色、能力、出场、进球和助攻，属于真实可比较信息，不能视为装饰。虽然本次样本未发生 scrollWidth 溢出，9px 与隐藏策略不符合最终有效信息口径；该问题不属于 R2 已授权的三类节点，故不继续扩大 CSS 修改。
- 已执行定向 14 文件／73 项测试、全量 57 文件／384 项、typecheck、build、`generate:clubs:check`、`verify:retirement-qr` 和 audit（0 vulnerabilities）；build 仅保留既有 chunk 大小提示。PC-QA 保持 `WAITING_QA`，等待用户授权处理 CareerHub 表格有效信息，不能进入最终视觉审核。

### 16.15 PC-QA-R3 最近履历移动端重排与新阻塞（`WAITING_QA`）

- 已只在 `max-width:720px` 内保留原始 `<table>`／`<thead>`／`<tbody>`／`<tr>` 和九个字段的 DOM 顺序，把 CareerHub 最近履历重排为同一 `tr` 的三行三列：阶段／年龄／俱乐部、队伍／角色／能力、出场／进球／助攻。每个 `th/td` 为 `12px / 16.2px`、`min-width:0`、`overflow:visible`、`text-overflow:clip`、`white-space:normal`；桌面仍为单行九列表格。
- 使用正式 App 与合法 `createCopyAuditGame()` 状态覆盖 ACADEMY_OFFERS、ARRIVAL_EVENT、HALF_YEAR_PLAN、SPECIAL_EVENT、HALF_YEAR_REPORT、PRO_CONTRACT_OFFER、TRANSFER_WINDOW、RETIREMENT_DECISION 八个 CareerHub phase，以及 320×568、375×667、390×844、430×932、1024×768、1280×720、1366×768、1920×1080 八个精确视口，共 64 个样本：移动 32 个和桌面回归 32 个均为 `clientWidth === scrollWidth`、console `error=0 / warn=0`。移动展开 8 段履历后页面从 `1010px` 自然增长至 `1601px`，`.career-ledger__scroll` 为 `max-height:none / overflow:visible`，没有局部滚动。审核图：`/tmp/pc-qa-r3-ledger-320x568.png`、`/tmp/pc-qa-r3-ledger-expanded-320x568.png`、`/tmp/pc-qa-r3-ledger-390x844.png`、`/tmp/pc-qa-r3-ledger-1280x720.png`。
- 但恢复最终 PC-QA 的有效信息扫描在 320×568 正式 HALF_YEAR_REPORT 发现新的、未授权的独立问题，不能继续：比赛统计标签（出场、首发、进球、助攻、平均评分）为 `9px / normal`；能力表标题／数值／变化为 `10–11px / normal`；状态、财务和一线队信息为 `8–11px`。其中财务标签与金额（例如“青训津贴”“+€3,000”“可支配现金”）还使用 `overflow:hidden + text-overflow:ellipsis + white-space:nowrap`。这些是玩家需要比较的真实报告信息，不属于 R3 仅授权的 CareerHub 最近履历选择器，故停止，不运行后续完整矩阵、PNG 或工程链。

### 16.16 PC-QA-R4 半年报告移动端封闭返修与桌面范围外阻塞（`WAITING_QA`）

- R4 在正式 `HalfYearReportScreen`、合法 `validateGameState()` 状态下，覆盖比赛统计、能力变化、进展说明、状态／关系、财务、合同兑现、一线队、国家队、赛季荣誉、事件后果、伤病和页脚。移动端报告从“压缩仪表盘”恢复为可自然增长的阅读页：相关有效节点统一为至少 `12px / 1.35`，财务、合同、国家队、一线队与页脚取消 `ellipsis`、`hidden`、`nowrap` 和 line-clamp；没有新增局部滚动、Tab 或内容隐藏。
- 富内容正式报告（3 项荣誉、国家队、合同、事件后果和伤病）在 320×568、375×667、390×844、430×932 均为 `clientWidth === scrollWidth`，可见有效节点最小字号 `12px`，没有 ellipsis／hidden／nowrap／line-clamp 或实际宽高裁切；页面高度自然增长为 2651、2586、2544、2542px，CTA 可经整页滚动到达，console `error=0 / warn=0`。审核单帧保留于 `/tmp/pc-qa-r4-report-320-{top,middle,bottom}.png` 与 `/tmp/pc-qa-r4-report-390-top.png`。
- 在准备恢复全链的 1280×720 正式报告复核中，发现既有桌面 D3 规则仍让真实事件与合同信息低于最终有效信息口径：`.special-event-result strong/span` 为 `10px / normal`，`.special-event-result p` 与 `.consequence-result p` 为 `9px / 13.05px`；`.contract-window-report dt` 为 `10px / normal`，`dd` 仍为 `overflow:hidden + text-overflow:ellipsis + white-space:nowrap`。例如“青年队 · 核心”在 82px 单元内发生真实截断。该缺陷位于半年报告但属于桌面 CSS，超出 R4 “仅移动端 main.css”授权。
- 因此不把 R4 移动通过伪装为完整 PC-QA 通过：未继续执行新的 200 样本、主题矩阵、退休 PNG 或完整工程链；PC-QA 回到 `WAITING_QA`，等待用户是否授权桌面半年报告最小修复。临时入口、浏览器标签与 4217 服务已清理；本轮没有读取或触碰 `outputs/`。

### 16.17 PC-QA-R5 半年报告桌面信息完整性与最终终审（`READY_TO_COMMIT`）

- 正式 `HALF_YEAR_REPORT` 的桌面封闭审计确认原问题均来自报告内部压缩规则：`.special-event-result strong/span` 为 `10px`、事件与后果正文为 `9px / 13.05px`、`.contract-window-report dt` 为 `10px`，合同 `dd` 以 `overflow:hidden + text-overflow:ellipsis + white-space:nowrap` 隐藏“青年队 · 核心”等真实信息。R5 仅在 `src/styles/desktop.css` 的 `@media (min-width:821px)` 内新增 `.career-report ...` 高特异性规则：所有报告有效节点设为至少 `12px / 1.35`，合同字段可自然换行，移除有效信息的 hidden／ellipsis／nowrap；未触碰移动端、数据、字段顺序、结算或流程。
- 以正式 `HalfYearReportScreen`、`validateGameState()` 合法状态覆盖 basic 与富内容（0／1／2／3 项荣誉、国家队、合同兑现、一线队、事件后果、伤病和长说明）共 40 个报告组合×精确视口样本。320／375／390／430／1024／1280／1366／1920px 全部 `clientWidth === scrollWidth`；最小有效字体为 `12px`、最小行高比为 `1.35`，有效节点实际 ellipsis／hidden／nowrap／line-clamp 裁切为 0，CTA 均可经整页自然滚动到达，console `error=0 / warn=0`。桌面富内容报告高度分别为：1024×768 `2097px`、1280×720 `1719px`、1366×768 `1691px`、1920×1080 `1728px`，均属完整真实信息的允许整页滚动。
- 最终代码重新完成 22 phase × 8 精确视口（176）与 Player／History／Settings × 8（24），共 200 个正式 App 样本：页面级横向溢出、实际有效信息裁切、console error/warn 均为 0。CSS 紧凑规则命中经逐项核对后无真实隐藏；少数 `h1` 的亚像素行盒高度差在 `overflow:visible` 下完整可见，不属于裁切。
- 14 套生产主题以生产映射代表俱乐部在 1280×720 的 Player／History／Settings 完成 42/42；BLACK_WHITE、BLUE_BLACK、GREEN_YELLOW、RED_GOLD 在 390×844 完成 12/12。均命中预期非 DEFAULT 主题，导航 active／`aria-current` 正确，往返前后 GameState 指纹不变，无横向溢出或 console 问题。32 家长履历显示 16 个完整赛季和 32 张俱乐部汇总卡，队徽 `asset=32 / fallback=0`。
- 正式 `RetirementScreen → 保存我的职业生涯 → RetirementRecordExportActions` 链路生成单张 `blob:` 预览，`role="dialog"`、`aria-modal="true"`；原始 Blob 经一次性仅本机 bridge 无重编码保存为 `/tmp/pc-qa-r5-retirement-audit.png`，bridge bytes 与 Blob.size 均为 `1,219,863`。Sharp 为 `1640×7307`、`11,983,480` 像素、RGBA `47,933,920 bytes`，低于 12,000,000 预算；jsQR 为 `https://footballcareer.zyrobbie.site/`。品牌、32 枚队徽、荣誉、二维码、边框、页脚及正式约 `28px` 收尾完整，无大块白边或深绿边。关闭预览、回到初始界面、继续生涯均正常，恢复同一退休档案。
- R5 半年报告审核单帧：`/tmp/pc-qa-r5-report-1024x768.png`、`/tmp/pc-qa-r5-report-1280-{top,middle,bottom}.png`、`/tmp/pc-qa-r5-report-1920x1080.png`；退休审核产物为 `/tmp/pc-qa-r5-retirement-audit.png`。一次性 HTML／TSX 入口、bridge、4217 服务与浏览器标签均已清理；未读取或触碰 `outputs/`。
- 最终工程链：`generate:clubs:check`、`verify:retirement-qr`、样式定向 4 文件／23 项、全量 57 文件／387 项、typecheck、build 与 `npm audit --omit=dev`（0 vulnerabilities）全部通过；build 仅报告既有 chunk 大小提示。PC-QA 与 PC-D 现为 `READY_TO_COMMIT`，但本轮没有提交、推送或部署。

## 17. 最终完成定义

只有同时满足以下条件，PC 专项才能标记为 `READY_TO_COMMIT`：

- 页面结构、信息顺序和交互逻辑没有改变；
- 没有新增 Tabs、分页、抽屉或局部详情面板；
- 固定内容的主要决策页面在 1280×720 下尽量实现一屏；
- 真实长内容页面只保留必要的正常纵向滚动；
- 所有桌面页面无横向滚动；
- 玩家有效文字可读，没有一字一行或内容裁切；
- 22 phases、三个导航查看页和退役预览完成浏览器验收；
- 14 套主题无回归；
- 四种移动视口无回归；
- 正式退役 PNG 和二维码通过；
- 完整测试、类型检查、构建、安全检查和格式检查通过；
- 用户完成最终视觉审核。

本文只定义和跟踪 PC 专项工作。具体 Terra 执行指令应在用户确认本文后另行生成。
