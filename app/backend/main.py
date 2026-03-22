from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import DATA_ROOT, PROJECT_ROOT
from services.indexer import get_connection, rebuild_index
from services.query_service import QueryService


@asynccontextmanager
async def lifespan(_: FastAPI):
  rebuild_index()
  yield

app = FastAPI(
    title="柯灵资料查询系统 API",
    description="面向本地资料的查询型接口服务。",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    with get_connection() as connection:
        meta = QueryService(connection).get_health_meta()

    return {
        "status": "ok",
        "service": "keling-query-api",
        "project_root": str(PROJECT_ROOT),
        "indexed_at": meta.get("indexed_at", ""),
    }


@app.get("/api/overview")
def overview() -> dict:
    with get_connection() as connection:
        return QueryService(connection).get_overview()


@app.get("/api/timeline")
def timeline() -> list[dict]:
    with get_connection() as connection:
        return QueryService(connection).get_timeline()


@app.get("/api/labs")
def labs() -> list[dict]:
    with get_connection() as connection:
        return QueryService(connection).get_lab_groups()


@app.get("/api/medications")
def medications() -> dict:
    with get_connection() as connection:
        return QueryService(connection).get_medications()


@app.get("/api/documents")
def documents() -> list[dict]:
    with get_connection() as connection:
        return QueryService(connection).get_documents()


@app.get("/api/documents/{document_id}")
def document_detail(document_id: int) -> dict:
    with get_connection() as connection:
        document = QueryService(connection).get_document_detail(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@app.get("/api/search")
def search(q: str = "") -> list[dict]:
    with get_connection() as connection:
        return QueryService(connection).search(q)


@app.get("/api/files")
def files() -> list[dict]:
    with get_connection() as connection:
        return QueryService(connection).list_files()


@app.post("/api/reindex")
def reindex() -> dict[str, str]:
    rebuild_index()
    return {"status": "ok"}


app.mount("/raw", StaticFiles(directory=str(DATA_ROOT)), name="raw")
