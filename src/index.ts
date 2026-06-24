#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RoutaraApiError, RoutaraClient, resolveApiKey } from './api.js';

const PKG_VERSION = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? '1.0.2';
  } catch {
    return '1.0.2';
  }
})();

function getClient(): RoutaraClient {
  return new RoutaraClient({ apiKey: resolveApiKey() });
}

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

const TOOL_LIST_MODELS = `List Routara catalog models (OpenAI-compatible GET /v1/models).

WHEN TO USE: Discover model slugs before calling routara_chat, routara_generate_image, or routara_generate_video. Call this first when the user did not specify a model.

WHEN NOT TO USE: Do not call for chat/image/video directly — use the specialized tools instead.

REQUIRES: ROUTARA_API_KEY environment variable (sk-or-v1-... from https://routara.ai/#auth).

RETURNS JSON: { count, models: string[], truncated: boolean } — up to 200 model slug IDs; truncated=true when the catalog has more.

EXAMPLE: routara_list_models() → { "count": 787, "models": ["alibaba-qwen-turbo", "deepseek-r1", ...] }`;

const TOOL_CHAT = `Chat completion via Routara (OpenAI POST /v1/chat/completions).

WHEN TO USE: Text generation, coding help, reasoning, translation, or any LLM chat task. Works with 787+ models (DeepSeek, Qwen, GLM, GPT, Claude, etc.).

WHEN NOT TO USE: Image generation (use routara_generate_image). Video (use routara_generate_video). Listing models (use routara_list_models).

REQUIRES: ROUTARA_API_KEY. Billing is per-token; promo credits apply only to domestic economy chat models.

PARAMETERS:
- model: slug from routara_list_models, e.g. "alibaba-qwen-turbo", "deepseek-deepseek-v3-2", "gpt-4o-mini"
- message: single user turn (string)
- max_tokens: 1–8192 output tokens (optional, default upstream)
- temperature: 0–2 sampling (optional)

RETURNS JSON: { id, model, content: string, usage: { prompt_tokens, completion_tokens, total_tokens } }

EXAMPLE: routara_chat(model="alibaba-qwen-turbo", message="Summarize MCP in one sentence", max_tokens=64)`;

const TOOL_IMAGE = `Generate an image via Routara (POST /v1/images/generations).

WHEN TO USE: User asks for image, illustration, poster, or visual asset from a text prompt.

WHEN NOT TO USE: Video (routara_generate_video). Text-only chat (routara_chat).

REQUIRES: ROUTARA_API_KEY and cash wallet balance (promo credits cannot pay for media).

PARAMETERS:
- model: image slug, e.g. "bytedance-doubao-seedream-5-0"
- prompt: detailed image description in English or Chinese
- size: optional, e.g. "1024x1024", "2048x2048" (some models require ≥3686400 pixels total)
- n: 1–4 images (optional, default 1)

RETURNS JSON: OpenAI-style image response with url or b64_json fields per upstream model.

EXAMPLE: routara_generate_image(model="bytedance-doubao-seedream-5-0", prompt="minimal flat app icon, emerald gradient", size="1024x1024")`;

const TOOL_VIDEO = `Submit async video generation (POST /v1/videos/generations).

WHEN TO USE: User wants a short video clip from a text prompt. Always follow up with routara_get_video_status to poll until completed.

WHEN NOT TO USE: Still images (routara_generate_image). Chat (routara_chat).

REQUIRES: ROUTARA_API_KEY and cash wallet balance.

PARAMETERS:
- model: video slug, e.g. "kling-kling-v3"
- prompt: scene description
- duration: 1–60 seconds (optional)

RETURNS JSON: { id or task_id, status } — save the task id for routara_get_video_status.

EXAMPLE: routara_generate_video(model="kling-kling-v3", prompt="drone shot over coastline at sunset", duration=5)`;

const TOOL_VIDEO_STATUS = `Poll async video task status (GET /v1/videos/:id).

WHEN TO USE: After routara_generate_video returns a task id. Poll every 10–30s until status is completed or failed.

WHEN NOT TO USE: Before submitting a video job. For chat or images.

REQUIRES: ROUTARA_API_KEY.

PARAMETERS:
- task_id: id string from routara_generate_video response

RETURNS JSON: { status, progress?, output_url?, error? } — when status=completed, output_url contains the video link.

EXAMPLE: routara_get_video_status(task_id="vid_abc123")`;

async function main() {
  const server = new McpServer({
    name: 'routara-mcp',
    version: PKG_VERSION,
  });

  server.tool('routara_list_models', TOOL_LIST_MODELS, {}, async () => {
    try {
      const data = await getClient().listModels();
      const ids = (data.data ?? []).map((m) => m.id).slice(0, 200);
      return textResult({
        count: ids.length,
        models: ids,
        truncated: (data.data?.length ?? 0) > 200,
      });
    } catch (err) {
      return errorResult(err);
    }
  });

  server.tool(
    'routara_chat',
    TOOL_CHAT,
    {
      model: z
        .string()
        .describe(
          'Model slug from routara_list_models, e.g. alibaba-qwen-turbo, deepseek-deepseek-v3-2, gpt-4o-mini',
        ),
      message: z.string().describe('User message / instruction for the model (single turn)'),
      max_tokens: z
        .number()
        .int()
        .min(1)
        .max(8192)
        .optional()
        .describe('Maximum output tokens to generate (1–8192)'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Sampling temperature: 0=deterministic, 1=balanced, 2=creative'),
    },
    async ({ model, message, max_tokens, temperature }) => {
      try {
        const data = await getClient().chat({
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
    TOOL_IMAGE,
    {
      model: z
        .string()
        .describe('Image model slug, e.g. bytedance-doubao-seedream-5-0'),
      prompt: z.string().describe('Detailed text prompt describing the desired image'),
      size: z
        .string()
        .optional()
        .describe('Output dimensions, e.g. 1024x1024 or 2048x2048 (model-specific minimums apply)'),
      n: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of images to generate (1–4, default 1)'),
    },
    async ({ model, prompt, size, n }) => {
      try {
        const data = await getClient().generateImage({ model, prompt, size, n });
        return textResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'routara_generate_video',
    TOOL_VIDEO,
    {
      model: z.string().describe('Video model slug, e.g. kling-kling-v3'),
      prompt: z.string().describe('Scene and motion description for the video clip'),
      duration: z
        .number()
        .int()
        .min(1)
        .max(60)
        .optional()
        .describe('Clip length in seconds (1–60, model-dependent)'),
    },
    async ({ model, prompt, duration }) => {
      try {
        const data = await getClient().generateVideo({ model, prompt, duration });
        return textResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'routara_get_video_status',
    TOOL_VIDEO_STATUS,
    {
      task_id: z
        .string()
        .describe('Task id returned by routara_generate_video (field id or task_id in JSON)'),
    },
    async ({ task_id }) => {
      try {
        const data = await getClient().getVideoTask(task_id);
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
