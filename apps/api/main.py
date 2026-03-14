from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from src.routers import live_router
from src.routers import image_router
from src.routers import build_router
import os
from pathlib import Path

app = FastAPI(title="Questory Backend")

# We must allow all origins since the frontend is likely running on a different port (e.g. 5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(live_router.router, prefix="/api")
app.include_router(image_router.router, prefix="/api")
app.include_router(build_router.router, prefix="/api")

# Mount a specific disk directory to serve static user-generated story images
data_dir = Path(__file__).parent / "data"
data_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(data_dir)), name="static")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "questory-api"}
