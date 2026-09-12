恢复方式：在独立2570017bd4da05aa2c1db11b9ca4e70c98d40427 checkout中 git apply tracked.patch，再复制本目录src内两份新增文件到对应位置，去掉末尾.txt。依赖沿用该HEAD；不要在当前工作树回退。S1/S2 runner及输入只读引用原路径，运行S2 balance.config.ts。
快照用.txt避免被正式Vitest自动发现；S3定向首次运行发现包装问题后仅修正扩展名，源码内容未改。
