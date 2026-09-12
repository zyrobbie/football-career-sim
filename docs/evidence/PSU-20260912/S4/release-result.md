# V1.9 正式发布实证

**产品V1.9已上线，最终文档已统筹审核。** CI及线上证据由统筹执行，本文件按已保存实证整理。

- 产品提交：`690de955bc69f295bce8f39cb359f0dbf2fd64ac`。
- 产品tree：`ba7858ef5fa23b14518316a5e7e68c8918437aeb`，精确141文件，与批准候选一致。
- 回退标签：`rollback/psu-v1.9-before` → `2570017bd4da05aa2c1db11b9ca4e70c98d40427`。
- 远端main已核对指向上述产品提交；本地tracked/staged无额外改动后开始此文档收口。
- [对应Pages CI](https://github.com/zyrobbie/football-career-sim/actions/runs/34701170449)：success；依赖安装、测试、构建、Pages部署步骤均成功。
- 本地与隔离候选：744项/typecheck/build通过，183运行资产一致；两个.DS_Store排除；线上index.html、主JS、CSS及html2canvas共4项HTTP200，SHA与候选一致。
- package1.9.0，SAVE/DATA12/12；893.46kB警告保留。

统筹负责正式推送、CI及线上核验；执行者仅整理此文档和隔离回退演练。早先执行者任务的审批拒绝为历史通道限制，不冒称绕过；正式发布在有用户直接确认的统筹任务中获准执行。

本地已验收范围：S3 30原raw、1562数值等价；S4统筹两条连续3半年6窗55次点击。线上结果单独计数，不累加为独特生涯种子。真实设备、微信/Safari/相册与最终全生涯平衡未测，用户亲自试用为可选且没有虚构反馈。

后续文档提交由统筹另审另推，产品结果与文档HEAD分开；回退方案保留审计文档，仅反转13个代码/package路径。

## 线上实际范围

[游戏入口](https://footballcareer.zyrobbie.site/)。统筹使用隔离Chromium、390×844和匿名预置档，完成STEADY选择→事件→报告→刷新继续→Settings：8次真实按钮点击，无控制台错误；报告重载一致，Settings显示游戏1.9.0、存档/数据12/12。3张截图均由统筹目视。这里只证明代表性线上一窗，不称所有策略、设备和完整生涯均在线通过。

证据：[正式提交](../coordinator/product-release.json)、[CI](../coordinator/pages-success.json)、[线上资产](../coordinator/online-assets.json)、[线上动作压缩结果](../coordinator/online-results.json.gz)、[截图身份与目视](../coordinator/online-screenshots.json)。本地S3与S4连续观察仍单独统计，不把引用写成执行者新增实跑。
