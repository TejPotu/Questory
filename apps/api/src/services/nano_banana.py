import base64
import traceback
from typing import Optional
from google import genai
from google.genai import types


async def generate_dreamy_background(description: str) -> Optional[str]:
    """
    Uses Gemini image generation to create a background image for the story scene.
    Returns a base64 data URL if successful, else None.
    """
    print(f"[Image] Generating scene for: {description[:80]}...")
    try:
        client = genai.Client()

        prompt = (
            f"A beautiful, immersive, slightly dreamy, kid-friendly image background "
            f"scene and foreground with the description: {description}"
        )

        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"]
            )
        )

        candidates = response.candidates
        if not candidates:
            print("[Image] Error: No candidates in response")
            return "/dreamy_forest_scene.png"

        parts = candidates[0].content.parts if candidates[0].content else []
        print(f"[Image] Response has {len(parts)} part(s)")

        for part in parts:
            if part.inline_data:
                print(f"[Image] Got image: {part.inline_data.mime_type}, {len(part.inline_data.data)} bytes")
                image_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                return f"data:{part.inline_data.mime_type};base64,{image_b64}"
            elif part.text:
                print(f"[Image] Got text instead of image: {part.text[:100]}")

        print("[Image] Warning: No image data found in any part")
        return "/dreamy_forest_scene.png"

    except Exception as e:
        print(f"[Image] ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        return "/dreamy_forest_scene.png"

