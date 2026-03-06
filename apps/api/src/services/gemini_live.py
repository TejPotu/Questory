import json
import asyncio
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

async def proxy_gemini_live_session(client_ws: WebSocket, session_id: str):
    """
    Proxies a WebSocket connection from the frontend to the Gemini Live API.
    Intercepts specific tool calls (like image generation) to execute backend logic.
    """
    await client_ws.accept()
    
    try:
        # Initialize the new google-genai client
        # It automatically picks up GEMINI_API_KEY from the environment
        client = genai.Client()
        
        config = types.LiveConnectConfig(
            response_modalities=[types.LiveServerContentModality.AUDIO],
            system_instruction=types.Content(parts=[types.Part.from_text(text=SCENE_SYSTEM_INSTRUCTION)]),
            tools=TOOLS,
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                )
            )
        )

        # Connect to Gemini Live
        async with client.aio.live.connect(model="gemini-2.0-flash-exp", config=config) as gemini_session:
            print(f"[{session_id}] Connected to Gemini Live")

            # Task 1: Read from Frontend WebSocket -> Send to Gemini
            async def receive_from_client():
                try:
                    while True:
                        message = await client_ws.receive_text()
                        data = json.loads(message)
                        
                        # The frontend sends "realtimeInput" for audio chunks
                        # and "clientContent" for text interrupts
                        
                        if "realtimeInput" in data:
                            # Forward audio chunks
                            for chunk in data["realtimeInput"]["mediaChunks"]:
                                mime_type = chunk["mimeType"]
                                b64_data = chunk["data"]
                                import base64
                                binary_data = base64.b64decode(b64_data)
                                
                                await gemini_session.send(
                                    input=types.LiveClientContent(
                                        realtime_input=types.LiveClientRealtimeInput(
                                            media_chunks=[
                                                types.Blob(mime_type=mime_type, data=binary_data)
                                            ]
                                        )
                                    )
                                )
                                
                        elif "clientContent" in data:
                            # Forward text turns
                            for turn in data["clientContent"]["turns"]:
                                text_parts = [p["text"] for p in turn["parts"] if "text" in p]
                                if text_parts:
                                    text = " ".join(text_parts)
                                    await gemini_session.send(input=text)
                                    
                        elif "toolResponse" in data:
                            # Forward frontend tool responses if any
                            # (Currently we handle tools in the backend, but just in case)
                            pass 

                except WebSocketDisconnect:
                    print(f"[{session_id}] Client disconnected")
                except Exception as e:
                    print(f"[{session_id}] Client receive error: {e}")

            # Task 2: Read from Gemini -> Send to Frontend
            async def receive_from_gemini():
                try:
                    async for response in gemini_session.receive():
                        server_content = response.server_content
                        if server_content:
                            model_turn = server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    # Forward Text
                                    if part.text:
                                        payload = {
                                            "serverContent": {
                                                "modelTurn": {
                                                    "parts": [{"text": part.text}]
                                                }
                                            }
                                        }
                                        await client_ws.send_text(json.dumps(payload))
                                        
                                    # Forward Audio
                                    if part.inline_data:
                                        import base64
                                        b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                        payload = {
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
                                        }
                                        await client_ws.send_text(json.dumps(payload))
                                        
                            # Forward Turn Complete
                            if server_content.turn_complete:
                                await client_ws.send_text(json.dumps({
                                    "serverContent": {"turnComplete": True}
                                }))
                                
                        # Handle Tool Calls explicitly in the backend
                        if response.tool_call:
                            for function_call in response.tool_call.function_calls:
                                name = function_call.name
                                args = function_call.args
                                print(f"[{session_id}] Gemini requested tool: {name} with args: {args}")
                                
                                if name == "generate_scene_image":
                                    visual_description = args.get("visual_description", "")
                                    
                                    # 1. Start image generation (non-blocking if we want to reply immediately, but here we wait)
                                    # We can tell the frontend we are generating
                                    await client_ws.send_text(json.dumps({
                                        "backendEvent": {
                                            "type": "image_generation_started"
                                        }
                                    }))
                                    
                                    # Generate with Nano Banana
                                    new_image_url = await generate_dreamy_background(visual_description)
                                    
                                    # 2. Tell the frontend to update the image
                                    if new_image_url:
                                        await client_ws.send_text(json.dumps({
                                            "backendEvent": {
                                                "type": "scene_update",
                                                "imageUrl": new_image_url
                                            }
                                        }))
                                        
                                    # 3. Tell Gemini the tool is done
                                    await gemini_session.send(
                                        input=types.LiveClientContent(
                                            tool_response=types.LiveClientToolResponse(
                                                function_responses=[
                                                    types.FunctionResponse(
                                                        name=name,
                                                        id=function_call.id,
                                                        response={"result": "Image generated successfully. The user can see it now."}
                                                    )
                                                ]
                                            )
                                        )
                                    )

                except Exception as e:
                    print(f"[{session_id}] Gemini receive error: {e}")

            # Run both read loops concurrently
            await asyncio.gather(
                receive_from_client(),
                receive_from_gemini()
            )

    except Exception as e:
        print(f"[{session_id}] Session failed: {e}")
        try:
            await client_ws.close(code=1011, reason=str(e))
        except:
            pass
