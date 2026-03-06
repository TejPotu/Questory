from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.services.gemini_live import proxy_gemini_live_session

router = APIRouter()

@router.websocket("/live/{session_id}")
async def gemini_live_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint that the React frontend connects to for Gemini Live.
    We proxy this connection to Google via the google-genai SDK.
    """
    print(f"[{session_id}] Incoming WebSocket connection")
    await proxy_gemini_live_session(websocket, session_id)
