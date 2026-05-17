# 艾宾浩斯复习管理

基于艾宾浩斯遗忘曲线的复习管理网站，三端响应式。React + SQLite，本地运行，局域网内手机也可访问。

## 功能

- 录入每天筛选的题目（批次 + 单题，可独立追踪每题进度）
- 自动按艾宾浩斯节点生成复习计划：**当天 + 1, 3, 7, 15, 30, 60, 90 天**
- 「今日」页面：显示今天该复习哪些题（按"哪天做的"分组），含逾期项
- 「日历」页面：月视图，每天显示待复习数 / 已完成数，点击查看详情
- 三种完成方式可选：
  - **简单打勾**：完成即进入下一节点
  - **三档反馈**：熟练 / 一般 / 遗忘（遗忘则重置该节点之后的复习计划）
  - **推迟到明天**：累积显示，不会丢失

## 技术栈

- 前端：React 18 + Vite + TailwindCSS + React Router
- 后端：Node.js + Express + better-sqlite3
- 数据库文件：`server/data.db`（自动生成）

## 安装

需要 Node.js ≥ 18。

```bash
npm run install:all
```

> Windows 上 `better-sqlite3` 安装需要 Visual Studio Build Tools 的 C++ 工具集。
> 如果安装失败，请先安装：https://visualstudio.microsoft.com/visual-cpp-build-tools/
> 或使用 `npm install --global windows-build-tools`（旧版 Node）。

## 启动（开发模式）

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:5174

打开浏览器访问 http://localhost:5173 即可使用。

### 手机访问（同一 WiFi）

启动后终端会显示局域网地址，例如 `http://192.168.x.x:5173`，手机浏览器打开该地址即可。

## 生产模式

```bash
npm run build      # 构建前端到 client/dist
npm start          # 启动后端（5174）
```

生产模式下你可以用 nginx 或任意静态服务器托管 `client/dist`，并将 `/api` 反向代理到 `localhost:5174`。

## 数据备份

所有数据存在 `server/data.db`，直接复制该文件即可备份。

## 复习算法说明

每条复习记录有：
- `scheduled_date`：应复习的日期
- `stage`：第几次复习（0~6）
- `status`：`pending` / `postponed` / `done`
- `feedback`：`easy` / `normal` / `forgot` / null

**遗忘**反馈：删除该目标后续所有未完成节点，从今天开始重新生成 1/2/4/7/15/30 天的计划。

**推迟**：将 `scheduled_date` 推后 1 天，状态置为 `postponed`，不影响后续节点。

**逾期**：当 `scheduled_date < 今天` 且未完成时，会出现在今日列表中，并标记为「逾期」。
