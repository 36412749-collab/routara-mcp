# Get a first Routara response with the OpenAI SDK

This example keeps the OpenAI SDK request shape. The changes are the API key, base URL, and model ID. It makes one small, real chat request; it does not simulate a response or claim a fixed price or latency.

## Before you run it

1. [Create a Routara account and API key](https://routara.ai/developers/openai-migration?utm_source=github&utm_medium=repository&utm_campaign=openai_sdk_quickstart). Google and GitHub sign-in are available. Save the full key when it is shown.
2. Set `ROUTARA_API_KEY` in your local environment. Keep it out of source code and screenshots.
3. Start with `alibaba-qwen-turbo`, which is the model used in Routara's first-request guide. Model availability and prices can change; check the [live catalog](https://routara.ai/catalog?utm_source=github&utm_medium=repository&utm_campaign=openai_sdk_quickstart) before using another ID.

An account may need email verification, eligible trial credit, or wallet funds before a billable request can succeed. The example prints the real HTTP status if it fails.

## Python

```bash
python -m pip install openai
python python/first_request.py
```

## Node.js

Requires Node.js 18 or newer.

```bash
npm init -y
npm install openai
node javascript/first_request.mjs
```

Run the commands from this directory. Both scripts read `ROUTARA_API_KEY` and optionally `ROUTARA_MODEL` from the environment. They use `https://api.routara.ai/v1` as the base URL and print the response ID, model, token usage, and assistant text returned by the API.

## Change models safely

Set `ROUTARA_MODEL` to an ID from the live catalog, then rerun the example. Check the model's input/output pricing, supported features, and your account balance first. A successful call to one model does not prove that every model or media feature is available to your account.

## If the request fails

| Status | Check |
|---|---|
| 401 | Confirm that the key is complete and active. A masked key from the dashboard cannot be used as a secret. |
| 403 | Check account verification, model access, trial eligibility, and balance. |
| 429 | Wait for the retry window before sending another request. |
| 5xx | Record the request ID and retry later; avoid an unbounded retry loop. |

See the [API documentation](https://routara.ai/docs?utm_source=github&utm_medium=repository&utm_campaign=openai_sdk_quickstart) and [MCP setup guide](https://routara.ai/mcp?utm_source=github&utm_medium=repository&utm_campaign=openai_sdk_quickstart) for the other integration paths. MCP tools do not change the model provider or billing of the host AI application.
