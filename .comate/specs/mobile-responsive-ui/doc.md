# Fuel Tracker 移动端适配

## 需求场景

当前 UI 在桌面端表现正常，但移动端存在以下问题：
1. **侧边栏布局**：Sider 在移动端折叠后不可用，缺少底部导航
2. **表格溢出**：Dashboard、RefuelList、Vehicles 中的 Table 列数多，移动端水平溢出，需横向滚动
3. **内容区 padding**：Content 区 `margin: 24, padding: 24` 在小屏幕上浪费空间
4. **表单 Switch 布局**：AddRefuel 中两个 Switch 横排，移动端显示拥挤
5. **车辆管理**：表格在移动端完全不可用

## 技术方案

### 核心思路
- 检测屏幕宽度，移动端（<768px）使用底部 TabBar 导航替代侧边栏
- 表格在移动端转为卡片列表展示
- 减小移动端的 margin/padding
- 保持 Ant Design 组件，不引入新 UI 库

### 1. Layout.tsx - 底部导航替代侧边栏

**移动端改动：**
- 隐藏 Sider 和 Header
- 底部显示 TabBar（5 个图标 + 文字）
- 内容区 padding 减小为 `padding: 12`
- 使用 `window.innerWidth` 或 CSS media query 检测

**实现方式：**
```tsx
const isMobile = window.innerWidth < 768;
// 或使用 useState + resize listener
```

移动端底部 TabBar 结构：
```
┌──────────────────────────────┐
│         内容区域              │
│                              │
├──────┬──────┬──────┬──────┬──┤
│ 仪表 │ 加油 │ 记录 │ 车辆 │设│
│  盘  │ 记录 │ 列表 │ 管理 │置│
└──────┴──────┴──────┴──────┴──┘
```

桌面端保持现有 Sider 布局不变。

### 2. Dashboard.tsx - 移动端表格转卡片

**移动端改动：**
- 统计卡片：`xs={12}` 已经是 2 列，保持不变
- 图表：保持不变，高度自适应
- 最近加油记录：Table → 移动端卡片列表

移动端加油记录卡片：
```
┌─────────────────────────┐
│ 2026-05-11    8.5 L/100km│
│ 12,345 km  35L  ¥265.00 │
└─────────────────────────┘
```

### 3. RefuelList.tsx - 移动端卡片列表

**移动端改动：**
- 隐藏 Table，显示卡片列表
- 每条记录一张卡片，显示关键信息
- 编辑/删除操作放在卡片右侧

### 4. Vehicles.tsx - 移动端卡片列表

**移动端改动：**
- 隐藏 Table，显示卡片列表
- 每辆车一张卡片：名称、品牌型号、燃油标号、默认标记
- 操作按钮在卡片底部

### 5. AddRefuel.tsx - 移动端表单优化

**移动端改动：**
- Switch 区域改为垂直排列
- 保存按钮改为 block 全宽

### 6. Settings.tsx - 移动端适配

**移动端改动：**
- Descriptions `column={2}` 改为移动端 `column={1}`

### 7. index.css - 全局移动端样式

添加移动端全局样式：
```css
@media (max-width: 767px) {
  .ant-card-body { padding: 12px; }
  .ant-modal { max-width: calc(100vw - 16px); }
}
```

## 受影响文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `src/components/Layout.tsx` | 重构 | 添加移动端底部 TabBar，隐藏 Sider/Header |
| `src/pages/Dashboard.tsx` | 修改 | 最近记录 Table → 移动端卡片 |
| `src/pages/RefuelList.tsx` | 修改 | Table → 移动端卡片列表 |
| `src/pages/Vehicles.tsx` | 修改 | Table → 移动端卡片列表 |
| `src/pages/AddRefuel.tsx` | 修改 | Switch 布局、按钮全宽 |
| `src/pages/Settings.tsx` | 修改 | Descriptions 列数自适应 |
| `src/index.css` | 修改 | 添加移动端全局样式 |

## 边界条件

- 窗口大小变化时（如旋转设备），布局应自动切换
- 移动端底部 TabBar 需考虑安全区域（iPhone 底部横条）
- 表格转卡片时，排序/分页功能在移动端用 Select 替代

## 数据流

无新数据流，纯 UI 适配。

## 预期结果

- 移动端（<768px）：底部 TabBar 导航 + 卡片列表 + 紧凑 padding
- 桌面端（>=768px）：保持现有侧边栏布局不变
