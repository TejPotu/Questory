import json
import base64
import asyncio
import os
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from src.services.nano_banana import generate_dreamy_background

# Common Configuration for the Story Gemini
SCENE_SYSTEM_INSTRUCTION = """
You are the narrator and guide for an interactive learning story. 
The user is in a dreamy 3D prehistoric forest scene. Talk to them enthusiastically. 
Start by describing the giant footprints and rustling ferns in 1 or 2 short sentences and ask what they want to do next. 
If they inspect an object, give them a fun 2-sentence educational fact.

IMPORTANT: When the user decides to move to a completely new area or progresses deeper into the story, 
you MUST call the `generate_scene_image` tool with a visual description of the new beautiful area so we can update the game background.
"""

TOOLS = [
    {
        "function_declarations": [
            {
                "name": "generate_scene_image",
                "description": "Call this when the user moves to a new location to generate the visual background.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "visual_description": {
                            "type": "STRING", 
                            "description": "A detailed visual description of the new dreamy, prehistoric forest setting for the image generator (e.g. 'A sunlit clearing with a sparkling waterfall and a gentle brontosaurus drinking')."
                        }
                    },
                    "required": ["visual_description"]
                }
            }
        ]
    }
]

# --- Live API Config ---
# The model must support bidiGenerateContent. Use a native audio model.
MODEL_ID = "gemini-2.5-flash-native-audio-preview-12-2025"


async def proxy_gemini_live_session(client_ws: WebSocket, session_id: str):
    """
    Proxies a WebSocket connection from the frontend to the Gemini Live API.
    Intercepts specific tool calls (like image generation) to execute backend logic.
    """
    await client_ws.accept()
    
    # Shared flag to signal when the client has disconnected,
    # preventing the Gemini receiver from writing to a closed WebSocket.
    client_disconnected = asyncio.Event()

    async def safe_send(payload: dict):
        """Send JSON to the client WebSocket, but only if still connected."""
        if client_disconnected.is_set():
            return
        try:
            await client_ws.send_text(json.dumps(payload))
        except Exception:
            client_disconnected.set()

    try:
        # Initialize the google-genai client
        # It automatically picks up GOOGLE_API_KEY / GEMINI_API_KEY from the environment,
        # but we pass it explicitly here for robustness.
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        client = genai.Client(api_key=api_key)
        
        # Build config using dict format (recommended by the latest SDK docs)
        config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": SCENE_SYSTEM_INSTRUCTION,
            "tools": TOOLS,
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": "Aoede"
                    }
                }
            }
        }

        # Connect to Gemini Live API
        async with client.aio.live.connect(model=MODEL_ID, config=config) as gemini_session:
            print(f"[{session_id}] Connected to Gemini Live ({MODEL_ID})")

            # Task 1: Read from Frontend WebSocket -> Send to Gemini
            async def receive_from_client():
                audio_chunk_count = 0
                try:
                    while True:
                        message = await client_ws.receive_text()
                        data = json.loads(message)
                        
                        # The frontend sends "realtimeInput" for audio chunks
                        # and "clientContent" for text interrupts
                        
                        if "realtimeInput" in data:
                            # Forward audio chunks using the new SDK method
                            for chunk in data["realtimeInput"]["mediaChunks"]:
                                mime_type = chunk["mimeType"]
                                b64_data = chunk["data"]
                                binary_data = base64.b64decode(b64_data)
                                
                                # New SDK: send_realtime_input with audio kwarg
                                await gemini_session.send_realtime_input(
                                    audio=types.Blob(
                                        mime_type=mime_type,
                                        data=binary_data
                                    )
                                )
                                audio_chunk_count += 1
                                if audio_chunk_count % 100 == 1:
                                    print(f"[{session_id}] 🎤 Audio streaming... ({audio_chunk_count} chunks sent)")
                                
                        elif "clientContent" in data:
                            # Forward text turns using the new SDK method
                            for turn in data["clientContent"]["turns"]:
                                text_parts = [p["text"] for p in turn["parts"] if "text" in p]
                                if text_parts:
                                    text = " ".join(text_parts)
                                    content = types.Content(
                                        parts=[types.Part.from_text(text=text)],
                                        role="user"
                                    )
                                    # New SDK: send_client_content with turns kwarg
                                    await gemini_session.send_client_content(
                                        turns=content,
                                        turn_complete=True
                                    )
                                    print(f"[{session_id}] 💬 Text received: {text}")
                                    
                        elif "toolResponse" in data:
                            # Forward frontend tool responses if any
                            # (Currently we handle tools in the backend, but just in case)
                            pass 

                except WebSocketDisconnect:
                    print(f"[{session_id}] Client disconnected")
                except Exception as e:
                    print(f"[{session_id}] Client receive error: {e}")
                finally:
                    # Signal the Gemini receiver to stop sending to this WebSocket
                    client_disconnected.set()

            # Task 2: Read from Gemini -> Send to Frontend
            async def receive_from_gemini():
                try:
                    # receive() is a per-turn generator that exits after turn_complete.
                    # Loop to keep receiving across multiple turns indefinitely.
                    while not client_disconnected.is_set():
                        async for response in gemini_session.receive():
                            if client_disconnected.is_set():
                                break

                            server_content = response.server_content
                            if server_content:
                                model_turn = server_content.model_turn
                                if model_turn:
                                    for part in model_turn.parts:
                                        # Forward Text
                                        if part.text:
                                            print(f"[{session_id}] 🗣️ Gemini says: {part.text[:80]}..." if len(part.text) > 80 else f"[{session_id}] 🗣️ Gemini says: {part.text}")
                                            await safe_send({
                                                "serverContent": {
                                                    "modelTurn": {
                                                        "parts": [{"text": part.text}]
                                                    }
                                                }
                                            })

                                        # Forward Audio
                                        if part.inline_data:
                                            print(f"[{session_id}] 🔊 Sending audio response ({len(part.inline_data.data)} bytes)")
                                            b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                            await safe_send({
                                                "serverContent": {
                                                    "modelTurn": {
                                                        "parts": [{
                                                            "inlineData": {
                                                                "mimeType": part.inline_data.mime_type,
                                                                "data": b64_audio
                                                            }
                                                        }]
                                                    }
                                                }
                                            })

                                # Forward Turn Complete
                                if server_content.turn_complete:
                                    print(f"[{session_id}] ✅ Turn complete")
                                    await safe_send({
                                        "serverContent": {"turnComplete": True}
                                    })

                                # Forward Interrupted signal
                                if server_content.interrupted:
                                    print(f"[{session_id}] ⚡ Interrupted by user")
                                    await safe_send({
                                        "serverContent": {"interrupted": True}
                                    })

                            # Handle Tool Calls explicitly in the backend
                            if response.tool_call:
                                for function_call in response.tool_call.function_calls:
                                    name = function_call.name
                                    args = function_call.args
                                    print(f"[{session_id}] Gemini requested tool: {name} with args: {args}")

                                    if name == "generate_scene_image":
                                        visual_description = args.get("visual_description", "")

                                        # 1. Tell the frontend we are generating
                                        await safe_send({
                                            "backendEvent": {
                                                "type": "image_generation_started"
                                            }
                                        })

                                        # 2. Generate with Nano Banana
                                        new_image_url = await generate_dreamy_background(visual_description)

                                        # 3. Tell the frontend to update the image
                                        if new_image_url:
                                            await safe_send({
                                                "backendEvent": {
                                                    "type": "scene_update",
                                                    "imageUrl": new_image_url
                                                }
                                            })

                                        # 4. Tell Gemini the tool is done using the new SDK method
                                        await gemini_session.send_tool_response(
                                            function_responses=[
                                                types.FunctionResponse(
                                                    name=name,
                                                    id=function_call.id,
                                                    response={"result": "Image generated successfully. The user can see it now."}
                                                )
                                            ]
                                        )

                except Exception as e:
                    if not client_disconnected.is_set():
                        print(f"[{session_id}] Gemini receive error: {e}")

            # Run both read loops concurrently
            await asyncio.gather(
                receive_from_client(),
                receive_from_gemini()
            )
            
            print(f"[{session_id}] Session ended cleanly")

    except Exception as e:
        print(f"[{session_id}] Session failed: {e}")
        try:
            await client_ws.close(code=1011, reason=str(e))
        except:
            pass
