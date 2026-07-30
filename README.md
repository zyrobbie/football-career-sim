# 绿茵生涯

一个以合同选择、职业生涯规划、技术特点和人际关系为核心的中国球员文字生涯模拟器。

在线试玩：[https://zyrobbie.github.io/football-career-sim/](https://zyrobbie.github.io/football-career-sim/)

当前阶段：可玩的青训两年 Demo 已完成，覆盖：

> 建档 → 生成球员 → 三份青训邀请 → 入队事件 → 四个半年选择与报告 → 一线队关注与晋升评估 → 自动存档 → 读档恢复

建档完成后，所有选择都在常驻生涯主页中进行。主页持续显示球员总览、
能力与状态、关系、现金、青年队累计数据和逐窗口生涯履历。

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

Demo 到15岁晋升评估为止。第二年可以进入观察名单、成为跟训候选、获得跟训机会或正式晋升；职业合同和一线队正式比赛尚未开放。

## 文档

- [产品与规则规格](docs/01-product-spec.md)
- [数据字典](docs/02-data-dictionary.md)
- [最小 Demo 与验收标准](docs/03-mvp-acceptance.md)
- [视觉设计说明](docs/04-visual-direction.md)
- [平衡参数附录](docs/05-balance-tables.md)
- [实现验收与视觉对照](docs/06-qa-report.md)

## 开发原则

- 规则引擎、静态数据、界面和存档彼此分离。
- 页面不直接修改游戏数值，只提交玩家选择。
- 使用固定种子和模块化随机流，刷新或读档不能改变已生成结果。
- 存档只保存基础状态和历史摘要，不保存可重新计算的派生数据。
- Demo 使用完整版公式，不另写以后需要推翻的临时逻辑。
- 如果不能可靠验证，就不把脆弱原型标记为完成。
