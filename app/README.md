# 本地查询页面

该应用只负责读取项目中的医疗资料并在本地展示，不承担复杂表单录入，也不以公开部署为目标。

## 启动

从项目根目录运行：

```powershell
.\scripts\Start-QueryApp.ps1
```

默认地址：

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:8000`

也可以分别运行：

```powershell
.\scripts\Start-Backend.ps1
.\scripts\Start-Frontend.ps1
```

前端开发时可在 `app/frontend` 下运行：

```powershell
pnpm run dev
```

后端统一使用 `app/backend/.venv`，并固定为Python 3.12。首次使用可以运行：

```powershell
.\scripts\Setup-Backend.ps1
```

## 数据来源

默认读取项目根目录的 `柯灵用/`。如果以后将医疗资料移到仓库外，可以先设置：

```powershell
$env:KELING_DATA_ROOT = 'D:\kelingsys-private'
```

后端每次启动会自动重建SQLite索引。索引只是派生产物，真实内容仍以Markdown和原始报告为准。

## 当前页面能力

- 总览
- 当前用药
- 癫痫及住院时间线
- 住院周期详情
- 检查结果
- Markdown文档预览
- 原始文件浏览
- 全文搜索

## 静态导出

静态导出会包含真实医疗信息，因此默认禁止，也不再提供自动部署工作流。日常使用不需要运行 `build:share`。

如果以后确实需要生成**仅供私下离线传递**的快照，必须显式设置安全确认变量；默认不复制原始报告：

```powershell
$env:ALLOW_SENSITIVE_STATIC_EXPORT = 'I_UNDERSTAND'
pnpm run build:share
```

只有再次显式设置以下变量时才会复制全部原始医疗文件：

```powershell
$env:INCLUDE_RAW_MEDICAL_FILES = 'true'
```

不得把生成结果发布到公开网站。
