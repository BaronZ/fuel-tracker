# SHA 增量缓存优化

## 需求背景

当前每次切换日期范围时，`loadDateRange` 会串行请求目标范围内的所有年份文件。即使数据没有变化，也会重复请求完整的文件内容，造成不必要的 API 调用和等待时间。

GitHub Contents API 在返回目录列表时，会同时返回每个文件的 `sha`（内容哈希）。利用这个特性可以实现增量缓存：
- 目录列表只需要 **1 次请求**
- 通过比对本地缓存的 SHA 与远程 SHA，只请求内容真正发生变化的年份文件
- 数据未变的年份直接从缓存读取，无需网络请求

## 需求描述

1. **API 层扩展**：`listVehicleYears` 返回年份的同时返回每个文件的 SHA。
2. **内存缓存**：在 Zustand store 内维护按年份隔离的内存缓存，切换车辆时自动切换。
3. **localStorage 持久化**：页面刷新后缓存不丢失，首次加载即可使用。
4. **SWR 加载策略**：`loadDateRange` 请求前不清空旧数据，先展示缓存内容，后台请求完成后静默替换。
5. **写操作失效**：添加/修改/删除记录后，清除对应年份的本地缓存，确保下次加载获取最新数据。

## 技术方案

### 1. API 层 (`src/api/github.ts`)

修改 `listVehicleYears` 返回类型：

```typescript
export interface VehicleFileInfo {
  year: number;
  sha: string;
}

export async function listVehicleYears(
  owner: string,
  vehicleId: string
): Promise<VehicleFileInfo[]> {
  // GET /repos/{owner}/{REPO_NAME}/contents/data/{vehicleId}
  // 返回 [{ year, sha }] 并按 year 升序排序
}
```

GitHub 目录接口返回的每个条目包含 `name` 和 `sha`，直接提取即可。

### 2. 缓存层 (`src/store/fuelStore.ts`)

**缓存数据结构**：

```typescript
interface YearCacheEntry {
  records: RefuelRecord[];
  sha: string;
}
```

**内存缓存**（Zustand 闭包内，不纳入 React state）：

```typescript
let currentYearCache: Record<number, YearCacheEntry> = {};
let currentCacheKey: string | null = null;
```

**localStorage 持久化**：

- Key: `fuel_cache_v2_{owner}_{vehicleId}`
- Value: `Record<number, YearCacheEntry>`

**缓存切换逻辑**：

```typescript
function ensureCache(owner: string, vehicleId: string): Record<number, YearCacheEntry> {
  const key = `${owner}_${vehicleId}`;
  if (currentCacheKey !== key) {
    currentCacheKey = key;
    currentYearCache = loadFromLocalStorage(key) || {};
  }
  return currentYearCache;
}
```

### 3. `loadDateRange` 重写

**新流程**：

```
开始加载
  ↓
设置 loading: true（不清空 recordsWithConsumption）
  ↓
获取内存缓存 ensureCache(owner, vehicleId)
  ↓
请求目录列表获取远程 [{year, sha}]
  ↓
确定目标年份范围（startYear ~ endYear）
  ↓
对每一年份：
  ├─ 远程存在该年份？
  │   ├─ 否 → 跳过
  │   └─ 是 → 对比本地缓存 SHA == 远程 SHA？
  │       ├─ 是 → 使用缓存数据，无需请求
  │       └─ 否 → 标记为需要请求
  ↓
用缓存中已有的数据立即渲染（SWR）
  ↓
并行请求所有标记为"需要请求"的年份文件
  ↓
请求完成后：
  ├─ 更新内存缓存中的对应年份（records + sha）
  ├─ 合并所有年份数据（缓存 + 新请求）
  ├─ 按日期过滤并排序
  ├─ 计算油耗后更新 recordsWithConsumption
  └─ 保存内存缓存到 localStorage
  ↓
设置 loading: false
```

### 4. 写操作后缓存失效

在 `addRecord` / `updateRecord` / `deleteRecord` 的 store 方法中，操作成功后清除对应年份的缓存条目：

```typescript
const year = parseInt(record.date.substring(0, 4));
const cache = ensureCache(owner, vehicleId);
delete cache[year];
persistCache(owner, vehicleId, cache);
```

这样下次 `loadDateRange` 加载时，会发现该年份缓存缺失（或 SHA 不匹配），自动重新请求。

### 5. `loadAvailableYears` 适配

`listVehicleYears` 返回类型从 `number[]` 变为 `VehicleFileInfo[]`，`loadAvailableYears` 提取 `year` 字段更新 `availableYears`。

## 数据流示例

### 首次加载（无缓存）

```
用户进入 Dashboard（默认今年）
  ↓
loadDateRange('2026-01-01', '2026-05-11')
  ↓
目录列表请求 → 返回 [{year: 2021, sha: 'a1'}, ..., {year: 2026, sha: 'f6'}]
  ↓
目标年份只有 2026
  ↓
缓存中无 2026 → 请求 2026.json
  ↓
存入缓存: { 2026: { records, sha: 'f6' } }
  ↓
渲染 2026 年数据
  ↓
保存到 localStorage
```

### 第二次刷新（数据未变）

```
用户刷新页面，Dashboard 默认今年
  ↓
从 localStorage 读取缓存: { 2026: { records, sha: 'f6' } }
  ↓
目录列表请求 → 返回 2026 的 sha 仍为 'f6'
  ↓
SHA 匹配 → 不请求 2026.json
  ↓
直接从缓存渲染
  ↓
loading 很快结束
```

### 点击"全部"（数据未变）

```
用户点击"全部"（范围 2021-2026）
  ↓
loadDateRange('2021-01-01', '2026-05-11')
  ↓
目录列表请求 → 6 个年份的 SHA 全部匹配缓存
  ↓
0 个文件请求
  ↓
直接从缓存合并 6 年数据并渲染
```

### 新增一条记录后

```
用户添加 2026-05-12 的记录
  ↓
addRecord 调用 API 成功
  ↓
清除 2026 年缓存
  ↓
重新加载 2026 年数据
  ↓
loadDateRange 发现 2026 缓存缺失
  ↓
请求 2026.json（新内容）
  ↓
更新缓存并渲染
```

## 边界条件与异常处理

| 场景 | 处理 |
|---|---|
| 首次加载（localStorage 无缓存） | 正常请求所有年份，请求完成后写入缓存 |
| 部分年份有缓存，部分没有 | 有缓存的用缓存，没有的请求 |
| 缓存中存在但远程已删除的年份文件 | 目录列表中无该年份，自然跳过 |
| 远程新增年份 | 目录列表中出现新年份，缓存中无该年份 → 请求新文件 |
| localStorage 读取失败（如存储空间满） | catch 异常，降级为无缓存模式 |
| 401 被拦截跳转登录 | 现有 axios 拦截器处理，缓存数据不受影响 |
| 写操作后缓存清除失败 | 记录 console.error，不影响主流程 |

## 性能对比

| 场景 | 优化前请求数 | 优化后请求数 |
|---|---|---|
| 首次加载（今年） | 2 次 | 2 次 |
| 刷新页面，今年数据未变 | 2 次 | **1 次**（仅目录） |
| 点击"全部"，6 年数据未变 | 7 次 | **1 次**（仅目录） |
| 新增 1 条记录后刷新 | 7 次 | **2 次**（目录 + 变化年份） |

## 受影响文件

| 文件 | 修改类型 | 说明 |
|---|---|---|
| `src/api/github.ts` | 修改 | `listVehicleYears` 返回 `VehicleFileInfo[]`，新增导出接口 |
| `src/store/fuelStore.ts` | 重写 | 新增缓存层、重写 `loadDateRange`、写操作后清除缓存 |
| `src/pages/Dashboard.tsx` | 无修改 | 行为不变，自动享受缓存收益 |

## 预期结果

- 页面刷新或切换日期范围时，数据未变的情况下只请求 1 次目录列表，无需等待文件内容传输。
- 用户始终先看到缓存内容（无白屏），后台静默刷新，数据变化时 UI 实时更新。
- 减少 GitHub API 调用频率，降低触发速率限制的风险。
