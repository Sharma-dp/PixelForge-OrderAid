
import json
import os
from typing import Any

import httpx


TINYFISH_AGENT_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"


async def run_tinyfish_agent(
    url: str,
    goal: str,
) -> dict[str, Any]:
    """
    Run a TinyFish browser agent and return its final event.

    The API key is read from the backend environment and is never
    included in the returned result or logged by this module.
    """
    api_key = os.getenv("TINYFISH_API_KEY")

    if not api_key:
        raise RuntimeError(
            "TINYFISH_API_KEY is missing from the backend environment."
        )

    if not url.startswith(("https://", "http://")):
        raise ValueError("A valid HTTP or HTTPS URL is required.")

    if not goal.strip():
        raise ValueError("The investigation goal cannot be empty.")

    timeout = httpx.Timeout(300.0, connect=20.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            TINYFISH_AGENT_URL,
            headers={
                "X-API-Key": api_key,
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
            },
            json={
                "url": url,
                "goal": goal,
            },
        ) as response:
            response.raise_for_status()

            final_event = None

            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue

                payload = line[len("data:"):].strip()

                if not payload:
                    continue

                try:
                    event = json.loads(payload)
                except json.JSONDecodeError:
                    continue

                if not isinstance(event, dict):
                    continue

                if event.get("type") == "COMPLETE":
                    final_event = event
                    break

            if final_event is None:
                raise RuntimeError(
                    "TinyFish ended without a COMPLETE event."
                )

            if final_event.get("status") != "COMPLETED":
                raise RuntimeError(
                    "TinyFish did not complete the browser task successfully."
                )

            return final_event

async def search_tinyfish(query: str) -> dict:
    """Search the web using TinyFish Search."""
    api_key = os.getenv("TINYFISH_API_KEY")

    if not api_key:
        raise RuntimeError(
            "TINYFISH_API_KEY is missing from the backend environment."
        )

    if not query.strip():
        raise ValueError("Search query cannot be empty.")

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=10.0)
    ) as client:
        response = await client.get(
            "https://api.search.tinyfish.ai",
            params={"query": query},
            headers={"X-API-Key": api_key},
        )
        response.raise_for_status()

        data = response.json()

        if not isinstance(data, dict):
            raise RuntimeError("TinyFish Search returned an unexpected response.")

        return data
