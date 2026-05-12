# 动态获取车辆数据年份范围 - 总结

## 完成情况

所有任务已按计划完成并推送至 GitHub。

## 修改内容

### 1. `src/api/github.ts`

新增 `listVehicleYears` 函数，通过 GitHub Contents API 列出 `data/{vehicleId}/` 目录下的所有文件：
- 过滤出匹配 `^\d{4}\.json$` 的文件名
- 提取年份数字，按升序排序后返回 `number[]`
- 404 时返回空数组（目录不存在或车辆无数据）

### 2. `src/store/fuelStore.ts`

扩展 `FuelState` 接口与实现：
- 新增 `availableYears: number[]` 状态
- 新增 `loadAvailableYears` 方法，调用 `listVehicleYears` 并更新状态
- `clearData` 时同步清空 `availableYears`

### 3. `src/pages/Dashboard.tsx`

- 解构 `availableYears` 和 `loadAvailableYears`
- 车辆加载时自动调用 `loadAvailableYears`
- 修改"全部"快捷按钮逻辑：优先使用 `availableYears[0]` 作为起始年份；为空时回退到当前年年初

## 效果

- "全部"按钮不再固定从 2010 年开始，而是从该车辆在 GitHub 仓库中实际有数据的最早年份开始查询。
- 减少了不必要的空年份 API 请求。
- 如果车辆没有任何数据文件，回退到当前年年初，用户体验更自然。

## 提交记录

`feat-dynamic-year-range` - 5 files changed, 157 insertions(+), 4 deletions(-)
