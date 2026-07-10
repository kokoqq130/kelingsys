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


ACKNOWLEDGEMENT = "I_UNDERSTAND"


def export_static_site(
  output_dir: Path,
  *,
  acknowledgement: str,
  include_raw: bool = False,
) -> None:
  if acknowledgement != ACKNOWLEDGEMENT:
    raise ValueError("Explicit sensitive-data acknowledgement is required.")

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
    admissions = service.get_admission_periods()
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
    write_json(static_data_dir / "admissions.json", admissions)
    write_json(static_data_dir / "documents.json", documents)
    write_json(static_data_dir / "files.json", files)
    write_json(static_data_dir / "search-index.json", search_index)

    details_dir = static_data_dir / "document-details"
    for document in documents:
      detail = service.get_document_detail(document["id"])
      if detail:
        write_json(details_dir / f"{document['id']}.json", detail)

    admission_details_dir = static_data_dir / "admission-details"
    for admission in admissions:
      detail = service.get_admission_period_detail(admission["id"])
      if detail:
        write_json(admission_details_dir / f"{admission['id']}.json", detail)

  write_json(
    output_dir / "SENSITIVE-DATA-MANIFEST.json",
    {
      "warning": "This export contains private medical information and must not be publicly deployed.",
      "includes_raw_files": include_raw,
      "data_root": "private-medical-data",
    },
  )

  if include_raw:
    shutil.copytree(DATA_ROOT, output_dir / "raw", dirs_exist_ok=True)


def main() -> None:
  parser = argparse.ArgumentParser(description="Export the current project data as a static share bundle.")
  parser.add_argument(
    "--output-dir",
    required=True,
    help="Directory that will receive the sensitive static data snapshot.",
  )
  parser.add_argument(
    "--acknowledge-sensitive-data",
    required=True,
    choices=[ACKNOWLEDGEMENT],
    help="Explicit acknowledgement required before exporting private medical data.",
  )
  parser.add_argument(
    "--include-raw",
    action="store_true",
    help="Also copy every raw medical file. Disabled by default because this is high risk.",
  )
  args = parser.parse_args()
  export_static_site(
    Path(args.output_dir),
    acknowledgement=args.acknowledge_sensitive_data,
    include_raw=args.include_raw,
  )


if __name__ == "__main__":
  main()
