# 查询系统启动说明

## 目录

- `frontend/`：前端查询界面
- `backend/`：FastAPI 索引与查询服务

## 启动方式

### 方式 1：分别启动

1. 后端：

```powershell
.\scripts\Start-Backend.ps1
```

2. 前端：

```powershell
.\scripts\Start-Frontend.ps1
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
