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

  def test_search_finds_diazepam_keyword(self) -> None:
    with get_connection() as connection:
      service = QueryService(connection)
      result = service.search("地西泮")
      self.assertGreaterEqual(len(result), 1)


if __name__ == "__main__":
  unittest.main()
