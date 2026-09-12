# CLR7-20260912 · 已验收并发布

七联赛50枚原SVG已接入并发布，保持全部418,454字节原稿。产品提交4fb57e2，Pages34702982241成功；[统筹发布结果](release-result.json)记录线上54资源SHA、实际操作和PNG目视。以下接入/Q证据保留交付时身份。基线HEAD `e6202a8b5a53a9c60625db81674748e766d3aff6`，package1.9.0、SAVE/DATA12/12不变。

## 精确范围与保护

- [source-map.json](source-map.json)：50源→canonical/workbook→中文名/联赛→目标路径、源/旧目标SHA及XML检查。数量NED5/POR5/BEL7/ARG10/KOR4/JPN7/BRA12。7处文件名别名与游戏ID逐一登记，不修改游戏ID。
- [candidate-manifest.json](candidate-manifest.json)：本次精确候选，不包括dist、outputs、临时图片/脚本或其他历史未跟踪文件。
- [protection.json](protection.json)：2,679份既有文件保护；仅指令、manifest和2处必要测试发生预期修改。50目标与源/冻结/dist字节一致；128非目标manifest记录原文一致。131→178记录来自3旧null转原创及47新增，不是重复追加占位。
- 未改变组件、CSS、导出器、俱乐部数据、策略玩法、store、迁移、版本或依赖。阿贾克斯改为新资产断言；乌德勒支及未知ID保留短标回退。

## 实页、真实PNG与目视

[visual-review.json](visual-review.json)逐枚记录；[viewed-images.json](viewed-images.json)列72张实际查看图的SHA；未列入的生成图不称已看。15张原像素联系图涵盖全部50枚18/24/32/48/96/128px；18张实际PNG原像素裁片及2张重叠补片覆盖50枚。七联赛桌面报价/退休与移动报价/球员/履历/退休均已目视，ARG/BRA另查320窄屏；7个导出预览及关闭入口已看。NED完整PNG总览被查看工具缩放，逐枚结论依原像素裁片。

- 七联赛均1280×720、390×844；ARG/BRA另320×568，共16条实际页面链、222次真实点击。
- 流程：恢复市场→三卡实际切换→确认签约→NONE报到→下一计划→球员/履历/生涯→展开履历→刷新恢复；再恢复退休档→滚动→真实按钮导出→关闭。
- 七份实际PNG：NED/BEL/KOR/BRA为桌面入口，POR/ARG/JPN为移动入口。路径 `/tmp/CLR7-20260912/<league>/after/<width>-export.png`。这些PNG合计含全部50枚；不是以DOM、SVG或解码成功代替PNG目视。
- 每次真实点击记录按钮中心命中和保存game/raw。签约后计划合法，history长度与cashEuro不增加，刷新恢复完整一致；导出关闭不改变退休存档。无新半年模拟。各页面标题、非空正文、错误遮罩、控制台通过。
- 非目标意甲/英超/国内/未知ID另有隔离实际ClubCrest组件探针及截图（明确不是产品路由）；正常资产3枚、短标1枚。正式页面还包含国内/意甲及未交付俱乐部回退。

输入为F-04 `pages-r2/result.json` expiry actions[3].after与Q-02 `desktop-final-raw.json`，只读复用来源，每联赛input-provenance列源SHA、完整字段差异与完整构造输入，经真实saveGame/loadGame验证。多队履历/报价是显示用构造，不称自然市场或真实球员生涯。没有访问用户profile/真实存档。

Browser plugin不可用，使用已安装Playwright的隔离Chromium、新context和本地127.0.0.1:4293；页面路由拒绝外部网络。页面脚本默认只读退出，显式`after`只写独占新目录。旧采集脚本/保护未修改。

## 工程、复跑与限制

[engineering.json](engineering.json)：定向3文件24项；最终全量75文件745项、typecheck、build均退出0。保留910.36kB主包警告（CSS130.43kB）。本批只最终跑一次全量/构建。`git diff --check`通过。

临时原始日志、冻结源、输入、截图、PNG及脚本在 `/tmp/CLR7-20260912/`；[evidence-index.json](evidence-index.json)提供路径/SHA。主要命令：`npm run test:run`、`npm run typecheck`、`npm run build`；页面复跑用 `CLR_RUN_SUFFIX=-new node /tmp/CLR7-20260912/pages.cjs after NED`（先启动独立本地4293服务，选择尚不存在后缀）。其他联赛同理。不要覆盖既有结果；发布后源码改变会触发旧保护，须重新定义验收基线。

首次服务启动`server.txt`记录沙箱EPERM，正常审批后`server-r2.txt`成功，不是产品缺陷。没有重跑已有CLR4/PSU长观察。所有临时浏览器已关闭，本批4293服务已关闭。

真实手机、微信、Safari、其他浏览器、相册保存未执行。线上由统筹另行实测：430宽隔离Chromium，七联赛混合代表、15次真实点击、保存恢复与真实PNG；不扩展为真机覆盖。保留既有小字/表格省略和正常滚动限制；不保证任意滚动位置无遮挡，不保证24px可看清全部装饰。PNG裁片边界切到的字不是实际导出缺失，重叠补片用于完整目视。原始证据已归档outputs/CLR7-20260912/，SHA见release-result；不是网站发布资源。
