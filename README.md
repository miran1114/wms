# 智能仓库管理系统（WMS）



## 1. 项目概述

一个集成 **仓库管理 + AI 分析 + 需求预测** 的全栈系统。前端 React + Ant Design，后端 Django + DRF，支持 JWT 登录与角色权限。

### 核心功能

**库存管理**
- 实时库存管理、库存更新
- 操作日志审计
- 价格/库存历史可视化

**AI 分析**
- 基于 Ollama/Qwen 的智能库存分析
- 动态定价建议

**需求预测**
- 客户需求分析
- 偏差分析、MAPE 追踪
- 库存策略沙盒

**用户与权限**
- 角色：管理员/经理/分析师/操作员/查看者
- JWT 登录与鉴权
- 登录历史与用户管理

> 数据导入（CSV/XLSX）为计划功能，将用于预测数据入库与分析。

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Django 5.x, DRF, SQLite/PostgreSQL |
| 前端 | React 18, TypeScript, Ant Design, Zustand, Vite |
| AI | LangChain, Ollama (Qwen2.5) |
| 基础设施 | Docker, Nginx, Gunicorn |

## 3. 环境要求

- Python ≥ 3.11
- Node.js ≥ 18.x
- （可选）Docker & Docker Compose
- （可选）Ollama

### 环境变量（后端）

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `SECRET_KEY` | Django 密钥 | 必需 |
| `DEBUG` | 调试模式 | `False` |
| `DATABASE_URL` | PostgreSQL 连接 | sqlite |
| `REDIS_URL` | Redis 连接 | 无 |
| `OLLAMA_BASE_URL` | Ollama 地址 | `http://localhost:11434` |
| `OLLAMA_MODEL` | 模型名 | `qwen2.5:7b` |

### 环境变量（前端）

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_BASE_URL` | 后端 API 基址 | `http://localhost:8000` |
| `VITE_WEBSOCKET_URL` | WebSocket 地址 | `ws://localhost:8000` |

## 4. 快速开始（开发环境）

```bash
git clone <repo-url> wms
cd wms/warehouse-management-system

# Windows
scripts\start-dev.bat

# Linux/Mac
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

### 手动启动

后端：
```bash
python -m pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

前端：
```bash
npm install
npm run dev
# 默认 http://localhost:5173/（若端口占用会自动切换）
```

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 5. 目录结构

后端（Django）：
```
.
├── wms/                      # settings/urls/asgi/wsgi
├── core/                     # 通用：日志与异常
├── inventory/                # 商品与库存
├── market/                   # 市场数据
├── pricing/                  # 定价日志
├── forecasting/              # 需求预测域
├── authentication/           # JWT 与角色权限
├── ai_agent/                 # AI 引擎封装
└── manage.py
```

前端（React + TS）：
```
src/
├── components/               # 组件
├── pages/                    # 页面
├── services/                 # API/WebSocket
├── stores/                   # Zustand
├── types/                    # TS 类型
├── utils/                    # 工具与常量
└── App.tsx, main.tsx
```

## 6. 接口规范

统一响应结构：
```json
{ "code": 0, "data": { ... }, "message": "optional" }
```

核心接口示例：
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login/` | 登录（JWT） |
| GET | `/api/inventory` | 库存列表 |
| PUT | `/api/inventory/{id}/stock` | 库存变动 |
| PUT | `/api/inventory/{id}/price` | 改价 |
| POST | `/api/ai/analyze-inventory/` | AI 分析 |
| POST | `/api/ai/update-pricing/` | 动态定价 |
| GET | `/api/forecast/dashboard/` | 预测概览 |

## 7. 常见问题

- **无法登录**：检查后端是否运行在 `8000`，前端 API 基址是否正确。
- **AI 分析失败**：未启动 Ollama 或模型缺失。
- **空白页**：清理浏览器缓存和 LocalStorage 后重试。

## 8. 开发规范

- 前端：ESLint + Prettier
- 后端：PEP8（建议 black/isort）

提交规范（Conventional Commits）：
- `feat: ...`
- `fix: ...`
- `docs: ...`
| GET | `/api/inventory` | 列表，支持 `search`、`sortBy`、`sortOrder`、分页；`all=1` 返回全量 |
