# ⛽ Fuel Tracker（油耗追踪器）

一个简洁的油耗追踪工具，记录每次加油数据，自动计算油耗和费用趋势。数据存储在你的 GitHub 私有仓库中，安全可控。

## 在线访问

https://baronz.github.io/fuel-tracker/

## 功能特性

- **添加加油记录**：日期、里程、加油量、单价、总金额
- **油耗自动计算**：基于前后两次满油记录自动计算百公里油耗
- **统计分析**：油耗趋势图、月度费用柱状图、油价变化趋势
- **多车辆管理**：支持管理多辆车的加油数据
- **数据持久化**：所有数据存储在 GitHub 私有仓库 `fuel-tracker-data` 中
- **移动端适配**：底部 TabBar 导航 + 卡片列表，手机访问体验良好

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript + Vite |
| UI 组件库 | Ant Design 6 |
| 状态管理 | Zustand + persist（localStorage 持久化） |
| 图表 | ECharts 6 + echarts-for-react |
| 路由 | React Router 7 |
| 日期处理 | Day.js |
| 认证 | GitHub OAuth |
| OAuth 代理 | Cloudflare Workers |
| 数据存储 | GitHub Contents API |
| 部署 | GitHub Pages |

## 项目结构

```
fuel-tracker/
├── src/
│   ├── api/
│   │   ├── auth.ts          # GitHub OAuth 流程
│   │   └── github.ts        # GitHub API 数据读写
│   ├── components/
│   │   ├── Layout.tsx       # 侧边栏/底部导航布局
│   │   └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx    # 仪表盘（统计 + 图表）
│   │   ├── AddRefuel.tsx    # 添加加油记录
│   │   ├── RefuelList.tsx   # 加油记录列表
│   │   ├── Vehicles.tsx     # 车辆管理
│   │   ├── Settings.tsx     # 设置
│   │   └── Login.tsx        # 登录页
│   ├── store/
│   │   ├── authStore.ts     # 认证状态
│   │   └── fuelStore.ts     # 加油数据状态
│   ├── utils/
│   │   ├── consumption.ts   # 油耗计算逻辑
│   │   └── format.ts        # 格式化工具
│   └── hooks/
│       └── useMobile.ts     # 移动端检测 hook
├── worker/
│   └── src/
│       └── index.ts         # Cloudflare Worker（OAuth token 交换）
└── .github/workflows/
    └── deploy.yml           # GitHub Actions 自动部署
```

## 快速开始

### 1. 创建 GitHub OAuth App

- 进入 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
- Application name: `Fuel Tracker`
- Homepage URL: `https://你的用户名.github.io/fuel-tracker/`
- Authorization callback URL: `https://你的用户名.github.io/fuel-tracker/login`
- 记下 **Client ID** 和 **Client Secret**

### 2. 配置 Cloudflare Worker

- 在 Cloudflare Dashboard 创建 Worker
- 在 Worker Settings → Variables 中添加：
  - `GITHUB_CLIENT_ID`：你的 GitHub OAuth Client ID
  - `GITHUB_CLIENT_SECRET`：你的 GitHub OAuth Client Secret（加密）
- 将 `worker/src/index.ts` 中的代码粘贴到 Worker 编辑器并部署

### 3. 配置前端环境变量

在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables 中添加：

- `VITE_GITHUB_CLIENT_ID`：你的 Client ID
- `VITE_WORKER_URL`：你的 Worker 部署地址（如 `https://xxx.workers.dev`）

### 4. 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 预览
npm run preview
```

### 5. Worker 本地开发

```bash
cd worker
npm install
npm run dev
```

## 移动端适配

项目已针对移动端做了以下适配：

- **底部 TabBar 导航**：替换桌面端侧边栏，5 个 tab 快速切换
- **卡片列表**：表格在移动端转为紧凑卡片，信息一目了然
- **安全区域适配**：底部导航栏适配 iPhone 底部横条
- **响应式间距**：移动端内容区 padding 和字体大小自动调整
- **表单优化**：Switch 垂直排列，按钮全宽

## 数据存储说明

所有数据以 JSON 文件形式存储在你的 GitHub 私有仓库 `fuel-tracker-data` 中：

```
fuel-tracker-data/
├── config.json              # 车辆配置
└── data/
    └── {vehicleId}/
        └── {year}.json      # 年度加油记录
```

## 许可证

MIT
