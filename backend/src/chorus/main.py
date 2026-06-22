import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from chorus.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    from chorus.graph.graph import build_graph
    app.state.graph = build_graph()
    app.state.run_semaphore = asyncio.Semaphore(settings.max_concurrent_runs)
    yield


app = FastAPI(title="Chorus API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
