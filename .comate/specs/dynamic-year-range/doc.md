# 动态获取车辆数据年份范围

## 需求背景

目前 Dashboard 的"全部"快捷按钮硬编码从 `2010-01-01` 开始查询数据。用户希望改为从 `fuel-tracker-data` 仓库中该车辆实际有数据的最早年份开始查询，即根据仓库目录 `data/{vehicleId}/` 下有哪些 `{year}.json` 文件动态确定可用年份范围。

## 需求描述

1. **动态探测可用年份**：通过 GitHub Contents API 列出 `data/{vehicleId}/` 目录下的所有文件，提取文件名中的年份数字，按升序排序。
2. **fuelStore 状态扩展**：在 Zustand store 中新增 `availableYears` 状态和 `loadAvailableYears` 方法。
3. **Dashboard 联动**：点击"全部"按钮时，如果已加载可用年份，则从最早年份的 1 月 1 日开始；否则回退到当前年（避免过度查询）。
4. **无数据兼容**：如果车辆目录不存在或没有任何年份文件，`availableYears` 为空数组，Dashboard 正常显示无数据状态。

## 技术方案

### API 层 (`src/api/github.ts`)

新增 `listVehicleYears` 函数：
- 调用 GitHub Contents API: `GET /repos/{owner}/fuel-tracker-data/contents/data/{vehicleId}`
- 返回的是文件数组，每个文件对象有 `name`（如 `"2021.json"`）和 `type`（`"file"` 或 `"dir"`）
- 过滤 `type === 'file'` 且 `name` 匹配 `/^\d{4}\.json$/` 的文件
- 提取年份数字，排序后返回 `number[]`
- 404 时返回空数组（表示目录不存在或车辆无数据）
- 保持与现有 API 一致的 401 拦截逻辑

### 状态层 (`src/store/fuelStore.ts`)

扩展 `FuelState` 接口：
```typescript
interface FuelState {
  // ... existing fields
  availableYears: number[];
  loadAvailableYears: (owner: string, vehicleId: string) => Promise<void>;
}
```

实现 `loadAvailableYears`：
- 调用 `listVehicleYears`
- 将结果写入 `availableYears`
- 不设置 `loading` 状态（避免与数据加载冲突，可单独维护）

### UI 层 (`src/pages/Dashboard.tsx`)

修改 `handleQuickRange('all')`：
- 先获取 `availableYears` 状态
- 如果数组非空，取第一个元素（最早年份），构造 `dayjs(`${earliestYear}-01-01`)`
- 如果数组为空，回退到 `dayjs().startOf('year')`（当前年年初），避免查询大量空年份
- 首次加载车辆时，自动调用 `loadAvailableYears`

## 数据流

```
Dashboard mount / 切换车辆
  -> fuelStore.loadAvailableYears(owner, vehicleId)
    -> github.listVehicleYears(owner, vehicleId)
      -> GitHub API GET .../contents/data/{vehicleId}
    <- 返回 [2021, 2022, 2023, 2024, 2025, 2026]
  <- 写入 availableYears

用户点击"全部"
  -> handleQuickRange('all')
    -> 取 availableYears[0] (2021)
    -> setStartDate(dayjs('2021-01-01'))
    -> setEndDate(dayjs())
  -> useEffect 触发 loadDateRange
    -> 只查询 2021~2026 年份文件
```

## 边界条件与异常处理

| 场景 | 处理 |
|---|---|
| 车辆目录不存在 | GitHub API 404，`listVehicleYears` 返回 `[]`，回退到当前年 |
| 目录存在但无 json 文件 | 过滤后返回 `[]`，回退到当前年 |
| 只有单一年份文件 | 返回 `[YYYY]`，起始和结束日期可同一年 |
| 网络错误 | 按现有 axios 拦截器处理，401 跳转登录 |
| 切换车辆 | 重新调用 `loadAvailableYears`，旧数据清空 |

## 受影响文件

| 文件 | 修改类型 | 说明 |
|---|---|---|
| `src/api/github.ts` | 新增 | 新增 `listVehicleYears` 函数 |
| `src/store/fuelStore.ts` | 修改 | 接口和实现中新增 `availableYears` 和 `loadAvailableYears` |
| `src/pages/Dashboard.tsx` | 修改 | 车辆加载时调用 `loadAvailableYears`，"全部"按钮使用最早年份 |

## 预期结果

- "全部"按钮不再固定从 2010 年开始，而是从该车辆最早有加油记录的年份开始。
- 减少不必要的空年份 API 请求。
- 用户体验更自然，尤其适用于 2021 年才开始记录数据的场景。
