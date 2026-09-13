# ASTRA-KMM-P1R1：最终候选待统筹复核

package/lock2.5.0，SAVE/DATA13/13；只加“当时”短标签，40目录与选择/模拟/保存规则不变。HEAD仍`7421b442983d27bc17f535cf741a7f065b1ee87e`。未stage、提交、打tag、推送或部署。

- [最终100文件清单](release-files-final.json)、[逐路径列表](release-paths.txt)、[候选位置](candidate-location.json)、[候选完整身份](candidate-final.json)。含48默认测试输入，非全量打包脏工作区。
- 隔离候选78文件796项、typecheck/build全部通过：clean-full/clean-typecheck/clean-build的command.json与log。复用已装node_modules，未新跑网络npm ci。963.05kB警告保留。
- [标签/版本实页](page-review.md)、[13张全部目视](screenshot-manifest.json)、[输入](page-inputs.json)、[页面归档](page-archive.json)。320/390/402真实按钮、刷新与原保存相等；设置2.5.0/13/13。
- [发布步骤与回退边界](release-and-rollback.md)、[810文件隔离回退结果](rollback-result.json)、[远端只读检查](remote-check.json)。当前main与远端仍预期基线。
- [保护](protection.json)、[新旧文件归属](release-files-final.json)、[具体变更](authorized-presentation.diff)。全部大证据保留本地，待发布只按明确清单。

P1-C已由统筹接受CDM观察线，本批不重跑300或调参数。工程与UI无新失败；三个辅助脚本问题（tarfile主机参数、中文路径转义、页面准备cwd）在生产验证前定位，保留原输出/说明，未影响共享文件。真机、其他浏览器、线上尚未执行；最终部署不能用本地验证代替。

KM-10保持进行中，状态为发布候选待统筹验收。唯一下一动作：统筹核对具体候选并下发最终提交推送口令；执行者停止，不要求用户重复授权。
