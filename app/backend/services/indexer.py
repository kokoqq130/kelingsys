from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from config import DATA_ROOT, INDEX_DB_PATH, PROJECT_ROOT


DATE_RE = re.compile(r"(?P<year>\d{4})年(?P<month>\d{1,2})月(?:(?P<day>\d{1,2})日)?")
NUMBER_RE = re.compile(r"(?P<number>-?\d+(?:\.\d+)?)\s*(?P<unit>[A-Za-zµ/%·/\u4e00-\u9fff]+)?")
LINK_RE = re.compile(r"!\[[^\]]*]\((?P<path>[^)]+)\)|\[[^\]]*]\((?P<path_text>[^)]+)\)")


@dataclass
class FileRecord:
  relative_path: str
  file_name: str
  file_type: str
  ext: str
  size_bytes: int
  sha1: str
  updated_at: str


@dataclass
class DocumentRecord:
  relative_path: str
  doc_kind: str
  title: str
  content_text: str


def get_connection() -> sqlite3.Connection:
  INDEX_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
  connection = sqlite3.connect(INDEX_DB_PATH)
  connection.row_factory = sqlite3.Row
  return connection


def rebuild_index() -> None:
  connection = get_connection()
  try:
    _create_schema(connection)
    _clear_schema(connection)

    file_id_map: dict[str, int] = {}
    documents_to_parse: list[DocumentRecord] = []

    for path in _iter_source_files(PROJECT_ROOT):
      relative_path = path.relative_to(PROJECT_ROOT).as_posix()
      file_record = _build_file_record(path, relative_path)
      file_id = _insert_file(connection, file_record)
      file_id_map[relative_path] = file_id

      if file_record.file_type == "markdown":
        content = path.read_text(encoding="utf-8")
        documents_to_parse.append(
          DocumentRecord(
            relative_path=relative_path,
            doc_kind=_classify_doc_kind(path),
            title=_extract_title(content, path),
            content_text=content,
          )
        )

    for document in documents_to_parse:
      source_file_id = file_id_map[document.relative_path]
      document_id = _insert_document(connection, source_file_id, document)
      for link in _resolve_markdown_links(document, file_id_map):
        connection.execute(
          """
          INSERT INTO document_file_links (document_id, file_id, relation_type)
          VALUES (?, ?, ?)
          """,
          (document_id, link["file_id"], link["relation_type"]),
        )

      parsed = _parse_document(document)
      for event in parsed["events"]:
        connection.execute(
          """
          INSERT INTO events (
            event_date, event_date_text, event_time_text, event_type, title, summary,
            detail_text, is_hospitalized, source_document_id, source_file_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            event["event_date"],
            event["event_date_text"],
            event.get("event_time_text"),
            event["event_type"],
            event["title"],
            event["summary"],
            event["detail_text"],
            int(event["is_hospitalized"]),
            document_id,
            source_file_id,
          ),
        )

      for medication in parsed["medications"]:
        connection.execute(
          """
          INSERT INTO medications (
            name, category, dose_text, route, frequency, start_date, end_date,
            is_current, note, source_document_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            medication["name"],
            medication["category"],
            medication["dose_text"],
            medication.get("route"),
            medication.get("frequency"),
            medication.get("start_date"),
            medication.get("end_date"),
            int(medication.get("is_current", False)),
            medication.get("note"),
            document_id,
          ),
        )

      for lab in parsed["lab_results"]:
        connection.execute(
          """
          INSERT INTO lab_results (
            result_date, result_date_text, test_group, test_name, result_text,
            numeric_value, unit, status, is_approximate, source_document_id, source_file_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            lab["result_date"],
            lab["result_date_text"],
            lab["test_group"],
            lab["test_name"],
            lab["result_text"],
            lab.get("numeric_value"),
            lab.get("unit"),
            lab.get("status", "unknown"),
            int(lab.get("is_approximate", False)),
            document_id,
            source_file_id,
          ),
        )

      if parsed["overview"]:
        connection.execute(
          """
          INSERT OR REPLACE INTO summary_cache (cache_key, value_json)
          VALUES (?, ?)
          """,
          ("overview", json.dumps(parsed["overview"], ensure_ascii=False)),
        )

      connection.execute(
        """
        INSERT INTO documents_fts(rowid, title, content_text, relative_path)
        VALUES (?, ?, ?, ?)
        """,
        (document_id, document.title, document.content_text, document.relative_path),
      )

    connection.execute(
      """
      INSERT OR REPLACE INTO summary_cache (cache_key, value_json)
      VALUES (?, ?)
      """,
      (
        "index_meta",
        json.dumps(
          {
            "indexed_at": datetime.now().isoformat(timespec="seconds"),
            "file_count": len(file_id_map),
            "document_count": len(documents_to_parse),
          },
          ensure_ascii=False,
        ),
      ),
    )

    connection.commit()
  finally:
    connection.close()


def _create_schema(connection: sqlite3.Connection) -> None:
  connection.executescript(
    """
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relative_path TEXT UNIQUE NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      ext TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sha1 TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      doc_kind TEXT NOT NULL,
      title TEXT NOT NULL,
      content_text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date TEXT,
      event_date_text TEXT,
      event_time_text TEXT,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      detail_text TEXT NOT NULL,
      is_hospitalized INTEGER NOT NULL DEFAULT 0,
      source_document_id INTEGER NOT NULL,
      source_file_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      dose_text TEXT NOT NULL,
      route TEXT,
      frequency TEXT,
      start_date TEXT,
      end_date TEXT,
      is_current INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      source_document_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_date TEXT,
      result_date_text TEXT,
      test_group TEXT NOT NULL,
      test_name TEXT NOT NULL,
      result_text TEXT NOT NULL,
      numeric_value REAL,
      unit TEXT,
      status TEXT NOT NULL,
      is_approximate INTEGER NOT NULL DEFAULT 0,
      source_document_id INTEGER NOT NULL,
      source_file_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_file_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      relation_type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS summary_cache (
      cache_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts
    USING fts5(title, content_text, relative_path, tokenize = 'unicode61');
    """
  )


def _clear_schema(connection: sqlite3.Connection) -> None:
  connection.executescript(
    """
    DELETE FROM files;
    DELETE FROM documents;
    DELETE FROM events;
    DELETE FROM medications;
    DELETE FROM lab_results;
    DELETE FROM document_file_links;
    DELETE FROM summary_cache;
    DELETE FROM documents_fts;
    """
  )


def _iter_source_files(root: Path) -> Iterable[Path]:
  for path in sorted(DATA_ROOT.rglob("*")):
    if path.is_file() and path.suffix.lower() in {".md", ".jpg", ".jpeg", ".png", ".pdf"}:
      yield path


def _build_file_record(path: Path, relative_path: str) -> FileRecord:
  data = path.read_bytes()
  return FileRecord(
    relative_path=relative_path,
    file_name=path.name,
    file_type=_classify_file_type(path),
    ext=path.suffix.lower().lstrip("."),
    size_bytes=path.stat().st_size,
    sha1=hashlib.sha1(data).hexdigest(),
    updated_at=datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds"),
  )


def _classify_file_type(path: Path) -> str:
  suffix = path.suffix.lower()
  if suffix == ".md":
    return "markdown"
  if suffix in {".jpg", ".jpeg", ".png"}:
    return "image"
  if suffix == ".pdf":
    return "pdf"
  return "other"


def _classify_doc_kind(path: Path) -> str:
  if path.name == "柯灵基本信息.md":
    return "main_summary"
  if path.name.endswith("住院整理.md"):
    return "admission_note"
  if path.name == "报告索引.md":
    return "report_index"
  return "other"


def _extract_title(content: str, path: Path) -> str:
  for line in content.splitlines():
    plain = _plain_text(line)
    if plain:
      return plain
  return path.stem


def _plain_text(value: str) -> str:
  text = value.strip()
  text = text.replace("**", "").replace("*", "")
  return text.strip()


def _insert_file(connection: sqlite3.Connection, record: FileRecord) -> int:
  cursor = connection.execute(
    """
    INSERT INTO files (relative_path, file_name, file_type, ext, size_bytes, sha1, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
    (
      record.relative_path,
      record.file_name,
      record.file_type,
      record.ext,
      record.size_bytes,
      record.sha1,
      record.updated_at,
    ),
  )
  return int(cursor.lastrowid)


def _insert_document(connection: sqlite3.Connection, file_id: int, document: DocumentRecord) -> int:
  cursor = connection.execute(
    """
    INSERT INTO documents (file_id, doc_kind, title, content_text)
    VALUES (?, ?, ?, ?)
    """,
    (file_id, document.doc_kind, document.title, document.content_text),
  )
  return int(cursor.lastrowid)


def _resolve_markdown_links(document: DocumentRecord, file_id_map: dict[str, int]) -> list[dict[str, int | str]]:
  source_path = PROJECT_ROOT / document.relative_path
  links: list[dict[str, int | str]] = []

  for match in LINK_RE.finditer(document.content_text):
    raw_path = (match.group("path") or match.group("path_text") or "").strip()
    if raw_path.startswith("http"):
      continue

    target_path = (source_path.parent / raw_path).resolve()
    try:
      relative_target = target_path.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
      continue

    file_id = file_id_map.get(relative_target)
    if not file_id:
      continue

    relation_type = "image_ref" if match.group(0).startswith("!") else "source_ref"
    links.append({"file_id": file_id, "relation_type": relation_type})

  return links


def _parse_document(document: DocumentRecord) -> dict[str, list[dict] | dict | None]:
  if document.doc_kind == "main_summary":
    return _parse_main_summary(document)
  if document.doc_kind == "admission_note":
    return _parse_admission_note(document)
  return {"overview": None, "events": [], "medications": [], "lab_results": []}


def _parse_main_summary(document: DocumentRecord) -> dict[str, list[dict] | dict]:
  overview = {
    "patient": {},
    "main_issue": "",
    "current_status": "",
    "diagnoses": [],
    "highlights": [],
    "current_medications": [],
  }
  events: list[dict] = []
  medications: list[dict] = []
  lab_results: list[dict] = []

  lines = document.content_text.splitlines()
  section = ""
  current_category = ""
  current_history_date = ""
  recent_event_mode = False

  for raw_line in lines:
    stripped = raw_line.strip()
    if not stripped:
      continue

    plain = _plain_text(stripped)

    if plain.startswith("一、"):
      section = "core"
      recent_event_mode = False
      continue
    if plain.startswith("二、"):
      section = "basic"
      recent_event_mode = False
      continue
    if plain.startswith("三、"):
      section = "diagnosis"
      continue
    if plain.startswith("四、"):
      section = "medications"
      recent_event_mode = False
      continue
    if plain.startswith("五、"):
      section = "history"
      recent_event_mode = False
      continue
    if plain.startswith("六、") or plain.startswith("七、") or plain.startswith("八、"):
      section = "other"
      recent_event_mode = False
      continue

    if section == "core":
      if plain.startswith("- 主要问题："):
        overview["main_issue"] = plain.split("：", 1)[1].strip()
      elif plain.startswith("- 当前状态："):
        overview["current_status"] = plain.split("：", 1)[1].strip()

    elif section == "basic":
      if "：" in plain and plain.startswith("- "):
        key, value = plain[2:].split("：", 1)
        overview["patient"][key.strip()] = value.strip()

    elif section == "diagnosis":
      if re.match(r"^\d+\.", plain):
        diagnosis_name = plain.split(".", 1)[1].strip()
        overview["diagnoses"].append({"name": diagnosis_name})
      elif plain.startswith("- 确诊时间：") and overview["diagnoses"]:
        overview["diagnoses"][-1]["diagnosed_at"] = plain.split("：", 1)[1].strip()
      elif "近期发作情况" in plain:
        recent_event_mode = True
      elif recent_event_mode and plain.startswith("- "):
        summary = plain[2:].strip()
        date_text, event_date = _extract_date(summary)
        events.append(
          {
            "event_date": event_date,
            "event_date_text": date_text,
            "event_time_text": None,
            "event_type": "seizure",
            "title": "癫痫发作",
            "summary": summary,
            "detail_text": summary,
            "is_hospitalized": "住院" in summary,
          }
        )
        medication_names = _extract_medication_names(summary)
        if medication_names and any(keyword in summary for keyword in ["加", "减", "开始", "停", "调整", "完全减完"]):
          events.append(
            {
              "event_date": event_date,
              "event_date_text": date_text,
              "event_time_text": None,
              "event_type": "medication_adjustment",
              "title": "调药",
              "summary": summary,
              "detail_text": "涉及药物：" + "、".join(medication_names),
              "is_hospitalized": "住院" in summary,
            }
          )

    elif section == "medications":
      if plain.startswith("- ") and plain.endswith("：") and "治疗" in plain:
        current_category = plain[2:-1].strip()
      elif plain.startswith("- ") and "：" in plain and current_category:
        name, dose_text = plain[2:].split("：", 1)
        record = {
          "name": name.strip(),
          "category": current_category,
          "dose_text": dose_text.strip(),
          "route": None,
          "frequency": None,
          "start_date": None,
          "end_date": None,
          "is_current": True,
          "note": None,
        }
        medications.append(record)
        overview["current_medications"].append(record)

    elif section == "history":
      if plain.startswith("- 既往代谢指标（"):
        date_text, current_history_date = _extract_date(plain)
      elif plain.startswith("- ") and current_history_date:
        result_line = plain[2:].strip()
        lab_record = _build_lab_record(
          test_group="长期参考",
          test_name=result_line.split("：", 1)[0].strip(),
          result_text=result_line,
          result_date=current_history_date,
          result_date_text=date_text if (date_text := _format_display_date(current_history_date)) else "",
          is_approximate=False,
        )
        if lab_record:
          lab_results.append(lab_record)
      elif plain.startswith("- "):
        overview["highlights"].append(plain[2:].strip())

  return {
    "overview": overview,
    "events": events,
    "medications": medications,
    "lab_results": lab_results,
  }


def _parse_admission_note(document: DocumentRecord) -> dict[str, list[dict] | dict | None]:
  events: list[dict] = []
  labs: list[dict] = []
  lines = document.content_text.splitlines()
  section = ""
  admission_date = ""
  admission_date_text = ""
  main_event = ""
  treatment = ""
  symptoms = ""
  current_lab_name = ""
  current_lab_details: list[str] = []

  def flush_lab() -> None:
    nonlocal current_lab_name, current_lab_details
    if not current_lab_name:
      return
    result_text = "；".join(current_lab_details)
    lab_record = _build_lab_record(
      test_group="本次住院",
      test_name=current_lab_name,
      result_text=result_text,
      result_date=admission_date,
      result_date_text=admission_date_text,
      is_approximate="约" in result_text,
    )
    if lab_record:
      labs.append(lab_record)
    current_lab_name = ""
    current_lab_details = []

  for raw_line in lines:
    stripped = raw_line.strip()
    if not stripped:
      continue

    plain = _plain_text(stripped)
    indent = len(raw_line) - len(raw_line.lstrip(" "))

    if plain.startswith("一、"):
      flush_lab()
      section = "overview"
      continue
    if plain.startswith("二、"):
      flush_lab()
      section = "labs"
      continue
    if plain.startswith("三、") or plain.startswith("四、") or plain.startswith("五、"):
      flush_lab()
      section = "other"
      continue

    if section == "overview":
      if plain.startswith("- 住院时间："):
        admission_date_text = plain.split("：", 1)[1].strip("。 ")
        _, admission_date = _extract_date(admission_date_text)
      elif plain.startswith("- 本次主要事件："):
        main_event = plain.split("：", 1)[1].strip()
      elif plain.startswith("- 处置经过："):
        treatment = plain.split("：", 1)[1].strip()
      elif plain.startswith("- 本次住院主要症状："):
        symptoms = plain.split("：", 1)[1].strip()

    elif section == "labs":
      if indent == 0 and plain.startswith("- ") and stripped.startswith("- **"):
        flush_lab()
        current_lab_name = plain[2:].strip()
      elif indent > 0 and plain.startswith("- ") and current_lab_name:
        current_lab_details.append(plain[2:].strip())

  flush_lab()

  if admission_date:
    events.append(
      {
        "event_date": admission_date,
        "event_date_text": admission_date_text,
        "event_time_text": None,
        "event_type": "admission",
        "title": "住院",
        "summary": symptoms or main_event or "本次住院记录",
        "detail_text": "；".join(filter(None, [main_event, treatment, symptoms])),
        "is_hospitalized": True,
      }
    )

  if main_event:
    events.append(
      {
        "event_date": admission_date,
        "event_date_text": admission_date_text,
        "event_time_text": _extract_time_text(main_event),
        "event_type": "seizure",
        "title": "本次癫痫发作",
        "summary": main_event,
        "detail_text": "；".join(filter(None, [main_event, treatment, symptoms])),
        "is_hospitalized": True,
      }
    )

  if labs:
    abnormal_labs = [lab["test_name"] for lab in labs if lab["status"] in {"high", "low"}]
    summary = f"本次住院共整理 {len(labs)} 项检查结果"
    if abnormal_labs:
      summary += "，其中需要重点关注：" + "、".join(abnormal_labs[:4])
    events.append(
      {
        "event_date": admission_date,
        "event_date_text": admission_date_text,
        "event_time_text": None,
        "event_type": "lab",
        "title": "本次住院检查汇总",
        "summary": summary,
        "detail_text": "；".join(lab["test_name"] for lab in labs),
        "is_hospitalized": True,
      }
    )

  return {"overview": None, "events": events, "medications": [], "lab_results": labs}


def _build_lab_record(
  *,
  test_group: str,
  test_name: str,
  result_text: str,
  result_date: str,
  result_date_text: str,
  is_approximate: bool,
) -> dict | None:
  number_match = NUMBER_RE.search(result_text)
  numeric_value = float(number_match.group("number")) if number_match else None
  unit = number_match.group("unit").strip() if number_match and number_match.group("unit") else None
  status = _infer_status(result_text)

  return {
    "result_date": result_date,
    "result_date_text": result_date_text,
    "test_group": test_group,
    "test_name": test_name,
    "result_text": result_text,
    "numeric_value": numeric_value,
    "unit": unit,
    "status": status,
    "is_approximate": is_approximate,
  }


def _infer_status(result_text: str) -> str:
  if any(keyword in result_text for keyword in ["偏高", "升高", "略高"]):
    return "high"
  if any(keyword in result_text for keyword in ["偏低", "降低", "略低"]):
    return "low"
  if any(keyword in result_text for keyword in ["正常", "未见明显", "稳定", "平稳"]):
    return "normal"
  return "unknown"


def _extract_date(text: str) -> tuple[str, str]:
  match = DATE_RE.search(text)
  if not match:
    return "", ""
  year = int(match.group("year"))
  month = int(match.group("month"))
  day = int(match.group("day") or 1)
  iso_date = f"{year:04d}-{month:02d}-{day:02d}"
  return match.group(0), iso_date


def _format_display_date(iso_date: str) -> str:
  if not iso_date:
    return ""
  year, month, day = iso_date.split("-")
  if day == "01":
    return f"{year}年{int(month)}月"
  return f"{year}年{int(month)}月{int(day)}日"


def _extract_time_text(text: str) -> str | None:
  time_match = re.search(r"(\d{1,2}点(?:\d{1,2}分)?)", text)
  return time_match.group(1) if time_match else None


def _extract_medication_names(text: str) -> list[str]:
  known_names = [
    "羟钴胺",
    "左卡尼汀",
    "亚叶酸钙",
    "妥泰",
    "托吡酯",
    "拉考沙胺",
    "左乙拉西坦",
    "吡仑帕奈",
    "甜菜碱",
    "地西泮",
  ]
  return [name for name in known_names if name in text]
