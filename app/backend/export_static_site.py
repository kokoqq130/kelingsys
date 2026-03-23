from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from config import DATA_ROOT
from services.indexer import get_connection, rebuild_index
from services.query_service import QueryService


def write_json(path: Path, payload: Any) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def export_static_site(output_dir: Path) -> None:
  output_dir = output_dir.resolve()

  if output_dir.exists():
    shutil.rmtree(output_dir)

  output_dir.mkdir(parents=True, exist_ok=True)

  rebuild_index()

  with get_connection() as connection:
    service = QueryService(connection)
    health_meta = service.get_health_meta()
    overview = service.get_overview()
    timeline = service.get_timeline()
    labs = service.get_lab_groups()
    medications = service.get_medications()
    documents = service.get_documents()
    files = service.list_files()
    search_index = service.get_search_index()

    static_data_dir = output_dir / "static-data"
    write_json(
      static_data_dir / "health.json",
      {
        "status": "ok",
        "service": "keling-query-static",
        "project_root": "static-share",
        "indexed_at": health_meta.get("indexed_at", ""),
      },
    )
    write_json(static_data_dir / "overview.json", overview)
    write_json(static_data_dir / "timeline.json", timeline)
    write_json(static_data_dir / "labs.json", labs)
    write_json(static_data_dir / "medications.json", medications)
    write_json(static_data_dir / "documents.json", documents)
    write_json(static_data_dir / "files.json", files)
    write_json(static_data_dir / "search-index.json", search_index)

    details_dir = static_data_dir / "document-details"
    for document in documents:
      detail = service.get_document_detail(document["id"])
      if detail:
        write_json(details_dir / f"{document['id']}.json", detail)

  shutil.copytree(DATA_ROOT, output_dir / "raw", dirs_exist_ok=True)


def main() -> None:
  parser = argparse.ArgumentParser(description="Export the current project data as a static share bundle.")
  parser.add_argument(
    "--output-dir",
    required=True,
    help="Directory that will receive static-data and raw assets.",
  )
  args = parser.parse_args()
  export_static_site(Path(args.output_dir))


if __name__ == "__main__":
  main()
