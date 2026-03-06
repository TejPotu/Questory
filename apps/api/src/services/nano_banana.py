import os
import httpx
from typing import Optional

NANO_BANANA_API_URL = os.getenv("NANO_BANANA_API_URL", "https://api.nano-banana.example.com/generate")
NANO_BANANA_API_KEY = os.getenv("NANO_BANANA_API_KEY", "")

async def generate_dreamy_background(description: str) -> Optional[str]:
    """
    Calls the Nano Banana API to generate a background image for the story scene.
    Returns the image URL if successful, else None.
    """
    if not NANO_BANANA_API_KEY:
        print("Warning: NANO_BANANA_API_KEY is not set. Using fallback placeholder image.")
        # Simulating network delay
        import asyncio
        await asyncio.sleep(2)
        return "/dreamy_forest_scene.png" # Fallback to existing public asset

    try:
        async with httpx.AsyncClient() as client:
            # Note: Replace with actual Nano Banana payload structure
            payload = {
                "prompt": f"A beautiful, immersive, slightly dreamy, kid-friendly 3D video game background scene: {description}",
                "aspect_ratio": "16:9",
                "style": "vibrant_3d"
            }
            
            headers = {
                "Authorization": f"Bearer {NANO_BANANA_API_KEY}",
                "Content-Type": "application/json"
            }
            
            response = await client.post(NANO_BANANA_API_URL, json=payload, headers=headers, timeout=15.0)
            response.raise_for_status()
            
            data = response.json()
            # Assuming the API returns a 'url' field
            return data.get("url")
            
    except Exception as e:
        print(f"Error generating image with Nano Banana: {e}")
        return "/dreamy_forest_scene.png" # Fallback
