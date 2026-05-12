# SHA 增量缓存优化

- [ ] Task 1: 修改 GitHub API 返回文件 SHA
    - 1.1: 在 `src/api/github.ts` 中新增 `VehicleFileInfo` 接口（`{ year: number; sha: string }`）
    - 1.2: 修改 `listVehicleYears` 返回 `Promise<VehicleFileInfo[]>`
    - 1.3: 从 GitHub 目录响应中提取 `name` 和 `sha`，映射后排序返回

- [ ] Task 2: 在 FuelStore 中实现缓存层
    - 2.1: 定义 `YearCacheEntry` 类型（`{ records: RefuelRecord[]; sha: string }`）
    - 2.2: 在 Zustand 闭包内定义内存缓存变量 `currentYearCache` 和 `currentCacheKey`
    - 2.3: 实现 `ensureCache(owner, vehicleId)`：切换车辆时从 localStorage 读取缓存
    - 2.4: 实现 `persistCache(owner, vehicleId)`：将内存缓存写入 localStorage（key 为 `fuel_cache_v2_{owner}_{vehicleId}`）
    - 2.5: `clearData` 时同步清空内存缓存和 currentCacheKey

- [ ] Task 3: 重写 `loadDateRange` 实现增量加载
    - 3.1: 方法开始时不清空 `recordsWithConsumption`（SWR 策略）
    - 3.2: 调用 `listVehicleYears` 获取远程目录及 SHA
    - 3.3: 确定目标年份范围，过滤出远程存在的年份
    - 3.4: 遍历目标年份，对比本地缓存 SHA 与远程 SHA，标记需要请求的年份
    - 3.5: 用缓存中已有的数据立即计算并渲染（避免白屏）
    - 3.6: 使用 `Promise.all` 并行请求所有标记为"需要请求"的年份文件
    - 3.7: 请求完成后更新内存缓存（records + sha），合并所有年份数据
    - 3.8: 按日期过滤排序，计算油耗后更新 `recordsWithConsumption`
    - 3.9: 调用 `persistCache` 保存到 localStorage，设置 `loading: false`

- [ ] Task 4: 写操作后清除对应年份缓存
    - 4.1: 在 `addRecord` 成功后，获取对应年份缓存并删除该年份条目，持久化
    - 4.2: 在 `updateRecord` 成功后，删除对应年份缓存条目，持久化
    - 4.3: 在 `deleteRecord` 成功后，删除对应年份缓存条目，持久化
    - 4.4: 确保 `loadAvailableYears` 从 `VehicleFileInfo[]` 正确提取 `availableYears`

- [ ] Task 5: 构建验证与提交
    - 5.1: 运行 `npm run build` 确认无 TypeScript 错误
    - 5.2: 提交并推送代码
