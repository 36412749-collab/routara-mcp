# Routara first-request Postman collection

Import [the collection file](routara-first-request.postman_collection.json) into Postman. It provides three requests: list live models, make a small Qwen chat request, and run the same prompt with DeepSeek. The second chat request demonstrates a manual model switch; it does not implement automatic failover.

1. [Create an account and API key](https://routara.ai/developers/openai-migration?utm_source=github&utm_medium=repository&utm_campaign=postman_quickstart). Save the complete key when it is shown.
2. In the imported collection's **Variables**, set `ROUTARA_API_KEY` to your key as a local secret/current value. The published JSON has an empty key and no credentials. Do not export or share a collection after filling in a secret.
3. Send **List available models** first. Then send **First chat response — Qwen**. Inspect the actual `id`, `model`, `choices`, and `usage` fields.
4. If you want to compare another model, send **Switch model — DeepSeek**. Each chat request consumes eligible trial credit or wallet funds. Check the [live catalog](https://routara.ai/catalog?utm_source=github&utm_medium=repository&utm_campaign=postman_quickstart) for current availability and pricing.

The defaults `alibaba-qwen-turbo` and `deepseek-deepseek-v3-2` both returned live responses in a small test on 2026-10-04. That check does not guarantee future availability or access for every account. A 401 means the key needs checking; a 403 may mean account, balance, model access, or regional restrictions; a 429 means wait before retrying. The collection never stores a sample response or an API token.
