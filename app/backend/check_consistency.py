from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote
from urllib.request import Request, urlopen

from config import DATA_ROOT, PROJECT_ROOT
from services.indexer import get_connection, rebuild_index
from services.query_service import QueryService


LINK_RE = re.compile(r"!?\[[^\]]*\]\((?P<target>[^)]+)\)")


def main() -> int:
  errors: list[str] = []
  warnings: list[str] = []
  notes: list[str] = []

  if not DATA_ROOT.exists():
    errors.append(f"医疗资料目录不存在：{DATA_ROOT}")
    return report(errors, warnings, notes)

  main_doc = DATA_ROOT / "柯灵基本信息.md"
  if not main_doc.exists():
    errors.append(f"缺少主文档：{main_doc}")
  else:
    content = main_doc.read_text(encoding="utf-8")
    if "目前治疗方案" not in content:
      errors.append("主文档缺少“目前治疗方案”章节。")
    if not re.search(r"目前治疗方案[\s\S]{0,300}(?:截至|按20\d{2}年\d{1,2}月\d{1,2}日)", content):
      warnings.append("主文档当前治疗方案附近没有识别到明确截至日期。")

  broken_links: list[str] = []
  link_count = 0
  for markdown_path in DATA_ROOT.rglob("*.md"):
    text = markdown_path.read_text(encoding="utf-8")
    for match in LINK_RE.finditer(text):
      target = unquote(match.group("target").strip().split("#", 1)[0])
      if not target or target.startswith(("http://", "https://", "mailto:")):
        continue
      link_count += 1
      resolved = (markdown_path.parent / target).resolve()
      if not resolved.exists():
        broken_links.append(f"{markdown_path.relative_to(DATA_ROOT)} -> {target}")
  if broken_links:
    errors.extend(f"Markdown链接失效：{item}" for item in broken_links)
  else:
    notes.append(f"已检查 {link_count} 个Markdown本地链接，未发现失效链接。")

  rebuild_index()
  with get_connection() as connection:
    service = QueryService(connection)
    overview = service.get_overview()
    periods = service.get_admission_periods()
    medications = service.get_medications().get("current", [])

    if not periods:
      warnings.append("索引中没有识别到住院周期。")
    else:
      latest = periods[0]
      notes.append(f"最新住院周期：{latest.get('period_text') or latest.get('admission_date_text')}")
      for key, label in [
        ("admission_reason", "入院原因"),
        ("main_event", "主要事件/发作经过"),
        ("treatment", "住院处理"),
        ("symptoms", "主要症状"),
      ]:
        if not latest.get(key):
          warnings.append(f"最新住院周期未抽取到{label}：{latest.get('title', '')}")

    if not medications:
      errors.append("没有从主文档识别到当前用药。")
    else:
      duplicate_names = sorted(
        name for name in {item["name"] for item in medications}
        if sum(1 for item in medications if item["name"] == name) > 1
      )
      if duplicate_names:
        warnings.append("当前用药出现重复名称：" + "、".join(duplicate_names))
      notes.append(f"已识别当前用药 {len(medications)} 项。")

    latest_admission = overview.get("latest_admission")
    if periods and latest_admission and latest_admission.get("id") != periods[0].get("id"):
      errors.append("总览中的最近住院与住院列表排序结果不一致。")

  pdf_path = DATA_ROOT / "柯灵基本信息.pdf"
  if main_doc.exists() and pdf_path.exists() and main_doc.stat().st_mtime > pdf_path.stat().st_mtime:
    warnings.append("主Markdown比PDF新，PDF已过期；只有用户确认后才能刷新。")

  for derived_dir in [
    PROJECT_ROOT / "app" / "frontend" / ".share-public",
    PROJECT_ROOT / "app" / "frontend" / "dist",
  ]:
    if derived_dir.exists() and main_doc.exists():
      newest = max((p.stat().st_mtime for p in derived_dir.rglob("*") if p.is_file()), default=0)
      if newest and newest < main_doc.stat().st_mtime:
        warnings.append(f"旧派生产物已过期，可删除或重新生成，但不要直接发布：{derived_dir}")

  legacy_ocr_env = PROJECT_ROOT / "data" / "ocr-rerun" / ".venv-paddleocr"
  if legacy_ocr_env.exists():
    warnings.append(f"仍存在旧OCR虚拟环境，确认无依赖后可删除：{legacy_ocr_env}")

  empty_runtime_db = PROJECT_ROOT / "data" / "runtime" / "index.db"
  if empty_runtime_db.exists() and empty_runtime_db.stat().st_size == 0:
    warnings.append(f"存在0字节历史索引文件，确认无依赖后可删除：{empty_runtime_db}")

  try:
    DATA_ROOT.relative_to(PROJECT_ROOT)
  except ValueError:
    notes.append("医疗资料已位于代码仓库外，隔离状态较好。")
  else:
    warnings.append("医疗资料仍位于Git工作区内，必须确保远程仓库为Private。")

  check_github_visibility(errors, warnings, notes)

  return report(errors, warnings, notes)


def check_github_visibility(errors: list[str], warnings: list[str], notes: list[str]) -> None:
  try:
    result = subprocess.run(
      ["git", "config", "--get", "remote.origin.url"],
      cwd=PROJECT_ROOT,
      capture_output=True,
      text=True,
      timeout=5,
      check=False,
    )
  except (OSError, subprocess.SubprocessError):
    return

  remote_url = result.stdout.strip()
  match = re.search(r"github\.com[/:](?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?$", remote_url)
  if not match:
    return

  repository = f"{match.group('owner')}/{match.group('repo')}"
  request = Request(
    f"https://api.github.com/repos/{repository}",
    headers={"User-Agent": "keling-consistency-check"},
  )
  try:
    with urlopen(request, timeout=5) as response:
      payload = json.loads(response.read().decode("utf-8"))
  except HTTPError as exc:
    if exc.code == 404:
      notes.append("GitHub远程仓库未被匿名访问到，可能已设为Private。")
    else:
      warnings.append(f"无法核对GitHub仓库可见性：HTTP {exc.code}")
    return
  except (URLError, TimeoutError, ValueError):
    warnings.append("当前无法联网核对GitHub仓库可见性，请人工确认仓库为Private。")
    return

  if payload.get("private") is False or payload.get("visibility") == "public":
    errors.append(f"GitHub远程仓库仍为Public：{repository}。请立即改为Private。")
  else:
    notes.append(f"GitHub远程仓库可见性：{payload.get('visibility', 'private')}")


def report(errors: list[str], warnings: list[str], notes: list[str]) -> int:
  print("=== 柯灵资料一致性检查 ===")
  for item in notes:
    print(f"[OK] {item}")
  for item in warnings:
    print(f"[WARN] {item}")
  for item in errors:
    print(f"[ERROR] {item}")
  print(f"结果：{len(errors)} 个错误，{len(warnings)} 个警告。")
  return 1 if errors else 0


if __name__ == "__main__":
  sys.exit(main())
