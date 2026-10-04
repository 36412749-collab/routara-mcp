"""One real OpenAI-compatible chat request through Routara."""

import os
import sys

from openai import APIStatusError, OpenAI


def main() -> int:
    api_key = os.environ.get("ROUTARA_API_KEY", "").strip()
    if not api_key:
        print("Set ROUTARA_API_KEY before running this example.", file=sys.stderr)
        return 2

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.routara.ai/v1",
        timeout=20.0,
        max_retries=0,
    )
    try:
        response = client.chat.completions.create(
            model=os.environ.get("ROUTARA_MODEL", "alibaba-qwen-turbo"),
            messages=[{"role": "user", "content": "Reply with one short migration tip."}],
            max_tokens=64,
        )
    except APIStatusError as error:
        print(f"HTTP {error.status_code}; request_id={error.request_id or 'unavailable'}", file=sys.stderr)
        return 1

    print(f"response_id={response.id}")
    print(f"model={response.model}")
    print(f"total_tokens={response.usage.total_tokens if response.usage else 'unavailable'}")
    print(response.choices[0].message.content or "(no text content)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
