from fastapi import APIRouter, HTTPException, WebSocket, Request

from src.services.comic_builder import proxy_comic_builder_session
from src.services.story_session_store import load_story_session

router = APIRouter()


@router.websocket("/build/{session_id}")
async def comic_builder_websocket(websocket: WebSocket, session_id: str):
    print(f"[{session_id}] Incoming Comic Builder WebSocket connection")
    await proxy_comic_builder_session(websocket, session_id)


@router.get("/story-session/{session_id}")
async def get_story_session(session_id: str):
    from pathlib import Path
    import json
    
    # Try permanent first
    data_dir = Path(__file__).parent.parent.parent / "data" / session_id
    json_path = data_dir / "story.json"
    
    story_session = None
    if json_path.exists():
        try:
             story_session = json.loads(json_path.read_text("utf-8"))
        except Exception:
             pass

    # Fallback to temporary
    if not story_session:
        story_session = load_story_session(session_id)
        
    if not story_session:
        raise HTTPException(status_code=404, detail="Story session not found")
        
    # Normalize panel keys to camelCase for the frontend
    if story_session.get("panels"):
        for p in story_session["panels"]:
            if "image_url" in p and "imageUrl" not in p:
                p["imageUrl"] = p.pop("image_url")
            if "panel_id" in p and "panelId" not in p:
                p["panelId"] = p.pop("panel_id")
            if "speech_bubble" in p and "speechBubble" not in p:
                p["speechBubble"] = p.pop("speech_bubble")
            if "learning_objective" in p and "learningObjective" not in p:
                p["learningObjective"] = p.pop("learning_objective")
                
    return story_session

@router.post("/library/force-complete/{session_id}")
async def force_complete_library_story(session_id: str, request: Request):
    from src.services.story_session_store import load_story_session, save_story_session, save_story_to_library
    
    # 1. Ensure it exists
    curr = load_story_session(session_id)
    if not curr:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get frontend panels if provided
    try:
        req_data = await request.json()
        frontend_panels = req_data.get("panels", [])
    except Exception:
        frontend_panels = []

    # 2. Force close the status right now
    save_updates = {
        "status": "completed", 
        "closingNarration": "The hero abruptly concluded their adventure!"
    }
    if frontend_panels:
        save_updates["panels"] = frontend_panels
        
    save_story_session(session_id, save_updates)
    
    # 3. Explicitly extract and save the files 
    try:
        saved_session = save_story_to_library(session_id)
        return {"status": "success", "story": saved_session}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/library/save/{session_id}")
async def save_library_story(session_id: str):
    from src.services.story_session_store import save_story_to_library
    try:
        saved_session = save_story_to_library(session_id)
        return {"status": "success", "story": saved_session}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/library")
async def get_library():
    import json
    from pathlib import Path

    stories_dict = {}

    # Read ALL physically saved stories in the /data dir
    data_dir = Path(__file__).parent.parent.parent / "data"
    if data_dir.exists():
        for story_folder in data_dir.iterdir():
            if story_folder.is_dir():
                json_path = story_folder / "story.json"
                if json_path.exists():
                    try:
                        saved_story = json.loads(json_path.read_text("utf-8"))
                        stories_dict[saved_story.get("id")] = saved_story
                    except Exception as e:
                        print(f"Failed to load saved story {story_folder.name}: {e}")

    stories_with_panels = list(stories_dict.values())
    
    for s in stories_with_panels:
        # Give abruptly ended stories a placeholder description/topic based on hero/concept if topic is missing
        if not s.get("topic"):
            context = s.get("storyConcept") or "Unfinished Adventure"
            hero = s.get("heroName") or "A Brave Hero"
            s["topic"] = f"{hero}'s {context}"
            
        # Normalize panel keys to camelCase for the frontend
        if s.get("panels"):
            for p in s["panels"]:
                if "image_url" in p and "imageUrl" not in p:
                    p["imageUrl"] = p.pop("image_url")
                if "panel_id" in p and "panelId" not in p:
                    p["panelId"] = p.pop("panel_id")
                if "speech_bubble" in p and "speechBubble" not in p:
                    p["speechBubble"] = p.pop("speech_bubble")
                if "learning_objective" in p and "learningObjective" not in p:
                    p["learningObjective"] = p.pop("learning_objective")
            
    return {"stories": stories_with_panels}
