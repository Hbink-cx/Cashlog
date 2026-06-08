# 💰 Cashlog — 个人理财助手

> 支持**无限级子分类**的桌面记账软件 —— 数据始终存于本地，隐私无忧。

[![Windows](https://img.shields.io/badge/Windows-✅-0078D6?logo=windows&style=flat-square)](https://github.com/Hbink-cx/finance-app/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-✅-000000?logo=apple&style=flat-square)](https://github.com/Hbink-cx/finance-app/releases/latest)
[![Linux](https://img.shields.io/badge/Linux-✅-FCC624?logo=linux&style=flat-square)](https://github.com/Hbink-cx/finance-app/releases/latest)
[![iOS](https://img.shields.io/badge/iOS-PWA-999999?logo=apple&style=flat-square)](https://hbink-cx.github.io/finance-app/)
[![Android](https://img.shields.io/badge/Android-PWA-3DDC84?logo=android&style=flat-square)](https://hbink-cx.github.io/finance-app/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/badge/release-v1.0.0-blue?style=flat-square)](https://github.com/Hbink-cx/finance-app/releases/latest)

**🌐 PWA 在线版**: **[hbink-cx.github.io/finance-app](https://hbink-cx.github.io/finance-app/)** — 手机浏览器打开直接安装到桌面！

---

## 📋 目录

- [✨ 亮点](#-亮点)
- [📊 案例演示：上班族的月度财务分析](#-案例演示上班族的月度财务分析)
- [🧭 功能页面](#-功能页面)
- [🚀 快速开始](#-快速开始)
- [🗺 路线图](#-路线图)
- [🏗 数据模型](#-数据模型)
- [🧱 技术栈](#-技术栈)
- [📦 发布流程](#-发布流程)

---

## ✨ 亮点

| 特性 | 说明 |
|------|------|
| 🌳 **无限级分类** | 餐饮 → 外食 → 午餐外卖 → 汉堡王，任意嵌套，自定义颜色 |
| 📊 **层级可视化** | ECharts 旭日图展示多级分类占比，桑基图展示资金流向 |
| 📈 **趋势分析** | 双向柱状图 + 结余曲线，收入（上绿）/ 支出（下红）一目了然 |
| 🎯 **智能预算** | 月度/年度预算，实时进度条，超额红色警告 |
| 🌓 **深色模式** | 一键切换，护眼舒适 |
| 📥 **数据主权** | 所有数据存储在本地 LocalStorage，零网络请求 |
| 🔄 **导入导出** | JSON 一键备份/恢复，数据永远属于你 |
| 📸 **截图导入** | 微信/支付宝账单截图 → OCR 自动识别 → 批量导入，支持增减收支和内联创建子分类 |

---

## 📊 案例演示：上班族的月度财务分析

> 以下展示一个典型用户（月薪 ¥18,000 的上班族）从零开始使用本软件的场景。

### 第一步：建立分类体系

用户首先在「**分类管理**」页构建自己的收支分类树：

```
📁 支出
 ├─ 🍔 餐饮                  ← 一级分类
 │   ├─ 🥡 外食              ← 二级分类
 │   │   ├─ 🍕 午餐外卖       ← 三级分类
 │   │   └─ 🥘 聚餐           ← 三级分类
 │   └─ 🏠 居家做饭           ← 二级分类
 ├─ 🚇 交通
 │   ├─ 🚌 地铁通勤
 │   └─ 🚕 打车
 ├─ 🛒 购物
 ├─ 🎮 娱乐
 └─ 🏠 住房（房租）
 
📁 收入
 ├─ 💼 工资
 ├─ 💻 副业（自由职业）
 ├─ 📈 投资
 └─ 🎁 其他收入
```

> **特点**：每一层都可以设置颜色标记，子分类自动汇总到父级。删除父分类会级联清理子分类及关联交易。

### 第二步：日常记账

用户每天在「**流水**」页记录交易——可以手动录入，也可以**截一张微信/支付宝账单页**直接批量导入：

| 日期 | 类型 | 分类路径 | 金额 | 描述 |
|------|------|----------|------|------|
| 6月1日 | 收入 | 收入 > 工资 | ¥18,200 | 6月工资 |
| 6月3日 | 支出 | 支出 > 餐饮 > 外食 > 午餐外卖 | ¥38 | 麻辣烫 |
| 6月5日 | 支出 | 支出 > 交通 > 地铁通勤 | ¥6 | 上班通勤 |
| 6月8日 | 支出 | 支出 > 住房 | ¥2,500 | 房租 |
| 6月12日 | 支出 | 支出 > 餐饮 > 外食 > 聚餐 | ¥186 | 朋友火锅 |
| 6月15日 | 收入 | 收入 > 副业 | ¥3,200 | 设计外包 |
| 6月20日 | 支出 | 支出 > 购物 | ¥459 | 鞋子 |
| ... | ... | ... | ... | ... |

> **特点**：可按月切换、按类型/分类/关键词搜索、编辑/删除均有确认保护。

### 第三步：设定预算

用户在「**预算**」页为关键分类设限：

| 分类 | 预算 | 周期 | 实际 | 进度 |
|------|------|------|------|------|
| 餐饮（含所有子分类） | ¥3,000 | 月度 | ¥2,340 | ████████░░ 78% |
| 交通 | ¥800 | 月度 | ¥620 | ██████░░░░ 77% |
| 购物 | ¥2,000 | 月度 | ¥2,180 | ██████████ **109%** ⚠️ |
| 娱乐 | ¥1,500 | 月度 | ¥890 | █████░░░░░ 59% |

> **特点**：预算作用在任意层级——「餐饮」预算自动汇总「外食」+「居家做饭」的所有子交易。超过 80% 变黄，超过 100% 变红并在仪表盘弹出警告。

### 第四步：仪表盘洞察

打开「**概览**」仪表盘，一眼看到：

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  本月收入     │ │  本月支出     │ │  本月结余     │ │  净储蓄率     │
│ ¥21,400     │ │ ¥8,350      │ │ ¥13,050     │ │    61%      │
│ 累计 ¥128K   │ │ 累计 ¥62K    │ │ 收支比 39%   │ │             │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

**年度趋势图**（双向柱状图）显示：
- 🟢 绿色柱**朝上**：每月收入（工资 + 副业）
- 🔴 红色柱**朝下**：每月支出（餐饮、交通、购物等）
- 🔵/🔴 结余曲线：正结余在上方蓝点，负结余在下方红点

用户立刻发现：3 月支出异常高（购物超预算），6 月结余最高。

### 第五步：可视化分析

打开「**分析**」页：

- **旭日图**：从圆心向外，一级环 = 餐饮/交通/购物/…，二级环 = 外食/居家做饭，三级环 = 午餐外卖/聚餐。鼠标悬停显示具体金额和占比。
- **桑基图**：收入（工资 → 总收入 · 副业 → 总收入）→ 总支出 → 各支出分类 + 储蓄。资金流向一目了然。
- **趋势图**：全年 12 个月的收入/支出/结余变化。

> **洞察**：用户发现「餐饮 > 外食」占总支出 35%，决定减少外卖。副业月均 ¥2,500，考虑加大投入。

---

## 🧭 功能页面

### 1. 概览（Dashboard）

- 四大统计卡片（收入 / 支出 / 结余 / 储蓄率）
- **双向柱状趋势图**：收入向上绿柱，支出向下红柱，结余曲线逐月展示
- 本月支出/收入分类占比（进度条 + 百分比）
- 预算预警卡片（超过 80% 自动弹出）
- 最近 8 笔交易快速浏览

### 2. 流水（Transactions）

- 按月切换浏览（◀ 2025年6月 ▶）
- 按类型（全部/收入/支出）、分类、关键词筛选
- 当月合计（收入 / 支出 / 结余 / 笔数）
- **✨ 截图导入**：微信/支付宝/银行账单截图 → OCR 解析 → 批量导入
- 导入时支持内联创建子分类、逐笔手动切换收入/支出
- 新增 / 编辑交易弹窗表单，删除确认保护

### 3. 分类（Categories）

- 支出 / 收入分类分 Tab 管理
- 树形无限嵌套：展开/折叠、添加子分类、编辑、删除
- 每节点显示关联交易笔数和预算数
- 11 色预设 + 自定义颜色
- 删除父分类自动级联清理

### 4. 预算（Budgets）

- 月度 / 年度两种周期
- 在任意分类层级设定预算
- 实时进度条（绿 → 黄 80% → 红 100%）
- 超额警告文字
- 自动计算该分类及所有子分类的合计支出

### 5. 分析（Analysis）

- **旭日图**：多层级环形图，中心 → 外圈逐级展开分类树
- **桑基图**：收入来源 → 总池 → 支出去向 + 储蓄分流
- **趋势图**：全年月度收入/支出/结余柱线混合图

### 全局功能

- 🌓 深色模式一键切换
- 📸 OCR 截图批量导入（微信/支付宝/银行卡）
- 📥 JSON 数据导出备份
- 📤 JSON 数据导入恢复
- 💾 自动 LocalStorage 持久化，页面刷新不丢失

---

## 🚀 快速开始

### 💻 桌面版下载

从 [Releases](https://github.com/Hbink-cx/finance-app/releases) 页面下载对应平台安装包：

| 平台 | 文件 |
|------|------|
| 🪟 Windows | `个人理财助手-win-x64.zip` — 解压后双击 `个人理财助手.exe` |
| 🍎 macOS | `个人理财助手-macos-x64.zip` — 解压运行 |
| 🐧 Linux | `个人理财助手-linux-x64.tar.gz` — 解压运行 |

Windows 用户还可以下载源码后运行 `启动理财助手.bat`。

### 📱 PWA 手机版（iOS & Android）

**即开即用，无需下载 App Store！**

🌐 打开 **[hbink-cx.github.io/finance-app](https://hbink-cx.github.io/finance-app/)** → 添加到桌面：

| iPhone / iPad | Android |
|---------------|---------|
| Safari 打开 → 底部「分享」→「添加到主屏幕」 | Chrome 打开 → 右上角 ⋮ →「安装应用」 |

安装后以全屏模式独立运行，支持离线使用（首次联网下载 OCR 中文包后即可离线）。

### 🛠 开发运行

```bash
# 克隆
git clone https://github.com/Hbink-cx/finance-app.git
cd finance-app

# 安装
npm install

# 浏览器开发
npm run dev                    # → http://localhost:5173

# Electron 桌面开发
npm run dev:electron           # 自动打开 Electron 窗口

# 打包桌面应用
npm run build:electron         # → release/win-unpacked/
```

---

## 🗺 路线图

正在规划中的功能，欢迎贡献代码或提出建议！

| 优先级 | 功能 | 状态 |
|--------|------|------|
| 🔴 高 | **原生 App 发布**（Capacitor 封装 → App Store / Google Play 上架） | 计划中 |
| 🔴 高 | **多端数据同步**（WebDAV / 自建同步服务 / 文件云同步） | 计划中 |
| 🟡 中 | **银行账单 CSV 智能解析**（一套规则覆盖主流银行 + 微信/支付宝 CSV） | 计划中 |
| 🟡 中 | **周期账单提醒**（房租、订阅续费等定期通知） | 计划中 |
| 🟢 低 | **多币种支持** | 计划中 |
| 🟢 低 | **家庭成员共享账本** | 计划中 |

---

## 🏗 数据模型

```
Category（分类）                  Transaction（交易）
┌──────────────────────┐        ┌──────────────────────┐
│ id: string           │        │ id: string           │
│ name: string         │◄───────│ categoryId: string   │
│ type: 'income'|…     │        │ amount: number       │
│ parentId: string|null│        │ type: 'income'|…     │
│ color?: string       │        │ date: 'YYYY-MM-DD'   │
└──────────────────────┘        │ description?: string │
        │                       └──────────────────────┘
        │ 1:N
        ▼
Budget（预算）
┌──────────────────────┐
│ id: string           │
│ categoryId: string   │
│ amount: number       │
│ period: 'monthly'|…  │
│ year / month         │
└──────────────────────┘
```

核心设计决策：
- **parentId = null** 表示根分类，形成森林结构
- 交易关联**任意层级**的分类 ID，汇总时自动向上归集
- 预算设置于**任意层级**的分类，自动覆盖所有子分类的支出

---

## 🧱 技术栈

| 层 | 技术选型 | 理由 |
|----|----------|------|
| 前端框架 | React 18 + TypeScript | 类型安全，生态成熟 |
| 构建工具 | Vite 6 | 秒级 HMR，ESM 原生支持 |
| 样式 | Tailwind CSS 3 | 原子化 CSS，暗色模式 |
| 图标 | Lucide React | 轻量，Tree-shakable |
| 图表 | ECharts 5 | 原生支持旭日图/桑基图 |
| OCR | Tesseract.js | 纯浏览器端离线识别，零上传 |
| 桌面壳 | Electron 33 | 跨平台，自定义 `app://` 协议 |
| 打包 | electron-builder | NSIS/portable/DMG/AppImage |
| PWA | vite-plugin-pwa + Workbox | iOS/Android 安装到桌面，离线可用 |
| 存储 | LocalStorage | 零依赖，隐私优先 |
| CI/CD | GitHub Actions | 自动构建三平台安装包 + GitHub Pages 部署 |

---

## 📦 发布流程

推送 tag 自动触发 GitHub Actions 构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

CI 将自动：
1. 编译 TypeScript → Vite 打包前端
2. GitHub Actions 构建 Windows/macOS/Linux 三平台安装包
3. 部署 PWA 到 GitHub Pages
4. 发布 Release 附件供下载

---

## ☕ 支持作者

个人理财助手是完全免费的开源软件，你的打赏将直接用于项目开发和维护。

<p align="center">
  <img src="https://github.com/Hbink-cx/finance-app/blob/main/public/donate.jpg?raw=true" width="280" alt="收款码" />
  <br />
  <sub>所有收入将用于项目开发与持续维护 💚</sub>
</p>

---

## 📄 License

MIT © BinKai Hong
