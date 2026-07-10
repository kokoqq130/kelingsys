import os
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_ROOT.parents[1]

# 医疗资料可以继续放在仓库内，也可以通过环境变量迁移到独立私密目录。
# 页面和索引只读取该目录，不要求资料与应用代码处于同一个 Git 仓库。
DATA_ROOT = Path(
  os.environ.get("KELING_DATA_ROOT", str(PROJECT_ROOT / "柯灵用"))
).expanduser().resolve()
INDEX_DB_PATH = Path(
  os.environ.get("KELING_INDEX_DB_PATH", str(PROJECT_ROOT / "data" / "index.db"))
).expanduser().resolve()
