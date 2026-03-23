from __future__ import annotations

import argparse
import json
import os
import shutil
import statistics
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

from paddleocr import PaddleOCR


SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


@dataclass
class OcrBlock:
    text: str
    score: float | None
    left: float
    top: float
    right: float
    bottom: float

    @property
    def center_y(self) -> float:
        return (self.top + self.bottom) / 2

    @property
    def height(self) -> float:
        return self.bottom - self.top


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run PaddleOCR on one file or a folder of medical report images.")
    parser.add_argument("--path", required=True, help="File or directory to OCR")
    parser.add_argument("--recurse", action="store_true", help="Recurse into subfolders when PATH is a directory")
    parser.add_argument("--format", choices=("text", "markdown", "json"), default="text")
    parser.add_argument("--output-path", help="Optional output file path")
    return parser.parse_args()


def iter_input_files(input_path: Path, recursive: bool) -> list[Path]:
    resolved = input_path.resolve()
    if not resolved.exists():
        raise SystemExit(f"Path not found: {resolved}")

    if resolved.is_dir():
        iterator: Iterable[Path] = resolved.rglob("*") if recursive else resolved.iterdir()
        files = [
            path
            for path in iterator
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS
        ]
        return sorted(files)

    if resolved.suffix.lower() not in SUPPORTED_EXTS:
        raise SystemExit(f"Unsupported file type: {resolved.suffix}")

    return [resolved]


def polygon_bounds(points: list[list[float]]) -> tuple[float, float, float, float]:
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def normalize_blocks(result: dict) -> list[OcrBlock]:
    texts = result.get("rec_texts") or []
    scores = result.get("rec_scores") or []
    polygons = result.get("rec_polys") or result.get("dt_polys") or []

    blocks: list[OcrBlock] = []
    for index, text in enumerate(texts):
        if not text:
            continue
        polygon = polygons[index] if index < len(polygons) else None
        if polygon is not None and len(polygon) > 0:
            left, top, right, bottom = polygon_bounds(polygon)
        else:
            left = top = right = bottom = 0.0

        score = scores[index] if index < len(scores) else None
        blocks.append(
            OcrBlock(
                text=str(text).strip(),
                score=float(score) if score is not None else None,
                left=float(left),
                top=float(top),
                right=float(right),
                bottom=float(bottom),
            )
        )

    return blocks


def group_blocks_into_lines(blocks: list[OcrBlock]) -> list[str]:
    if not blocks:
        return []

    heights = [block.height for block in blocks if block.height > 0]
    tolerance = max(12.0, statistics.median(heights) * 0.6) if heights else 16.0

    rows: list[list[OcrBlock]] = []
    row_centers: list[float] = []

    for block in sorted(blocks, key=lambda item: (item.top, item.left)):
        placed = False
        for index, center in enumerate(row_centers):
            if abs(block.center_y - center) <= tolerance:
                rows[index].append(block)
                row_centers[index] = statistics.mean(item.center_y for item in rows[index])
                placed = True
                break

        if not placed:
            rows.append([block])
            row_centers.append(block.center_y)

    lines: list[str] = []
    for row in sorted(zip(row_centers, rows), key=lambda item: item[0]):
        ordered = sorted(row[1], key=lambda item: item.left)
        line = " ".join(block.text for block in ordered if block.text).strip()
        if line:
            lines.append(line)

    return lines


def render_text(items: list[dict]) -> str:
    sections = []
    for item in items:
        sections.append("===FILE===")
        sections.append(item["file_name"])
        sections.append("===TEXT===")
        sections.append(item["text"])
    return "\n".join(sections)


def render_markdown(items: list[dict]) -> str:
    sections = []
    for item in items:
        sections.append(f"## {item['file_name']}")
        sections.append("")
        sections.append("```text")
        sections.append(item["text"])
        sections.append("```")
    return "\n".join(sections)


def build_record(path: Path, ocr: PaddleOCR, temp_dir: Path, index: int) -> dict:
    temp_path = temp_dir / f"ocr_input_{index:04d}{path.suffix.lower()}"
    shutil.copy2(path, temp_path)

    result = ocr.predict(str(temp_path))[0]
    blocks = normalize_blocks(result)
    lines = group_blocks_into_lines(blocks)
    text = "\n".join(lines)

    return {
        "file_name": path.name,
        "full_path": str(path),
        "text": text,
        "lines": lines,
        "blocks": [
            {
                "text": block.text,
                "score": block.score,
                "left": block.left,
                "top": block.top,
                "right": block.right,
                "bottom": block.bottom,
            }
            for block in blocks
        ],
    }


def main() -> int:
    args = parse_args()
    files = iter_input_files(Path(args.path), args.recurse)
    if not files:
        raise SystemExit(f"No supported image files found under: {Path(args.path).resolve()}")

    ocr = PaddleOCR(
        lang="ch",
        device="cpu",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )

    with tempfile.TemporaryDirectory(prefix="medical-ocr-") as temp_root:
        temp_dir = Path(temp_root)
        records = [
            build_record(path, ocr, temp_dir, index)
            for index, path in enumerate(files, start=1)
        ]

    if args.format == "json":
        content = json.dumps(records, ensure_ascii=False, indent=2)
    elif args.format == "markdown":
        content = render_markdown(records)
    else:
        content = render_text(records)

    if args.output_path:
        output_path = Path(args.output_path).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")
        print(output_path)
    else:
        print(content)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
