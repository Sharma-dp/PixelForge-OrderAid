import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv
from app.tinyfish_client import run_tinyfish_agent

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)


async def main():
    print("Connecting to TinyFish...")

    try:
        result = await run_tinyfish_agent(
            url="https://example.com",
            goal=(
                "Read this public webpage. Return JSON containing "
                "the page title and its main heading. "
                "Do not interact with forms or submit anything."
            ),
        )

        print("\nTinyFish completed successfully.")
        print("Result:")
        print(json.dumps(result.get("resultJson"), indent=2))

    except Exception as exc:
        print(f"\nTinyFish test failed: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
