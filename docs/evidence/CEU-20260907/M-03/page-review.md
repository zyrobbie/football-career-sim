# 实际页面检查与已查看截图

环境：`http://127.0.0.1:4187/`，独立origin；已安装Playwright 1.62.1、全新Chromium context，不使用用户profile。Browser plugin not available，因此按frontend-testing-debugging技能使用现有Playwright。任务已指定仓库证据目录，截图和脚本按用户指令放本目录。React检查采用局部state表单、事件驱动保存、共享纯校验，不增加依赖或性能重构。

流程：匿名市场/计划恢复 → 修改方向与联赛 → 取消/保存/刷新 → 只读回看并返回当前进度；导航和换生涯清除回看。

## 检查结果

| 检查 | 实测 |
| --- | --- |
| 页面身份与内容 | 独立本地URL，title含上场；两个实际页面正常显示编辑器和原内容，无空白或Vite错误遮罩 |
| 控制台 | 首轮pages.json页面error为空；补查pages-supplement-r2.json的error与warning均为空 |
| 编辑与刷新 | 4尺寸×普通市场/计划共8组：取消、未保存刷新、保存刷新、同一DOM保存按钮双击、回看返回、球员/履历/设置导航及刷新清除回看，全state相等 |
| 联赛/老将 | 4尺寸35岁训练来源：依次选意大利/德国/英格兰，第四联赛禁用；保存仅改两个player字段。换生涯清除回看，训练原卡片与公式未改 |
| 稀缺到期页面 | 1280/390两主尺寸×外部0/1/2/3共8组：原始R1 envelope直读、编辑、回看返回，current写盘data完整一致 |
| 按钮可达 | 320/390/430及1280保存、返回按钮正常滚动至视口后中心hit test均命中自身，真实点击成功 |
| 视觉限制 | 页面仍较长，原报价/报告部分小字与桌面留白保留。固定底栏在某些滚动位置覆盖内容；430首轮检查正好挡住保存按钮，正常继续滚动可完全露出并点击。未宣称任意位置无覆盖，也未顺手重做市场/报告布局 |
| 未执行 | 真实手机、Safari/Firefox、线上、旧客户端读取v12；模拟viewport不等于设备验收 |

## 已人工查看的14张截图

已查看下列原图的工具返回，判断文字换行、分组、按钮与可读性；其余自动生成图为辅助记录，不声称逐张人工验收。

- plan-320-editor.png、market-1280-editor.png：最窄列两列联赛、桌面四列联赛；保存/取消分组清晰。
- market-390-editor.png、market-320-editor.png、market-430-editor.png、plan-1280-editor.png：普通页布局与编辑器，注意全页截图会把固定底栏按截图时滚动位置嵌在中间，不代表底栏固定在该文档坐标。
- plan-390-editor.png、plan-430-editor.png：计划编辑器随宽度2/3/4列自适应，不改变训练选项。
- market-390-review.png、plan-1280-review.png：历史窗口标题正确，原摘要保持，唯一报告动作是返回当前进度。
- veteran-430-save-viewport-r2.png、veteran-320-save-viewport-r2.png：正常滚动后保存按钮完整露出，hit test通过，底栏未阻断按钮。
- veteran-390-return-viewport-r2.png：返回按钮在底栏上方，正文为旧报告，正常点击返回。
- veteran-1280-first-viewport-r2.png：已有35岁训练页结构与俱乐部主题保持，首屏延续原信息区。

36张完成运行的截图：pages.cjs的24张全页＋pages-supplement-r2.cjs的12张视口。另保留首次补查中断前10张截图，合计46张，初轮不计为完整通过。

## 主机与仪器失败保留

- dev-server.txt：沙箱监听127.0.0.1:4187被EPERM拒绝；申请扩大权限后本地服务启动成功。
- pages-initial.txt：沙箱Chromium MachPort权限拒绝，尚未进入页面，不算页面失败或通过；获权限后pages-second.txt退出0。
- pages-supplement.txt：scrollIntoViewIfNeeded认为430的按钮已在viewport，但中心被固定底栏覆盖，hit test失败。保留原截图/日志；r2按正常用户滚动把按钮移至中心，再确认自身命中和真实点击，未改生产布局或隐藏底栏。
- pages-supplement-r2.txt退出0；12补查均成功。没有删除或覆盖失败产物，没有安装额外依赖。
