from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.schemas import HealthResponse # we will install the shared package

app = FastAPI(
    title="Questory API",
    description="Backend API for Interactive Learning Storyworld",
    version="1.0.0",
)

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", version="1.0.0")
