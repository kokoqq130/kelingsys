from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_ROOT.parents[1]
DATA_ROOT = PROJECT_ROOT / "柯灵用"
INDEX_DB_PATH = PROJECT_ROOT / "data" / "index.db"
