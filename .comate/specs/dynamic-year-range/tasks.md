# 动态获取车辆数据年份范围

- [ ] Task 1: 新增 GitHub API 函数列出车辆年份文件
    - 1.1: 在 `src/api/github.ts` 中新增 `listVehicleYears` 函数
    - 1.2: 使用 GitHub Contents API 获取 `data/{vehicleId}/` 目录内容
    - 1.3: 过滤 `.json` 文件并提取年份数字，升序排序后返回
    - 1.4: 404 时返回空数组，保持与现有错误处理一致

- [ ] Task 2: 扩展 FuelStore 状态和接口
    - 2.1: 在 `FuelState` 接口中新增 `availableYears: number[]` 和 `loadAvailableYears` 方法
    - 2.2: 在 store 实现中初始化 `availableYears: []`
    - 2.3: 实现 `loadAvailableYears` 方法，调用 `listVehicleYears` 并更新状态
    - 2.4: `clearData` 时同步清空 `availableYears`

- [ ] Task 3: Dashboard 联动使用最早可用年份
    - 3.1: 组件中从 `useFuelStore` 解构 `availableYears` 和 `loadAvailableYears`
    - 3.2: 在车辆加载 `useEffect` 中调用 `loadAvailableYears`
    - 3.3: 修改 `handleQuickRange('all')`，优先使用 `availableYears[0]` 作为起始年份
    - 3.4: `availableYears` 为空时回退到当前年年初

- [ ] Task 4: 构建验证与提交
    - 4.1: 运行 `npm run build` 确认无 TypeScript 错误
    - 4.2: 提交并推送代码
