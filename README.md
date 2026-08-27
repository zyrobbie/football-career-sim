# 绿茵生涯

一个以合同选择、职业生涯规划、技术特点和人际关系为核心的中国球员文字生涯模拟器。

在线试玩：[https://zyrobbie.github.io/football-career-sim/](https://zyrobbie.github.io/football-career-sim/)

当前正式版本为 **V1.0.0**，已完成从建档到退役的可玩生涯闭环，覆盖：

> 建档 → 生成球员与留洋偏好 → 三份青训邀请 → 入队事件 → 青训与一线队晋升 → 职业合同 → 连续职业半年 → 国内与海外转会、续约或自由转会 → 国家队与荣誉 → 退役档案 → 带二维码的生涯图片导出

建档完成后，底部／侧边四项导航均可使用：生涯负责当前选择，球员、履历与设置为只读查看页。主页持续显示当前生涯操作与核心摘要；履历使用已完成窗口的真实记录汇总。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

质量检查：

```bash
npm run typecheck
npm run test:run
npm run build
```

职业生涯可持续推进至退休。合同会根据实际晋升结果承诺青年队或一线队角色；签约后按实际球队层级模拟训练与比赛，并结算工资、合同期限和角色承诺。转会机会结合最近出场与评分评估；18岁起国内与海外俱乐部可进入正式报价。留洋意愿与最多三个偏好联赛会影响报价组成；报价与谈判结果写入存档，刷新不会重抽。

运行时目录现有 366 家俱乐部：32 家中国虚构俱乐部、334 家海外真实名称俱乐部，覆盖 19 个联赛。它们已进入训练质量、合同和转会候选流程，旧运行时 ID 仍保持兼容；不模拟完整阵容、教练名单、真实赛程或动态升降级。32 家中国虚构俱乐部均已接入本地原创 SVG 队徽；海外俱乐部目前有 8 家意甲视觉样板接入本地原创 SVG，其余 326 家继续使用文字短标。`CLUB_CREST_MANIFEST` 另保留 5 条 `assetPath: null` 的现实身份参考记录，它们不会渲染真实队徽；项目未宣称完成 334 家海外原创队徽。

## 文档

- [产品与规则规格](docs/01-product-spec.md)
- [数据字典](docs/02-data-dictionary.md)
- [最小 Demo 与验收标准](docs/03-mvp-acceptance.md)
- [视觉设计说明](docs/04-visual-direction.md)
- [平衡参数附录](docs/05-balance-tables.md)
- [实现验收与视觉对照](docs/06-qa-report.md)
- [视觉升级实时路线图](docs/16-visual-upgrade-roadmap.md)
- [俱乐部数据库 V1 审核](docs/07-club-database-v1-review.md)
- [俱乐部参数样例](docs/08-club-parameter-samples-v1.md)
- [俱乐部参数工作簿审核](docs/09-club-parameters-v1-review.md)
- [36 局完整生涯平衡审计](docs/10-full-career-balance-audit.md)
- [V1 正式版发布审计](docs/13-v1-release-candidate-audit.md)

## 开发原则

- 规则引擎、静态数据、界面和存档彼此分离。
- 页面不直接修改游戏数值，只提交玩家选择。
- 使用固定种子和模块化随机流，刷新或读档不能改变已生成结果。
- 存档只保存基础状态和历史摘要，不保存可重新计算的派生数据。
- Demo 使用完整版公式，不另写以后需要推翻的临时逻辑。
- 如果不能可靠验证，就不把脆弱原型标记为完成。
