# Fuel Tracker 移动端适配任务

- [x] Task 1: 添加全局移动端样式和 isMobile hook
    - 1.1: 在 index.css 中添加移动端媒体查询样式
    - 1.2: 创建 src/hooks/useMobile.ts 自定义 hook（监听窗口宽度 <768px）

- [x] Task 2: 改造 Layout.tsx 支持移动端底部导航
    - 2.1: 引入 useMobile hook，移动端隐藏 Sider 和 Header
    - 2.2: 移动端渲染底部 TabBar（5 个 tab：仪表盘、添加加油、加油记录、车辆管理、设置）
    - 2.3: 移动端内容区 padding 减小，适配安全区域
    - 2.4: 桌面端保持现有 Sider 布局不变

- [x] Task 3: Dashboard.tsx 移动端适配
    - 3.1: 最近加油记录 Table → 移动端卡片列表
    - 3.2: 移动端减小图表高度

- [x] Task 4: RefuelList.tsx 移动端适配
    - 4.1: Table → 移动端卡片列表（每条记录一张卡片）
    - 4.2: 保留年份选择和添加按钮
    - 4.3: 编辑/删除操作放在卡片中

- [x] Task 5: Vehicles.tsx 移动端适配
    - 5.1: Table → 移动端卡片列表
    - 5.2: 操作按钮（设为默认、编辑、删除）放在卡片底部

- [x] Task 6: AddRefuel.tsx 移动端适配
    - 6.1: Switch 区域移动端改为垂直排列
    - 6.2: 保存按钮移动端改为全宽

- [x] Task 7: Settings.tsx 移动端适配
    - 7.1: Descriptions 列数移动端设为 1
