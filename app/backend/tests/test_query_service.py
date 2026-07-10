import unittest
from pathlib import Path

from config import INDEX_DB_PATH
from services.indexer import get_connection, rebuild_index
from services.query_service import QueryService


class QueryServiceTests(unittest.TestCase):
  @classmethod
  def setUpClass(cls) -> None:
    rebuild_index()

  def test_index_db_created(self) -> None:
    self.assertTrue(Path(INDEX_DB_PATH).exists())

  def test_overview_contains_patient_and_dynamic_latest_admission(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      overview = service.get_overview()
      periods = service.get_admission_periods()

      self.assertEqual(overview["patient"]["姓名"], "王柯灵")
      self.assertGreaterEqual(overview["stats"]["file_count"], 1)
      self.assertGreaterEqual(len(periods), 1)
      self.assertIsNotNone(overview["latest_admission"])
      self.assertEqual(overview["latest_admission"]["id"], periods[0]["id"])
      self.assertEqual(
        periods[0]["admission_date"],
        max(item["admission_date"] for item in periods if item["admission_date"]),
      )

  def test_timeline_contains_latest_admission(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      timeline = service.get_timeline()
      summaries = [item["summary"] for item in timeline]
      self.assertTrue(any("呕吐" in summary for summary in summaries))
      self.assertTrue(any(item["event_type"] == "lab" for item in timeline))
      self.assertTrue(any(item["event_type"] == "admission" for item in timeline))
      self.assertTrue(any(item.get("admission_period_text") for item in timeline if item["is_hospitalized"]))

  def test_timeline_deduplicates_main_summary_hospitalized_seizures(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      timeline = service.get_timeline()

      for event_date in ["2026-03-22", "2026-04-28"]:
        seizure_rows = [
          item
          for item in timeline
          if item["event_type"] == "seizure" and item["event_date"] == event_date
        ]
        self.assertEqual(len(seizure_rows), 1)
        self.assertIn("住院整理.md", seizure_rows[0]["relative_path"])

  def test_current_medications_use_main_summary_as_canonical_source(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      medications = service.get_medications()
      current = {item["name"]: item for item in medications["current"]}

      self.assertIn("妥泰（托吡酯）", current)
      self.assertIn("25mg/片", current["妥泰（托吡酯）"]["dose_text"])
      self.assertIn("拉考沙胺片", current)
      self.assertIn("50mg/片", current["拉考沙胺片"]["dose_text"])
      self.assertIn("吡仑帕奈", current)
      self.assertIn("每晚共5mg", current["吡仑帕奈"]["dose_text"])
      self.assertGreaterEqual(len(medications["adjustments"]), 1)

      april_adjustments = [
        item for item in medications["adjustments"] if item["event_date"] == "2026-04-28"
      ]
      self.assertEqual(len(april_adjustments), 1)
      self.assertIn("20260428住院", april_adjustments[0]["relative_path"])

  def test_march_admission_keeps_labs_and_raw_files(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      periods = service.get_admission_periods()
      march = next(item for item in periods if item["admission_date"] == "2026-03-22")

      self.assertIn("呕吐", march["summary"])
      self.assertIn("妥泰", march["medication_change"] or "")

      detail = service.get_admission_period_detail(march["id"])
      self.assertIsNotNone(detail)
      self.assertGreaterEqual(len(detail["events"]), 1)
      self.assertGreaterEqual(len(detail["labs"]), 1)
      self.assertGreaterEqual(len(detail["documents"]), 1)
      self.assertGreaterEqual(len(detail["raw_files"]), 1)

  def test_april_admission_parses_natural_sections(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      periods = service.get_admission_periods()
      april = next(item for item in periods if item["admission_date"] == "2026-04-28")

      self.assertEqual(april["discharge_date"], "2026-04-30")
      self.assertIn("左手抽动", april["main_event"] or "")
      self.assertIn("补液", april["treatment"] or "")
      self.assertIn("呕吐", april["symptoms"] or "")
      self.assertIn("妥泰", april["medication_change"] or "")
      self.assertIn("拉考沙胺", april["medication_change"] or "")
      self.assertIn("吡仑帕奈", april["medication_change"] or "")

      detail = service.get_admission_period_detail(april["id"])
      event_types = {item["event_type"] for item in detail["events"]}
      self.assertIn("seizure", event_types)
      self.assertIn("medication_adjustment", event_types)
      self.assertIn("discharge", event_types)

  def test_betaine_category_is_metabolic_treatment(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      medications = service.get_medications()
      betaine = next((item for item in medications["current"] if item["name"] == "甜菜碱"), None)
      self.assertIsNotNone(betaine)
      self.assertEqual(betaine["category"], "代谢病治疗")

  def test_lab_groups_exclude_narrative_history_items(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      labs = service.get_lab_groups()
      test_names = {item["test_name"] for item in labs}
      self.assertIn("同型半胱氨酸", test_names)
      self.assertNotIn("目前饮食", test_names)
      self.assertNotIn("近年随访提示", test_names)

  def test_lab_groups_split_panel_items_into_individual_metrics(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      labs = service.get_lab_groups()
      panel_metric_pairs = {(item["panel_name"], item["test_name"]) for item in labs}

      self.assertIn(("血清肝功能 11 项", "总蛋白"), panel_metric_pairs)
      self.assertIn(("血清肝功能 11 项", "白蛋白"), panel_metric_pairs)
      self.assertIn(("血清电解质 6 项", "钠"), panel_metric_pairs)
      self.assertTrue(
        any(
          panel_name.startswith("血氨基酸酰基肉碱") and test_name == "C3/C2"
          for panel_name, test_name in panel_metric_pairs
        )
      )
      self.assertNotIn(("血清肝功能 11 项", "血清肝功能 11 项"), panel_metric_pairs)

  def test_search_finds_diazepam_keyword(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      result = service.search("地西泮")
      self.assertGreaterEqual(len(result), 1)


if __name__ == "__main__":
  unittest.main()
