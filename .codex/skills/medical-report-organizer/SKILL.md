---
name: medical-report-organizer
description: 整理医疗报告文件夹、对报告图片做 OCR、给原始化验单截图重命名，并维护“长期主文档”和“本次住院文档”两套 markdown。适用于处理中文医疗报告截图、更新长期病情概览，或在检查报告/住院文件夹中整理一次住院说明。
---

# 医疗报告整理

这是当前工作区的项目本地版本。如果整理规则发生变化，需要同时更新这个 skill 和工作区里的 `AGENTS.md`。

使用这个 skill 的核心目标，是把“长期参考信息”和“本次住院的时效性信息”分开维护。

## 工作流程

1. 在动手前先查看主文档和当前报告文件夹的现状。
2. 主文档保持精炼，保留诊断、当前稳定治疗、长期趋势、关键诱因、过敏史、生长营养、主要就诊信息等长期参考内容。
3. 本次住院或本次状态相关的细节，放到对应住院文件夹中的独立 markdown。
4. 先对报告图片做 OCR，再判断文件名和结果内容。
5. 只有在基本确认日期和报告类型后，才给 `微信图片_*.jpg` 这类文件重命名。
6. 报告文件名优先用 `YYYY-MM-DD_报告名称.ext`。
7. 只要有临床意义，就尽量保留单位和参考范围。
8. OCR 不完全确定的内容，要明确写成“约”，并提醒以后对照原图核对。
9. 重点是提炼对医生有用的信息，而不是机械抄所有数值。
10. 在 markdown 中保留原图链接，方便随时回看原始报告。

## 使用脚本

在人工整理前，先运行 OCR 脚本：

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\Invoke-MedicalOcr.ps1" -Path "<file-or-folder>"
```

常用变体：

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\Invoke-MedicalOcr.ps1" -Path ".\检查报告" -Recurse -Format markdown -OutputPath ".\ocr-output.md"
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\Invoke-MedicalOcr.ps1" -Path ".\某张报告.png"
```

当前入口脚本会先调用项目里的 `scripts/Setup-Backend.ps1`，确保 `app/backend/.venv` 使用 Python 3.12 并安装 PaddleOCR。脚本输出应视为“原始提取结果”，不要把模糊图片或复杂表格里的 OCR 结果当成绝对准确值。

如果报告文件已经按规则命名，可以用 Python 脚本生成或刷新索引表：

```powershell
python "<skill-dir>\scripts\build_report_index.py" ".\检查报告\20260322住院" --output ".\检查报告\20260322住院\报告索引.md"
```

这个 Python 脚本适合在文件名已标准化之后使用，可用于刷新住院文档中的报告索引，或者在正式整理前快速生成文件夹清单。

## 文档结构建议

对于主文档：

- 只保留长期参考意义强的信息。
- 如果本次住院改变了整体状态，可以简要提一句。
- 不把本次所有化验结果都塞进主文档，而是链接到住院专用文档。

对于住院专用文档：

- 记录住院日期、触发事件、主要症状、即时处理、住院原因。
- 按检查类别分组，例如血气、乳酸、血氨、电解质、肝功、肾功、血常规、血药浓度、代谢相关项目。
- 增加简短解读，说明这次检查对后续医生最值得关注的结论。
- 增加可点击的报告索引表。

## 解读习惯

- 明确区分“原始报告中的确定值”和“OCR 推测值”。
- 如果整体看是正常的，简洁说明即可，不要过度解释。
- 如果检查结果并不支持感染、酸中毒、高血氨或器官损伤，也要清楚写出来。
- 如果病人有“癫痫后呕吐”这类反复出现的模式，适当把本次住院和这个长期模式联系起来。

## 完成前检查

1. 打开最终 markdown，确认前后叙述一致。
2. 确认所有引用的图片路径都存在。
3. 确认主文档仍然足够精炼，适合新医生快速扫读。
4. 确认主文档省略掉的时效性内容，已经写进住院专用文档。

## 相关本地 skill

- 如果用户要把当前主文档导出成 PDF，请使用 `[main-doc-pdf-export](../main-doc-pdf-export)`，不要把这一步混进本 skill。
