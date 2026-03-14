import json
import os
import tempfile
import base64
from pathlib import Path
from threading import Lock
from typing import Any


STORE_PATH = Path(
    os.environ.get(
        "QUESTORY_BACKEND_SESSION_STORE",
        str(Path(tempfile.gettempdir()) / "questory_backend_story_sessions.json"),
    )
)

_STORE_LOCK = Lock()


def _read_store() -> dict[str, Any]:
    if not STORE_PATH.exists():
        return {}

    try:
        return json.loads(STORE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_store(payload: dict[str, Any]) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = STORE_PATH.with_suffix(".tmp")
    temp_path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
    temp_path.replace(STORE_PATH)


def load_story_session(session_id: str) -> dict[str, Any] | None:
    with _STORE_LOCK:
        store = _read_store()
        value = store.get(session_id)
        return value if isinstance(value, dict) else None

def list_all_sessions() -> list[dict[str, Any]]:
    with _STORE_LOCK:
        store = _read_store()
        sessions = []
        for session_id, session_data in store.items():
            if isinstance(session_data, dict):
                session_data["id"] = session_id
                sessions.append(session_data)
        return sessions


def save_story_session(session_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    with _STORE_LOCK:
        store = _read_store()
        current = store.get(session_id)
        if not isinstance(current, dict):
            current = {}

        merged = dict(current)
        for key, value in updates.items():
            if value is None:
                continue
            merged[key] = value

        store[session_id] = merged
        _write_store(store)
        return merged

def save_story_to_library(session_id: str) -> dict[str, Any]:
    """
    Reads the temporary session from the store, extracts all base64 images into physical files 
    inside apps/api/data/{session_id}/, replaces the data URIs with /static URLs, and saves a 
    permanent story.json file.
    """
    session = load_story_session(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found in temporary store.")
        
    panels = session.get("panels", [])
    if not panels:
        raise ValueError(f"Session {session_id} has no panels to save.")

    # Create the permanent directory
    # apps/api/src/services -> apps/api/data/{session_id}
    data_dir = Path(__file__).parent.parent.parent / "data" / session_id
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Process each panel
    for idx, panel in enumerate(panels):
        # Support both camelCase (from frontend state) and snake_case (from backend state)
        image_url = panel.get("imageUrl") or panel.get("image_url")
        
        # Normalize keys for permanent storage so the frontend can read it directly
        if "image_url" in panel and "imageUrl" not in panel:
            panel["imageUrl"] = panel.pop("image_url")
        if "panel_id" in panel and "panelId" not in panel:
            panel["panelId"] = panel.pop("panel_id")
        if "speech_bubble" in panel and "speechBubble" not in panel:
            panel["speechBubble"] = panel.pop("speech_bubble")
        if "learning_objective" in panel and "learningObjective" not in panel:
            panel["learningObjective"] = panel.pop("learning_objective")
            
        if image_url and image_url.startswith("data:image/"):
            try:
                # Extract the base64 part
                header, base64_data = image_url.split(",", 1)
                
                # Determine extension from header (e.g. data:image/jpeg;base64)
                ext = ".png"
                if "jpeg" in header or "jpg" in header:
                    ext = ".jpg"
                    
                image_filename = f"panel_{idx}{ext}"
                image_path = data_dir / image_filename
                
                # Decode and save to disk
                image_bytes = base64.b64decode(base64_data)
                image_path.write_bytes(image_bytes)
                
                # Replace the giant base64 string with a static URL
                panel["imageUrl"] = f"/static/{session_id}/{image_filename}"
            except Exception as e:
                print(f"Error extracting image for panel {idx} in session {session_id}: {e}")
                # We leave the imageUrl as is if it fails, or maybe it was already a URL
                
    # Mark as permanently saved
    session["is_permanently_saved"] = True
    session["id"] = session_id
    
    # Write the story.json to the permanent directory
    story_json_path = data_dir / "story.json"
    story_json_path.write_text(json.dumps(session, indent=2, ensure_ascii=False), encoding="utf-8")
    
    return session
