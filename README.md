# 智能仓库管理系统（WMS）

> 版本：v2.0.0 · 状态：生产就绪

## 1. 项目概述

一个功能完整、生产就绪的仓库管理系统，集成了AI驱动的库存优化、需求预测和智能定价推荐功能。

### 核心功能

#### 库存管理
- 实时库存跟踪、库存更新和警报
- 完整的操作日志审计追踪
- 价格历史和库存历史可视化

#### AI分析
- 使用LLM（Ollama/Qwen）进行智能库存分析
- AI驱动的动态定价建议
- 安全库存和促销推荐

#### 需求预测（新功能！）
- 基于历史偏差模式的需求预测
- 客户行为分析和预测准确性跟踪
- 库存策略沙盒 - 模拟不同服务水平和成本
- 偏差分析和MAPE追踪

#### 用户管理
- 基于角色的访问控制（管理员、经理、分析师、操作员、查看者）
- JWT安全认证
- 用户配置和登录历史追踪

### 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Django 5.x, Django REST Framework, PostgreSQL, Redis |
| 前端 | React 18, TypeScript, Ant Design, Zustand, Vite |
| AI | LangChain, Ollama (Qwen2.5) |
| 基础设施 | Docker, Nginx, Gunicorn |

## 2. 环境要求

- Python ≥ 3.11
- Node.js ≥ 18.x（推荐 LTS）
- Docker & Docker Compose（用于生产部署）
- Ollama（用于AI功能）

### 环境变量（后端）

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `SECRET_KEY` | Django 密钥 | 必需 |
| `DEBUG` | 调试模式 | `False` |
| `DATABASE_URL` | PostgreSQL 连接URL | sqlite |
| `REDIS_URL` | Redis 连接URL | 无 |
| `OLLAMA_BASE_URL` | Ollama 地址 | `http://localhost:11434` |
| `OLLAMA_MODEL` | 模型名 | `qwen2.5:7b` |

### 环境变量（前端）

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_BASE_URL` | 后端 API 基址 | `http://localhost:8000/api` |
| `VITE_WS_URL` | WebSocket 地址 | `ws://localhost:8000/ws` |

## 3. 安装部署指南

### 快速开始（开发环境）

```bash
# 克隆仓库
git clone <repo-url> wms
cd wms/warehouse-management-system

# Windows用户运行
scripts\start-dev.bat

# Linux/Mac用户运行
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

### 手动安装

#### 后端依赖安装
python -m pip install -r requirements.txt

# 数据库迁移（SQLite 默认）
python manage.py makemigrations
python manage.py migrate

# 生成 Mock 数据（可选参数 --count --days）
python manage.py seed_wms_data --count 100 --days 30

# 启动后端（默认 8888）
python manage.py runserver 0.0.0.0:8888
```

```bash
# 前端（建议在项目根的同一目录运行）
# 安装依赖
npm install

# 开发启动（Vite）
npm run dev
# 本地访问：http://localhost:5173/ （若端口占用会自动切换）
```

## 4. 代码框架说明

后端（Django）：
```
.
├── wms/                      # 项目配置（settings、urls、wsgi、asgi）
├── core/                     # 通用：视图、管理命令、日志模型
│   ├── views.py              # 轻薄的视图层（Service-Layer 入口）
│   ├── models.py             # OperationLog 模型
│   └── management/commands/  # seed_wms_data 等脚本
├── inventory/                # 商品与库存域
│   ├── models.py             # Product、Inventory、Transaction
│   └── migrations/           # 迁移文件
├── market/                   # 市场数据域
│   ├── models.py             # MarketData
│   └── migrations/
├── pricing/                  # 定价域
│   ├── models.py             # PricingLog
│   └── migrations/
├── ai_agent/                 # 与 Ollama 的交互封装
│   └── engine.py             # DecisionEngine（分析与定价）
└── manage.py
```

前端（React + TS）：
```
src/
├── components/               # 组件（表格、弹窗、布局等）
├── pages/                    # 页面（Home、ProductDetail、AIAnalysis、Settings）
├── services/                 # API 与 WebSocket/Ollama 封装
├── stores/                   # Zustand 状态管理
├── types/                    # TS 类型定义（inventory、api、analysis）
├── utils/                    # 工具与常量
└── App.tsx, main.tsx         # 应用入口
```

> 对应到模板：controllers ≈ views/engine（业务入口与服务）、models ≈ Django 各域模型、utils ≈ `src/utils` 与后端工具封装。

## 5. 接口规范

- 设计原则：RESTful、JSON 返回统一结构：

```json
{
  "code": 0,
  "data": { ... },
  "message": "optional"
}
```

- 核心接口：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/inventory` | 列表，支持 `search`、`sortBy`、`sortOrder`、分页；`all=1` 返回全量 |
| POST | `/api/inventory` | 创建商品（含初始库存） |
| PUT | `/api/inventory/{id}/stock` | 增减库存：`{"change":10,"operation":"increase|decrease"}` |
| PUT | `/api/inventory/{id}/price` | 改价：`{"price":123.45,"reason":"..."}` |
| DELETE | `/api/inventory/{id}` | 删除商品 |
| GET | `/api/inventory/{id}/price-history` | 价格历史（逐日） |
| GET | `/api/inventory/{id}/stock-history` | 库存历史（逐日） |
| POST | `/api/ai/analyze-inventory/` | 运行安全库存分析（写入建议） |
| POST | `/api/ai/update-pricing/` | 动态定价（写入价格日志与现价） |
| GET | `/api/dashboard/` | 概览与紧急补货列表 |
| GET | `/api/logs` | 操作日志查询（分页与筛选） |

- 请求/响应示例：

更新库存：
```http
PUT /api/inventory/2/stock
Content-Type: application/json

{"change":30,"operation":"increase"}
```
响应：
```json
{
  "code": 0,
  "data": {
    "id": "2",
    "name": "商品名",
    "stock": 59,
    "unit": "件",
    "price": 160.0,
    "lastUpdated": "2025-12-19T09:00:10.545Z",
    "lowStockWarning": false,
    "category": "家居",
    "sku": "SKU1001",
    "location": "A1",
    "minSafetyStock": 20,
    "maxCapacity": 1000
  }
}
```

- 错误代码对照：

| code | 说明 |
|---|---|
| 0 | 成功 |
| 1 | 参数校验失败 |
| 2 | 资源不存在 |
| 3 | 服务器内部错误 |

- 版本控制策略：
  - 预留路径前缀：`/api/v1/...`（当前为 v0 实验版）
  - 重大变更以路径和响应结构增量方式演进

## 6. 使用教程

- 典型场景：
  1. 生成数据 → 启动后端 → 启动前端
  2. 在首页查看库存概览，搜索名称/SKU/ID 过滤商品
  3. 进入商品详情，编辑库存与价格，查看“价格历史/库存历史”曲线，悬停查看具体数值
  4. 在 AI 分析页：
     - 全局分析（按钮“开始AI分析”）基于全量库存生成建议
     - 根据建议“一键补货/一键减库/一键改价”，确认后实时更新数据库
  5. 在日志页查看操作记录（库存增减/改价/AI分析）

- 常见问题：
  - 前端搜索不到：确认后端 `/api/inventory` 正常，并检查 `VITE_API_BASE_URL`
  - AI 分析失败：本地未启动 Ollama 或模型缺失；前端/后端均有降级策略（规则推断）
  - 跨域：后端开启 CORS（已配置），确保前端基址正确

## 7. 开发指南

- 代码风格：
  - 前端：推荐 ESLint + Prettier（TypeScript）
  - 后端：PEP8（使用 `black`/`isort`）

示例（前端）：
```bash
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-react
```

- 分支管理：
  - `main`：稳定分支
  - `feature/*`：新功能开发
  - `fix/*`：问题修复

- 提交信息规范（Conventional Commits）：
  - `feat: 增加库存建议一键执行`
  - `fix: 修复详情页保存库存加法错误`
  - `docs: 补充安装指南`

---

更多信息：
- 后端入口：`wms/urls.py`
- AI 服务：`ai_agent/engine.py`
- 种子脚本：`core/management/commands/seed_wms_data.py`
- 问题反馈：请在提交 Issue 时附带接口响应与日志片段。
