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

## 当前能力

- 总览
- 时间线
- 用药变化
- 检查结果
- 文档资料预览
- 原始文件浏览
- 全文搜索
