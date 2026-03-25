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
NUMBER_RE = re.compile(r"(?P<number>-?\d+(?:\.\d+)?)\s*(?P<unit>[A-Za-zµμ/%·/\u4e00-\u9fff]+)?")
LINK_RE = re.compile(r"!\[[^\]]*]\((?P<path>[^)]+)\)|\[[^\]]*]\((?P<path_text>[^)]+)\)")
METRIC_CHUNK_SPLIT_RE = re.compile(r"[，,；。]")
GENERIC_METRIC_NAMES = {"结果", "数值", "值"}
DERIVED_METRIC_SUFFIXES = ("比例", "绝对值")


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
      admission_period_id_map: dict[str, int] = {}
      for admission_period in parsed["admission_periods"]:
        period_id = _upsert_admission_period(
          connection=connection,
          admission_period=admission_period,
          source_document_id=document_id,
          source_file_id=source_file_id,
        )
        admission_period_id_map[admission_period["cycle_key"]] = period_id

      for event in parsed["events"]:
        connection.execute(
          """
          INSERT INTO events (
            event_date, event_date_text, event_time_text, event_type, title, summary,
            detail_text, is_hospitalized, admission_period_id, source_document_id, source_file_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            admission_period_id_map.get(event.get("admission_cycle_key", "")),
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
            result_date, result_date_text, test_group, panel_name, test_name, result_text,
            numeric_value, unit, status, is_approximate, source_document_id, source_file_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            lab["result_date"],
            lab["result_date_text"],
            lab["test_group"],
            lab["panel_name"],
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

    DROP TABLE IF EXISTS events;

    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date TEXT,
      event_date_text TEXT,
      event_time_text TEXT,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      detail_text TEXT NOT NULL,
      is_hospitalized INTEGER NOT NULL DEFAULT 0,
      admission_period_id INTEGER,
      source_document_id INTEGER NOT NULL,
      source_file_id INTEGER NOT NULL
    );

    DROP TABLE IF EXISTS admission_periods;

    CREATE TABLE admission_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_key TEXT UNIQUE NOT NULL,
      folder_path TEXT NOT NULL,
      title TEXT NOT NULL,
      admission_date TEXT,
      admission_date_text TEXT,
      discharge_date TEXT,
      discharge_date_text TEXT,
      period_text TEXT NOT NULL,
      status TEXT,
      summary TEXT NOT NULL,
      admission_reason TEXT,
      main_event TEXT,
      treatment TEXT,
      symptoms TEXT,
      medication_change TEXT,
      discharge_summary TEXT,
      detail_text TEXT NOT NULL,
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

    DROP TABLE IF EXISTS lab_results;

    CREATE TABLE lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_date TEXT,
      result_date_text TEXT,
      test_group TEXT NOT NULL,
      panel_name TEXT NOT NULL,
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
    DELETE FROM admission_periods;
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
  if "出院" in path.stem and "小结" in path.stem:
    return "discharge_summary"
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


def _clean_field_value(value: str) -> str:
  return value.strip().strip("。 ")


def _none_if_empty(value: str | None) -> str | None:
  return value or None


def _build_admission_cycle_key(relative_path: str) -> str:
  folder_path = Path(relative_path).parent.as_posix()
  return folder_path if folder_path not in {"", "."} else relative_path


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


def _upsert_admission_period(
  *,
  connection: sqlite3.Connection,
  admission_period: dict,
  source_document_id: int,
  source_file_id: int,
) -> int:
  connection.execute(
    """
    INSERT INTO admission_periods (
      cycle_key, folder_path, title, admission_date, admission_date_text,
      discharge_date, discharge_date_text, period_text, status, summary,
      admission_reason, main_event, treatment, symptoms, medication_change,
      discharge_summary, detail_text, source_document_id, source_file_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cycle_key) DO UPDATE SET
      folder_path = excluded.folder_path,
      title = excluded.title,
      admission_date = COALESCE(excluded.admission_date, admission_periods.admission_date),
      admission_date_text = COALESCE(excluded.admission_date_text, admission_periods.admission_date_text),
      discharge_date = COALESCE(excluded.discharge_date, admission_periods.discharge_date),
      discharge_date_text = COALESCE(excluded.discharge_date_text, admission_periods.discharge_date_text),
      period_text = CASE
        WHEN excluded.period_text <> '' THEN excluded.period_text
        ELSE admission_periods.period_text
      END,
      status = COALESCE(excluded.status, admission_periods.status),
      summary = CASE
        WHEN excluded.summary <> '' THEN excluded.summary
        ELSE admission_periods.summary
      END,
      admission_reason = COALESCE(excluded.admission_reason, admission_periods.admission_reason),
      main_event = COALESCE(excluded.main_event, admission_periods.main_event),
      treatment = COALESCE(excluded.treatment, admission_periods.treatment),
      symptoms = COALESCE(excluded.symptoms, admission_periods.symptoms),
      medication_change = COALESCE(excluded.medication_change, admission_periods.medication_change),
      discharge_summary = COALESCE(excluded.discharge_summary, admission_periods.discharge_summary),
      detail_text = CASE
        WHEN excluded.detail_text <> '' THEN excluded.detail_text
        ELSE admission_periods.detail_text
      END,
      source_document_id = excluded.source_document_id,
      source_file_id = excluded.source_file_id
    """,
    (
      admission_period["cycle_key"],
      admission_period["folder_path"],
      admission_period["title"],
      _none_if_empty(admission_period.get("admission_date")),
      _none_if_empty(admission_period.get("admission_date_text")),
      _none_if_empty(admission_period.get("discharge_date")),
      _none_if_empty(admission_period.get("discharge_date_text")),
      admission_period["period_text"],
      _none_if_empty(admission_period.get("status")),
      admission_period["summary"],
      _none_if_empty(admission_period.get("admission_reason")),
      _none_if_empty(admission_period.get("main_event")),
      _none_if_empty(admission_period.get("treatment")),
      _none_if_empty(admission_period.get("symptoms")),
      _none_if_empty(admission_period.get("medication_change")),
      _none_if_empty(admission_period.get("discharge_summary")),
      admission_period["detail_text"],
      source_document_id,
      source_file_id,
    ),
  )
  row = connection.execute(
    "SELECT id FROM admission_periods WHERE cycle_key = ?",
    (admission_period["cycle_key"],),
  ).fetchone()
  return int(row["id"])


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
  return {
    "overview": None,
    "events": [],
    "medications": [],
    "lab_results": [],
    "admission_periods": [],
  }


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
    indent = len(raw_line) - len(raw_line.lstrip(" "))

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
      if plain.startswith("- ") and plain.endswith("：") and any(
        keyword in plain for keyword in ["治疗", "用药"]
      ):
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
      if plain.startswith("- ") and indent == 0:
        heading = plain[2:].strip()
        _, current_history_date = _extract_date(heading)
        overview["highlights"].append(heading.rstrip("："))
      elif plain.startswith("- ") and indent > 0:
        result_line = plain[2:].strip()
        result_date_text, result_date = _extract_date(result_line)
        final_result_date = result_date or current_history_date
        final_result_date_text = result_date_text or _format_display_date(final_result_date)

        if "：" in result_line and final_result_date:
          panel_name = re.split(r"[：:]", result_line, maxsplit=1)[0].strip() or result_line
          if len(DATE_RE.findall(result_line)) > 1:
            lab_record = _build_lab_record(
              test_group="长期参考",
              panel_name=panel_name,
              test_name=panel_name,
              result_text=result_line,
              result_date=final_result_date,
              result_date_text=final_result_date_text,
              is_approximate=False,
            )
            if lab_record:
              lab_results.append(lab_record)
          else:
            lab_results.extend(
              _build_lab_records(
                test_group="长期参考",
                panel_name=panel_name,
                result_lines=[result_line],
                result_date=final_result_date,
                result_date_text=final_result_date_text,
                is_approximate=False,
              )
            )
        else:
          overview["highlights"].append(result_line)

  return {
    "overview": overview,
    "events": events,
    "medications": medications,
    "lab_results": lab_results,
    "admission_periods": [],
  }


def _parse_admission_note(document: DocumentRecord) -> dict[str, list[dict] | dict | None]:
  events: list[dict] = []
  labs: list[dict] = []
  admission_periods: list[dict] = []
  lines = document.content_text.splitlines()
  section = ""
  admission_date = ""
  admission_date_text = ""
  discharge_date = ""
  discharge_date_text = ""
  explicit_period_text = ""
  admission_status = ""
  admission_reason = ""
  discharge_summary = ""
  main_event = ""
  treatment = ""
  symptoms = ""
  medication_change = ""
  current_lab_name = ""
  current_lab_details: list[str] = []
  admission_cycle_key = _build_admission_cycle_key(document.relative_path)
  folder_path = admission_cycle_key

  def flush_lab() -> None:
    nonlocal current_lab_name, current_lab_details
    if not current_lab_name:
      return
    result_text = "；".join(current_lab_details)
    labs.extend(
      _build_lab_records(
        test_group="本次住院",
        panel_name=current_lab_name,
        result_lines=current_lab_details,
        result_date=admission_date,
        result_date_text=admission_date_text,
        is_approximate="约" in result_text,
      )
    )
    current_lab_name = ""
    current_lab_details = []
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
      if plain.startswith("- 入院时间："):
        admission_date_text = _clean_field_value(plain.split("：", 1)[1])
        _, admission_date = _extract_date(admission_date_text)
      elif plain.startswith("- 住院时间："):
        admission_date_text = _clean_field_value(plain.split("：", 1)[1])
        _, admission_date = _extract_date(admission_date_text)
      elif plain.startswith("- 出院时间："):
        discharge_date_text = _clean_field_value(plain.split("：", 1)[1])
        _, discharge_date = _extract_date(discharge_date_text)
      elif plain.startswith("- 住院周期："):
        explicit_period_text = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 当前状态："):
        admission_status = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 入院原因："):
        admission_reason = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 本次主要事件："):
        main_event = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 处置经过："):
        treatment = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 本次住院主要症状："):
        symptoms = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 周期内主要症状："):
        symptoms = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 本次住院后的调药："):
        medication_change = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 出院结论："):
        discharge_summary = _clean_field_value(plain.split("：", 1)[1])
      elif plain.startswith("- 出院情况："):
        discharge_summary = _clean_field_value(plain.split("：", 1)[1])

    elif section == "labs":
      if indent == 0 and plain.startswith("- ") and stripped.startswith("- **"):
        flush_lab()
        current_lab_name = plain[2:].strip()
      elif indent > 0 and plain.startswith("- ") and current_lab_name:
        current_lab_details.append(plain[2:].strip())

  flush_lab()

  normalized_status = admission_status or ("已出院" if discharge_date else "")
  period_text = explicit_period_text or _build_admission_period_text(
    admission_date_text=admission_date_text,
    discharge_date_text=discharge_date_text,
    status=normalized_status,
  )
  period_summary = admission_reason or symptoms or main_event or "本次住院记录"
  detail_parts = [
    admission_reason,
    main_event,
    treatment,
    symptoms,
    medication_change,
    discharge_summary,
  ]
  period_detail_text = "；".join(part for part in detail_parts if part)

  if admission_date or admission_date_text:
    admission_periods.append(
      {
        "cycle_key": admission_cycle_key,
        "folder_path": folder_path,
        "title": document.title,
        "admission_date": admission_date or None,
        "admission_date_text": admission_date_text or None,
        "discharge_date": discharge_date or None,
        "discharge_date_text": discharge_date_text or None,
        "period_text": period_text,
        "status": normalized_status or None,
        "summary": period_summary,
        "admission_reason": admission_reason or None,
        "main_event": main_event or None,
        "treatment": treatment or None,
        "symptoms": symptoms or None,
        "medication_change": medication_change or None,
        "discharge_summary": discharge_summary or None,
        "detail_text": period_detail_text or period_summary,
      }
    )

  if admission_date:
    events.append(
      {
        "event_date": admission_date,
        "event_date_text": admission_date_text,
        "event_time_text": None,
        "event_type": "admission",
        "title": "入院",
        "summary": period_summary,
        "detail_text": period_detail_text or period_summary,
        "is_hospitalized": True,
        "admission_cycle_key": admission_cycle_key,
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
        "detail_text": period_detail_text or main_event,
        "is_hospitalized": True,
        "admission_cycle_key": admission_cycle_key,
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
        "admission_cycle_key": admission_cycle_key,
      }
    )

  if discharge_date:
    discharge_event_summary = discharge_summary or normalized_status or "本次住院已出院"
    events.append(
      {
        "event_date": discharge_date,
        "event_date_text": discharge_date_text,
        "event_time_text": None,
        "event_type": "discharge",
        "title": "出院",
        "summary": discharge_event_summary,
        "detail_text": period_detail_text or discharge_event_summary,
        "is_hospitalized": True,
        "admission_cycle_key": admission_cycle_key,
      }
    )

  return {
    "overview": None,
    "events": events,
    "medications": [],
    "lab_results": labs,
    "admission_periods": admission_periods,
  }


def _build_admission_period_text(
  *,
  admission_date_text: str,
  discharge_date_text: str,
  status: str,
) -> str:
  if admission_date_text and discharge_date_text:
    return f"{admission_date_text} - {discharge_date_text}"
  if admission_date_text and status:
    return f"{admission_date_text}起 · {status}"
  return admission_date_text or discharge_date_text or "住院周期待补"


def _build_lab_records(
  *,
  test_group: str,
  panel_name: str,
  result_lines: list[str],
  result_date: str,
  result_date_text: str,
  is_approximate: bool,
) -> list[dict]:
  records: list[dict] = []

  for result_line in result_lines:
    metrics = _extract_lab_metrics(panel_name, result_line)
    for metric in metrics:
      lab_record = _build_lab_record(
        test_group=test_group,
        panel_name=panel_name,
        test_name=metric["test_name"],
        result_text=metric["result_text"],
        result_date=result_date,
        result_date_text=result_date_text,
        is_approximate=is_approximate or metric["is_approximate"],
      )
      if lab_record:
        records.append(lab_record)

  if records:
    return records

  fallback_text = "；".join(result_lines)
  if NUMBER_RE.search(fallback_text):
    fallback_record = _build_lab_record(
      test_group=test_group,
      panel_name=panel_name,
      test_name=panel_name,
      result_text=fallback_text,
      result_date=result_date,
      result_date_text=result_date_text,
      is_approximate=is_approximate,
    )
    if fallback_record:
      records.append(fallback_record)

  return records


def _extract_lab_metrics(panel_name: str, result_text: str) -> list[dict[str, str | bool]]:
  plain_text = _plain_text(result_text)
  metrics: list[dict[str, str | bool]] = []
  current_subject = ""
  skipped_prefixes = ("低于参考范围", "高于参考范围", "仍在参考范围", "在参考范围", "接近上限")

  for chunk in METRIC_CHUNK_SPLIT_RE.split(plain_text):
    for segment in chunk.split("、"):
      cleaned = _clean_metric_segment(segment)
      if not cleaned:
        continue
      if cleaned.startswith(skipped_prefixes):
        continue

      match = re.search(
        r"(?P<name>[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω0-9/+%-]*|[\u4e00-\u9fffA-Za-zΑ-Ωα-ω0-9/+%-]+?)\s*(?:约|为|:|：)?\s*(?P<number>-?\d+(?:\.\d+)?)\s*(?P<unit>[A-Za-zµμ/%·/\u4e00-\u9fff]+)?",
        cleaned,
      )
      if not match:
        continue

      metric_name = _normalize_metric_name(match.group("name").strip(), panel_name, current_subject)
      if re.fullmatch(r"\d+(?:\.\d+)?", metric_name):
        continue
      current_subject = _derive_metric_subject(metric_name, panel_name, current_subject)
      metric_text = cleaned
      if metric_name != match.group("name").strip():
        metric_text = f"{metric_name}{cleaned[match.end('name'):]}"
      metrics.append(
        {
          "test_name": metric_name,
          "result_text": metric_text,
          "is_approximate": "约" in cleaned,
        }
      )

  return metrics


def _clean_metric_segment(segment: str) -> str:
  cleaned = _plain_text(segment).strip()
  cleaned = re.sub(
    r"^(?:OCR可辨识结果包括|OCR可识别结果包括|OCR识别结果包括|可辨识结果包括|可识别结果包括|识别结果包括|包括|其中)[:：]\s*",
    "",
    cleaned,
  )
  return cleaned.strip()


def _normalize_metric_name(name: str, panel_name: str, current_subject: str) -> str:
  normalized = name.strip().strip("：:")
  if normalized in GENERIC_METRIC_NAMES:
    return panel_name
  if normalized in DERIVED_METRIC_SUFFIXES and current_subject:
    return f"{current_subject}{normalized}"
  return normalized


def _derive_metric_subject(metric_name: str, panel_name: str, current_subject: str) -> str:
  if metric_name == panel_name:
    return current_subject

  for suffix in DERIVED_METRIC_SUFFIXES:
    if metric_name.endswith(suffix) and len(metric_name) > len(suffix):
      return metric_name[: -len(suffix)]

  return metric_name


def _build_lab_record(
  *,
  test_group: str,
  panel_name: str | None = None,
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
    "panel_name": panel_name or test_name,
    "test_name": test_name,
    "result_text": result_text,
    "numeric_value": numeric_value,
    "unit": unit,
    "status": status,
    "is_approximate": is_approximate,
  }


def _infer_status(result_text: str) -> str:
  if any(keyword in result_text for keyword in ["偏高", "升高", "略高", "高于参考范围", "高于正常", "超过参考范围"]):
    return "high"
  if any(keyword in result_text for keyword in ["偏低", "降低", "略低", "低于参考范围", "低于正常", "低于下限"]):
    return "low"
  if any(keyword in result_text for keyword in ["正常", "未见明显", "稳定", "平稳", "范围内", "未见异常", "未明显升高"]):
    return "normal"
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
