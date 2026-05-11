# Fuel Tracker 移动端适配 - 完成总结

## 改动概览

### 新增文件
- `src/hooks/useMobile.ts` — 自定义 hook，监听窗口宽度判断是否为移动端（<768px），支持 resize 动态切换

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/index.css` | 添加移动端全局媒体查询：减小卡片 padding、模态框宽度、统计数值字号 |
| `src/components/Layout.tsx` | 移动端隐藏 Sider/Header，改为底部 TabBar 导航（5 个 tab），适配 iPhone 安全区域 |
| `src/pages/Dashboard.tsx` | 最近加油记录 Table → 移动端卡片列表；图表高度自适应；减小间距 |
| `src/pages/RefuelList.tsx` | Table → 移动端卡片列表；编辑 Modal 移动端全宽；Switch 垂直排列 |
| `src/pages/Vehicles.tsx` | Table → 移动端卡片列表（名称+品牌型号+操作按钮） |
| `src/pages/AddRefuel.tsx` | Switch 移动端垂直排列；保存按钮移动端全宽 block |
| `src/pages/Settings.tsx` | Descriptions 移动端 column=1 |

## 核心设计决策
- 使用 `useMobile()` hook 而非纯 CSS media query，因为需要条件渲染不同组件（Table vs Card）
- 底部 TabBar 固定定位，`paddingBottom: env(safe-area-inset-bottom)` 适配 iPhone 底部安全区域
- 移动端内容区 padding 从 24px 减为 12px
- 所有表格在移动端转为紧凑卡片，关键信息一行展示，操作按钮在右侧
