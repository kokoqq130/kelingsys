---
name: main-doc-pdf-export
description: 将当前工作区的主病情摘要 markdown 导出为 PDF。适用于把 柯灵基本信息.md 转成可分享或打印的 PDF，尤其是在主文档改动后，用户确认需要刷新 PDF 的场景。
---

# 主文档 PDF 导出

除非用户明确指定其他 markdown 文件，否则这个 skill 只用于当前项目的主文档。

## 工作流程

1. 默认把 `[柯灵基本信息.md](../../../柯灵用/柯灵基本信息.md)` 作为输入源。
2. 如果主文档刚被修改，需要先询问用户是否现在刷新 PDF，不要静默覆盖。
3. 默认输出到 `[柯灵基本信息.pdf](../../../柯灵用/柯灵基本信息.pdf)`。
4. 导出的 PDF 需要尽量保证中文、表格、列表、图片都可读。
5. 如果导出依赖浏览器无头打印，要注意这一步可能需要沙箱外权限。

## 使用脚本

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\Export-MainDocPdf.ps1"
```

只有在需要时才覆盖默认路径：

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\Export-MainDocPdf.ps1" -MarkdownPath ".\柯灵用\柯灵基本信息.md" -OutputPath ".\柯灵用\柯灵基本信息.pdf"
```

## 完成后检查

1. 确认输出 PDF 存在。
2. 如有条件，确认 PDF 文件大小不是异常偏小，并且图片已带出。
3. 把输出路径反馈给用户。
