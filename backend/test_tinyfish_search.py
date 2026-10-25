import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv
from app.tinyfish_client import search_tinyfish

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)


async def main():
    try:
        result = await search_tinyfish(
            "Amazon India official return refund policy"
        )
        print(json.dumps(result, indent=2)[:10000])
    except Exception as exc:
        print(f"Search failed: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
