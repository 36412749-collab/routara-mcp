#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RoutaraApiError, RoutaraClient, resolveApiKey } from './api.js';

function textResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(err: unknown) {
  if (err instanceof RoutaraApiError) {
    return {
      isError: true as const,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            { error: err.message, status: err.status, code: err.code },
            null,
            2,
          ),
        },
      ],
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) }],
  };
}

async function main() {
  const client = new RoutaraClient({ apiKey: resolveApiKey() });

  const server = new McpServer({
    name: 'routara-mcp',
    version: '1.0.0',
  });

  server.tool(
    'routara_list_models',
    'List available LLM and media models on Routara (OpenAI-compatible catalog).',
    {},
    async () => {
      try {
        const data = await client.listModels();
        const ids = (data.data ?? []).map((m) => m.id).slice(0, 200);
        return textResult({ count: ids.length, models: ids, truncated: (data.data?.length ?? 0) > 200 });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'routara_chat',
    'Send a chat completion via Routara (same as OpenAI POST /v1/chat/completions).',
    {
      model: z.string().describe('Model slug, e.g. alibaba-qwen-turbo or deepseek-deepseek-v3-2'),
      message: z.string().describe('User message content'),
      max_tokens: z.number().int().min(1).max(8192).optional().describe('Max output tokens'),
      temperature: z.number().min(0).max(2).optional(),
    },
    async ({ model, message, max_tokens, temperature }) => {
      try {
        const data = await client.chat({
          model,
          messages: [{ role: 'user', content: message }],
          max_tokens,
          temperature,
        });
        const choice = (data.choices as Array<{ message?: { content?: string } }> | undefined)?.[0];
        return textResult({
          id: data.id,
          model: data.model,
          content: choice?.message?.content ?? '',
          usage: data.usage,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'routara_generate_image',
    'Generate an image via Routara (POST /v1/images/generations). Requires cash wallet balance.',
    {
      model: z.string().describe('Image model slug, e.g. bytedance-doubao-seedream-5-0'),
      prompt: z.string().describe('Image prompt'),
      size: z
        .string()
        .optional()
        .describe('Image size per upstream spec, e.g. 2048x2048 (min ~3686400 pixels for some models)'),
      n: z.number().int().min(1).max(4).optional(),
    },
    async ({ model, prompt, size, n }) => {
      try {
        const data = await client.generateImage({ model, prompt, size, n });
        return textResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'routara_generate_video',
    'Submit async video generation (POST /v1/videos/generations). Requires cash balance.',
    {
      model: z.string().describe('Video model slug, e.g. kling-kling-v3'),
      prompt: z.string().describe('Video prompt'),
      duration: z.number().int().min(1).max(60).optional().describe('Duration in seconds'),
    },
    async ({ model, prompt, duration }) => {
      try {
        const data = await client.generateVideo({ model, prompt, duration });
        return textResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'routara_get_video_status',
    'Poll video generation task status (GET /v1/videos/:id).',
    {
      task_id: z.string().describe('Task id returned from routara_generate_video'),
    },
    async ({ task_id }) => {
      try {
        const data = await client.getVideoTask(task_id);
        return textResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[routara-mcp] fatal:', err);
  process.exit(1);
});
