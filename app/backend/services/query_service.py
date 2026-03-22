from __future__ import annotations

import sqlite3
import json

from config import DATA_ROOT


class QueryService:
  def __init__(self, connection: sqlite3.Connection):
    self.connection = connection

  def get_health_meta(self) -> dict:
    meta = self.connection.execute(
      "SELECT value_json FROM summary_cache WHERE cache_key = ?",
      ("index_meta",),
    ).fetchone()
    return json.loads(meta["value_json"]) if meta else {}

  def get_overview(self) -> dict:
    overview_row = self.connection.execute(
      "SELECT value_json FROM summary_cache WHERE cache_key = ?",
      ("overview",),
    ).fetchone()
    overview = json.loads(overview_row["value_json"]) if overview_row else {}

    latest_seizure = self.connection.execute(
      """
      SELECT event_date, event_date_text, summary
      FROM events
      WHERE event_type = 'seizure'
      ORDER BY event_date DESC
      LIMIT 1
      """
    ).fetchone()

    latest_admission = self.connection.execute(
      """
      SELECT event_date, event_date_text, summary
      FROM events
      WHERE event_type = 'admission'
      ORDER BY event_date DESC
      LIMIT 1
      """
    ).fetchone()

    stats = self.connection.execute(
      """
      SELECT
        (SELECT COUNT(*) FROM files) AS file_count,
        (SELECT COUNT(*) FROM documents) AS document_count,
        (SELECT COUNT(*) FROM events) AS event_count,
        (SELECT COUNT(*) FROM lab_results) AS lab_count
      """
    ).fetchone()

    return {
      **overview,
      "latest_seizure": dict(latest_seizure) if latest_seizure else None,
      "latest_admission": dict(latest_admission) if latest_admission else None,
      "stats": dict(stats) if stats else {},
    }

  def get_timeline(self) -> list[dict]:
    rows = self.connection.execute(
      """
      SELECT
        e.id,
        e.event_date,
        e.event_date_text,
        e.event_time_text,
        e.event_type,
        e.title,
        e.summary,
        e.detail_text,
        e.is_hospitalized,
        f.relative_path
      FROM events e
      JOIN files f ON f.id = e.source_file_id
      ORDER BY e.event_date DESC, e.id DESC
      """
    ).fetchall()
    return [dict(row) | {"raw_url": self._raw_url(row["relative_path"])} for row in rows]

  def get_lab_groups(self) -> list[dict]:
    rows = self.connection.execute(
      """
      SELECT
        lr.id,
        lr.result_date,
        lr.result_date_text,
        lr.test_group,
        lr.test_name,
        lr.result_text,
        lr.numeric_value,
        lr.unit,
        lr.status,
        lr.is_approximate,
        f.relative_path
      FROM lab_results lr
      JOIN files f ON f.id = lr.source_file_id
      ORDER BY lr.result_date DESC, lr.id DESC
      """
    ).fetchall()
    return [dict(row) | {"raw_url": self._raw_url(row["relative_path"])} for row in rows]

  def get_documents(self) -> list[dict]:
    rows = self.connection.execute(
      """
      SELECT d.id, d.doc_kind, d.title, f.relative_path
      FROM documents d
      JOIN files f ON f.id = d.file_id
      ORDER BY f.relative_path
      """
    ).fetchall()
    return [dict(row) | {"raw_url": self._raw_url(row["relative_path"])} for row in rows]

  def get_document_detail(self, document_id: int) -> dict | None:
    row = self.connection.execute(
      """
      SELECT d.id, d.doc_kind, d.title, d.content_text, f.relative_path
      FROM documents d
      JOIN files f ON f.id = d.file_id
      WHERE d.id = ?
      """,
      (document_id,),
    ).fetchone()

    if not row:
      return None

    related_rows = self.connection.execute(
      """
      SELECT f.relative_path, l.relation_type
      FROM document_file_links l
      JOIN files f ON f.id = l.file_id
      WHERE l.document_id = ?
      ORDER BY f.relative_path
      """,
      (document_id,),
    ).fetchall()

    return dict(row) | {
      "raw_url": self._raw_url(row["relative_path"]),
      "related_files": [
        dict(related_row) | {"raw_url": self._raw_url(related_row["relative_path"])}
        for related_row in related_rows
      ],
    }

  def search(self, keyword: str) -> list[dict]:
    if not keyword.strip():
      return []

    try:
      rows = self.connection.execute(
        """
        SELECT
          rowid AS document_id,
          title,
          relative_path,
          snippet(documents_fts, 1, '<mark>', '</mark>', '...', 16) AS snippet
        FROM documents_fts
        WHERE documents_fts MATCH ?
        ORDER BY rank
        LIMIT 20
        """,
        (keyword,),
      ).fetchall()
    except sqlite3.OperationalError:
      rows = []

    if not rows:
      rows = self.connection.execute(
        """
        SELECT
          d.id AS document_id,
          d.title,
          f.relative_path,
          substr(
            d.content_text,
            CASE
              WHEN instr(d.content_text, ?) > 20 THEN instr(d.content_text, ?) - 20
              ELSE 1
            END,
            120
          ) AS snippet
        FROM documents d
        JOIN files f ON f.id = d.file_id
        WHERE d.content_text LIKE ?
        ORDER BY d.id DESC
        LIMIT 20
        """,
        (keyword, keyword, f"%{keyword}%"),
      ).fetchall()

    return [dict(row) | {"raw_url": self._raw_url(row["relative_path"])} for row in rows]

  def list_files(self) -> list[dict]:
    rows = self.connection.execute(
      """
      SELECT id, relative_path, file_name, file_type, updated_at
      FROM files
      ORDER BY relative_path
      """
    ).fetchall()
    return [dict(row) | {"raw_url": self._raw_url(row["relative_path"])} for row in rows]

  @staticmethod
  def _raw_url(relative_path: str) -> str | None:
    prefix = "柯灵用/"
    if relative_path.startswith(prefix):
      return f"/raw/{relative_path[len(prefix):]}"
    if relative_path == "柯灵用":
      return "/raw"
    return None
