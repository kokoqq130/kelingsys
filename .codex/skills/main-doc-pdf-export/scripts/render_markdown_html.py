from __future__ import annotations

import argparse
import html
import re
from pathlib import Path


INLINE_CODE_RE = re.compile(r"`([^`]+)`")
BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
ITALIC_RE = re.compile(r"(?<!\*)\*([^*\n]+)\*(?!\*)")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
ORDERED_RE = re.compile(r"^\d+\.\s+(.*)$")
UNORDERED_RE = re.compile(r"^-\s+(.*)$")
STRONG_LINE_RE = re.compile(r"^\*\*(.+)\*\*$")
EM_LINE_RE = re.compile(r"^\*(.+)\*$")


def transform_inline(text: str) -> str:
    text = html.escape(text, quote=False)
    text = INLINE_CODE_RE.sub(lambda m: f"<code>{m.group(1)}</code>", text)
    text = BOLD_RE.sub(lambda m: f"<strong>{m.group(1)}</strong>", text)
    text = ITALIC_RE.sub(lambda m: f"<em>{m.group(1)}</em>", text)
    text = LINK_RE.sub(lambda m: f'<a href="{html.escape(m.group(2), quote=True)}">{m.group(1)}</a>', text)
    return text


def render_table(lines: list[str]) -> str:
    rows = []
    for line in lines:
        parts = [cell.strip() for cell in line.strip().strip("|").split("|")]
        rows.append(parts)
    if len(rows) >= 2 and all(set(cell) <= {"-", ":"} for cell in rows[1]):
        header = rows[0]
        body = rows[2:]
    else:
        header = rows[0]
        body = rows[1:]
    thead = "<thead><tr>" + "".join(f"<th>{transform_inline(cell)}</th>" for cell in header) + "</tr></thead>"
    tbody_rows = []
    for row in body:
        tbody_rows.append("<tr>" + "".join(f"<td>{transform_inline(cell)}</td>" for cell in row) + "</tr>")
    tbody = "<tbody>" + "".join(tbody_rows) + "</tbody>"
    return f"<table>{thead}{tbody}</table>"


def render_image(line: str) -> str:
    match = IMAGE_RE.fullmatch(line.strip())
    if not match:
        return ""
    alt, src = match.groups()
    return f'<figure><img src="{html.escape(src, quote=True)}" alt="{html.escape(alt, quote=True)}"></figure>'


def render_markdown(markdown_text: str) -> str:
    lines = markdown_text.splitlines()
    blocks: list[str] = []
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped.startswith("```"):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1
            blocks.append("<pre><code>" + html.escape("\n".join(code_lines)) + "</code></pre>")
            continue

        if stripped.startswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i])
                i += 1
            blocks.append(render_table(table_lines))
            continue

        if IMAGE_RE.fullmatch(stripped):
            blocks.append(render_image(stripped))
            i += 1
            continue

        strong_match = STRONG_LINE_RE.fullmatch(stripped)
        if strong_match:
            blocks.append(f"<h2>{transform_inline(strong_match.group(1))}</h2>")
            i += 1
            continue

        em_match = EM_LINE_RE.fullmatch(stripped)
        if em_match:
            blocks.append(f"<p class=\"meta\"><em>{transform_inline(em_match.group(1))}</em></p>")
            i += 1
            continue

        unordered_match = UNORDERED_RE.match(stripped)
        if unordered_match:
            items = []
            while i < len(lines):
                candidate = lines[i].strip()
                match = UNORDERED_RE.match(candidate)
                if not match:
                    break
                items.append(f"<li>{transform_inline(match.group(1))}</li>")
                i += 1
            blocks.append("<ul>" + "".join(items) + "</ul>")
            continue

        ordered_match = ORDERED_RE.match(stripped)
        if ordered_match:
            items = []
            while i < len(lines):
                candidate = lines[i].strip()
                match = ORDERED_RE.match(candidate)
                if not match:
                    break
                items.append(f"<li>{transform_inline(match.group(1))}</li>")
                i += 1
            blocks.append("<ol>" + "".join(items) + "</ol>")
            continue

        paragraph_lines = [stripped]
        i += 1
        while i < len(lines):
            candidate = lines[i].strip()
            if not candidate:
                break
            if candidate.startswith(("```", "|")):
                break
            if IMAGE_RE.fullmatch(candidate):
                break
            if STRONG_LINE_RE.fullmatch(candidate) or EM_LINE_RE.fullmatch(candidate):
                break
            if UNORDERED_RE.match(candidate) or ORDERED_RE.match(candidate):
                break
            paragraph_lines.append(candidate)
            i += 1
        blocks.append(f"<p>{transform_inline(' '.join(paragraph_lines))}</p>")

    return "\n".join(blocks)


def build_html(body: str, title: str) -> str:
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    body {{
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
      line-height: 1.65;
      color: #1f2328;
      margin: 32px auto;
      max-width: 860px;
      padding: 0 24px 48px;
      background: #fff;
    }}
    h1, h2, h3 {{ color: #0f172a; margin-top: 1.2em; }}
    h2 {{
      font-size: 1.18rem;
      border-bottom: 1px solid #d0d7de;
      padding-bottom: 0.25rem;
    }}
    p {{ margin: 0.5rem 0; }}
    p.meta {{ color: #57606a; }}
    ul, ol {{ padding-left: 1.5rem; }}
    li {{ margin: 0.22rem 0; }}
    code, pre {{
      font-family: Consolas, "Cascadia Mono", monospace;
      background: #f6f8fa;
    }}
    code {{ padding: 0.08rem 0.28rem; border-radius: 4px; }}
    pre {{
      padding: 12px;
      border-radius: 8px;
      overflow: auto;
      white-space: pre-wrap;
    }}
    table {{
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
      font-size: 0.95rem;
    }}
    th, td {{
      border: 1px solid #d0d7de;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }}
    th {{ background: #f6f8fa; }}
    img {{
      max-width: 100%;
      height: auto;
      display: block;
      margin: 12px auto;
    }}
    figure {{ margin: 16px 0; }}
    a {{ color: #0969da; text-decoration: none; }}
  </style>
</head>
<body>
{body}
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Render a simple markdown document to self-contained HTML.")
    parser.add_argument("markdown_path")
    parser.add_argument("html_output")
    args = parser.parse_args()

    md_path = Path(args.markdown_path).resolve()
    html_path = Path(args.html_output).resolve()
    markdown_text = md_path.read_text(encoding="utf-8")
    body = render_markdown(markdown_text)
    title = md_path.stem
    html_path.write_text(build_html(body, title), encoding="utf-8")
    print(html_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
