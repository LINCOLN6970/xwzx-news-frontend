# Azure 前端部署指南

## 前提条件
- 后端和数据库已部署在 Azure 上
- 知道后端 API 的 Azure 地址（例如：`https://toutiao-backend.azurewebsites.net`）

---

## 重要：配置后端 API 地址

在构建和部署前，需要设置后端地址。

### 方式 A：环境变量文件
创建 `.env.production` 文件（不要提交到 Git）：

```
# 将下面的地址替换为您的 Azure 后端地址
VITE_API_BASE_URL=https://your-backend.azurewebsites.net
```

### 方式 B：构建时指定
```bash
VITE_API_BASE_URL=https://your-backend.azurewebsites.net npm run build
```

---

## 方式一：Azure Static Web Apps（推荐）

### 1. 配置环境变量
如上所述创建 `.env.production` 或使用构建时环境变量

### 2. 本地构建测试
```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 本地预览
npm run preview
```

### 3. 通过 Azure Portal 部署

1. 登录 [Azure Portal](https://portal.azure.com)
2. 创建资源 → 搜索 **Static Web Apps** → 创建
3. 填写信息：
   - **订阅**: 选择您的订阅
   - **资源组**: 新建或选择现有
   - **名称**: `xwzx-news-frontend`
   - **部署详情**: 选择 **Other**
   - **生成详细信息**: 
     - 应用位置: `/`
     - 输出位置: `dist`
     - 构建命令: `npm run build`

4. 创建后在 **配置** → **应用程序设置** 中添加：
   - 名称: `VITE_API_BASE_URL`
   - 值: 您的后端 Azure 地址（如 `https://toutiao-backend.azurewebsites.net`）

5. 通过 **GitHub** 或 **上传 dist 文件夹** 部署

---

## 方式二：Azure App Service（Blob 静态网站）

### 1. 构建项目
```bash
npm run build
```
生成的 `dist` 文件夹即为可部署的静态文件。

### 2. 上传到 Azure Storage
- 创建 Storage Account
- 启用静态网站
- 上传 `dist` 文件夹内所有文件到 `$web` 容器

---

## 方式三：GitHub Actions 自动部署

在项目根目录创建 `.github/workflows/azure-static-web-apps.yml`：

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install and Build
        run: |
          npm ci
          npm run build
          
      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: /
          output_location: dist
          env_file_path: .env.production
```

在 GitHub 仓库设置中配置 `AZURE_STATIC_WEB_APPS_API_TOKEN`。

---

## 重要：配置 CORS

确保您的 Azure 后端已配置 CORS，允许前端域名访问：

```python
# FastAPI 后端 main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend.azurestaticapps.net",  # Azure Static Web Apps 域名
        "http://localhost:3000"  # 本地开发
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 部署后检查

1. 访问前端 URL
2. 测试登录、新闻列表等功能
3. 打开浏览器开发者工具，确认 API 请求指向正确的后端地址
4. 如有问题，检查 CORS 和 API 地址配置
