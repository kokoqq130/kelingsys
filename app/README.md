# 查询系统启动说明

## 目录

- `frontend/`：前端查询界面
- `backend/`：FastAPI 索引与查询服务

## 启动方式

### 方式 1：分别启动

1. 前端：

在 `app/frontend/` 目录下可以直接运行：

```powershell
pnpm run dev
```

也可以从项目根目录运行：

```powershell
.\scripts\Start-Frontend.ps1
```

2. 后端：

后端统一通过项目内虚拟环境 `app/backend/.venv` 启动。首次启动时，脚本会自动创建虚拟环境并安装 `requirements.txt`：

```powershell
.\scripts\Start-Backend.ps1
```

如需后端热重载，可显式加上：

```powershell
.\scripts\Start-Backend.ps1 -Reload
```

### 方式 2：一键启动

```powershell
.\scripts\Start-QueryApp.ps1
```

该脚本会分别拉起前后端两个 PowerShell 窗口。

## 默认地址

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:8000`

## 分享发布

### 双模式约定

- 开发模式：继续使用当前 FastAPI 接口，前端通过 `/api/*` 和 `/raw/*` 读取资料。
- 分享模式：构建时自动重建索引、导出 `static-data/*.json`，并把 `柯灵用` 下的原始资料复制为静态 `raw/*` 文件。

### 本地生成分享包

在 `app/frontend/` 下执行：

```powershell
pnpm run build:share
```

也可以从项目根目录执行：

```powershell
.\scripts\Build-ShareSite.ps1
```

构建完成后，分享站点产物位于 `app/frontend/dist/`。

### GitHub Actions + EdgeOne Pages

- 仓库内提供了 `.github/workflows/deploy-share-to-edgeone.yml`。
- 该工作流会自动安装后端依赖、构建前端分享包，并上传 `dist` 产物。
- 如需直接部署到 EdgeOne Pages，请在 GitHub 仓库中配置：
  - Secret：`EDGEONE_API_TOKEN`
  - Variable：`EDGEONE_PROJECT_NAME`
- 工作流默认手动触发，并支持选择 `preview` 或 `production` 环境。

## 当前能力

- 总览
- 时间线
- 用药变化
- 检查结果
- 文档资料预览
- 原始文件浏览
- 全文搜索
