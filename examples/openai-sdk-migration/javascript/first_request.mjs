// One real OpenAI-compatible chat request through Routara.
import OpenAI from 'openai';

const apiKey = process.env.ROUTARA_API_KEY?.trim();
if (!apiKey) {
  console.error('Set ROUTARA_API_KEY before running this example.');
  process.exitCode = 2;
} else {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.routara.ai/v1',
    timeout: 20_000,
    maxRetries: 0,
  });

  try {
    const response = await client.chat.completions.create({
      model: process.env.ROUTARA_MODEL || 'alibaba-qwen-turbo',
      messages: [{ role: 'user', content: 'Reply with one short migration tip.' }],
      max_tokens: 64,
    });
    console.log(`response_id=${response.id}`);
    console.log(`model=${response.model}`);
    console.log(`total_tokens=${response.usage?.total_tokens ?? 'unavailable'}`);
    console.log(response.choices[0]?.message?.content || '(no text content)');
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`HTTP ${error.status}; request_id=${error.request_id || 'unavailable'}; ${error.message}`);
    } else {
      console.error(error instanceof Error ? error.message : 'Request failed');
    }
    process.exitCode = 1;
  }
}
