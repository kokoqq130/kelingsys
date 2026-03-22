from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re


SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".pdf"}
DATE_RE = re.compile(r"^(?P<date>\d{4}-\d{2}-\d{2})_(?P<title>.+)$")


@dataclass
class ReportFile:
    path: Path
    date: str
    title: str


def iter_report_files(folder: Path, recursive: bool):
    iterator = folder.rglob("*") if recursive else folder.iterdir()
    for path in iterator:
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS:
            yield path


def parse_report_file(path: Path) -> ReportFile:
    match = DATE_RE.match(path.stem)
    if match:
        return ReportFile(path=path, date=match.group("date"), title=match.group("title"))
    return ReportFile(path=path, date="待确认", title=path.stem)


def render_markdown(records: list[ReportFile], base_folder: Path, heading: str) -> str:
    lines = [f"**{heading}**", "", "| 日期 | 报告名称 | 原图 |", "| --- | --- | --- |"]
    if not records:
        lines.append("| 暂无 | 暂无 | 暂无 |")
        lines.append("")
        return "\n".join(lines)

    for record in records:
        rel = record.path.relative_to(base_folder).as_posix()
        lines.append(f"| {record.date} | {record.title} | [{record.path.name}](./{rel}) |")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a markdown index for a medical report folder.")
    parser.add_argument("folder", help="Folder containing report files")
    parser.add_argument("--recursive", action="store_true", help="Include files in subfolders")
    parser.add_argument("--heading", default="检查报告索引", help="Markdown heading text")
    parser.add_argument("--output", help="Optional output markdown path. Defaults to stdout.")
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        raise SystemExit(f"Folder not found: {folder}")

    records = sorted(
        (parse_report_file(path) for path in iter_report_files(folder, args.recursive)),
        key=lambda item: (item.date, item.title, item.path.name),
    )
    content = render_markdown(records, folder, args.heading)

    if args.output:
        output = Path(args.output).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content, encoding="utf-8")
        print(output)
    else:
        print(content)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
