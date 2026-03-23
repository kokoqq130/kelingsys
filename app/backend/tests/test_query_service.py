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

  def test_overview_contains_patient(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      overview = service.get_overview()
      self.assertEqual(overview["patient"]["姓名"], "王柯灵")
      self.assertGreaterEqual(overview["stats"]["file_count"], 1)

  def test_timeline_contains_latest_admission(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      timeline = service.get_timeline()
      summaries = [item["summary"] for item in timeline]
      self.assertTrue(any("呕吐" in summary for summary in summaries))
      self.assertTrue(any(item["event_type"] == "lab" for item in timeline))

  def test_medication_adjustments_detected(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      medications = service.get_medications()
      self.assertGreaterEqual(len(medications["current"]), 1)
      self.assertGreaterEqual(len(medications["adjustments"]), 1)

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
      self.assertIn(("血氨基酸酰基肉碱谱", "C3/C2"), panel_metric_pairs)
      self.assertNotIn(("血清肝功能 11 项", "血清肝功能 11 项"), panel_metric_pairs)

  def test_search_finds_diazepam_keyword(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      result = service.search("地西泮")
      self.assertGreaterEqual(len(result), 1)


if __name__ == "__main__":
  unittest.main()
