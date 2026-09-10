# 锁定 v11 历史工具

这里的 `src/**/*.ts.txt` 是 T-02 开始时原源码的逐字节副本，位于正常 Vitest 与 TypeScript 发现范围之外；TR-01 工具是本批在生产仍为 v11 时运行的原源码。不作为当前 v12 回归，不全局 skip，也不重写旧快照。

历史复跑必须在**另一个隔离目录**检出 `3f290407a299790665b58c4bc7c2bf8455d24bbd`，核验 T-01/production-hashes.json，再把本目录下源码去掉最后的 `.txt` 后放回其原相对路径。依赖使用锁定 package-lock.json；将 S0、S0-R1、T-01、S0-v11-supplement 的证据按原路径只读复制。不得复制当前 v12 的生产源码进去，不得在当前工作区替换源码。

在隔离目录，不带生成开关执行：

```sh
npm run test:run -- src/store/gameStore.ceuS0Baseline.test.ts src/store/gameStore.ceuT01.test.ts src/engine/__tests__/ceuTrainingBaseline.test.ts
```

以上是复跑说明，本批未另建隔离目录执行历史复跑；T-01原有和统筹复跑证据保留。生成开关在当前套件中均拒绝；历史源码自带版本、源码哈希和目录拒写保护。S0原生成已禁用，不能通过删除证据来重新开放。

TR-01 的 `ceuConstructV11.test.ts.txt` 只可在锁定 v11 隔离副本、新的不存在的 T-02/constructed-v11 目录运行：

```sh
npm run test:run -- src/persistence/__tests__/ceuConstructV11.test.ts
```

该工具克隆 READY 原生 envelope，只改 manifest 指明的状态/旧focus，并按原 FNV-1a checksum 算法重新编码；没有调用 saveGame 生成来源。目录创建与所有文件写入均独占，第二次会拒绝。当前已冻结四份构造输入；本工作区不得再运行它。当前迁移测试直接读取这四份输入，不调用此生成器。
