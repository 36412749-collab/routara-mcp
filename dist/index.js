#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RoutaraApiError, RoutaraClient, resolveApiKey } from './api.js';
const FALLBACK_VERSION = '1.1.1';
const PKG_VERSION = (() => {
    try {
        const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));
        return pkg.version ?? FALLBACK_VERSION;
    }
    catch {
        return FALLBACK_VERSION;
    }
})();
// Smithery's hosted-module scanner looks for these two exports.  Keeping the
// key optional is intentional: tool discovery and the MCP handshake must work
// without credentials; the key is required only when a tool calls Routara.
export const configSchema = z.object({
    apiKey: z.string().optional().describe('Routara API key (sk-or-v1-...)'),
    baseUrl: z.string().url().optional().describe('Optional Routara API base URL'),
});
function getClient(options = {}) {
    return new RoutaraClient({
        apiKey: options.apiKey || resolveApiKey(),
        baseUrl: options.baseUrl,
    });
}
function textResult(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
function errorResult(err) {
    if (err instanceof RoutaraApiError) {
        return {
            isError: true,
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: err.message,
                        status: err.status,
                        code: err.code,
                        request_id: err.requestId,
                        retry_after_seconds: err.retryAfterSeconds,
                    }, null, 2),
                }],
        };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    };
}
const TOOL_LIST_MODELS = `List models available through Routara.

Use this before another tool when a model was not specified. Supports pagination and text filtering. The count field is always the total number of matches before pagination; returned is the number included in this response.`;
const TOOL_CHAT = `Create an OpenAI-compatible chat completion through Routara.

Use message for a simple single-turn request, or messages for system prompts, multi-turn chat, multimodal content, and tool-call continuations. The complete upstream response is returned, including usage, reasoning_content, and tool_calls when supplied by the model.`;
const TOOL_IMAGE = `Generate or edit an image through Routara.

Model support varies. Besides prompt and size, the tool can pass quality, aspect ratio, reference image URL, negative prompt, seed, style, and response format to compatible models.`;
const TOOL_VIDEO = `Submit an asynchronous video-generation job through Routara.

Supports text-to-video and image-to-video. Save the returned id or task_id and poll it with routara_get_video_status until completed or failed.`;
const TOOL_VIDEO_STATUS = `Poll a Routara video-generation job.

Pass the model when the upstream provider requires model-specific status routing.`;
const jsonObject = z.record(z.unknown());
const chatMessage = z.object({
    role: z.enum(['system', 'developer', 'user', 'assistant', 'tool']),
    content: z.union([z.string(), z.array(jsonObject)]),
    name: z.string().optional(),
    tool_call_id: z.string().optional(),
    tool_calls: z.array(jsonObject).optional(),
});
export function createRoutaraMcpServer(options = {}) {
    const server = new McpServer({ name: 'routara-mcp', version: PKG_VERSION });
    server.tool('routara_list_models', TOOL_LIST_MODELS, {
        query: z.string().optional().describe('Case-insensitive text filter applied to model IDs'),
        offset: z.number().int().min(0).optional().describe('Pagination offset, default 0'),
        limit: z.number().int().min(1).max(1000).optional().describe('Models returned, default 200, maximum 1000'),
    }, async ({ query, offset = 0, limit = 200 }) => {
        try {
            const data = await getClient(options).listModels();
            const all = (data.data ?? []).map((model) => model.id);
            const normalizedQuery = query?.trim().toLowerCase();
            const matches = normalizedQuery
                ? all.filter((id) => id.toLowerCase().includes(normalizedQuery))
                : all;
            const models = matches.slice(offset, offset + limit);
            return textResult({
                count: matches.length,
                returned: models.length,
                offset,
                limit,
                models,
                truncated: offset + models.length < matches.length,
            });
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool('routara_chat', TOOL_CHAT, {
        model: z.string().min(1).describe('Model slug from routara_list_models'),
        message: z.string().optional().describe('Convenience single user message; use messages for multi-turn input'),
        messages: z.array(chatMessage).min(1).optional().describe('OpenAI-compatible conversation messages'),
        max_tokens: z.number().int().min(1).max(131072).optional(),
        temperature: z.number().min(0).max(2).optional(),
        top_p: z.number().min(0).max(1).optional(),
        stop: z.union([z.string(), z.array(z.string())]).optional(),
        tools: z.array(jsonObject).optional().describe('OpenAI-compatible function tools'),
        tool_choice: z.unknown().optional().describe('OpenAI-compatible tool choice'),
    }, async ({ model, message, messages, max_tokens, temperature, top_p, stop, tools, tool_choice }) => {
        try {
            if (!message && !messages) {
                throw new Error('Provide message or messages.');
            }
            const conversation = (messages ?? [{ role: 'user', content: message }]);
            const data = await getClient(options).chat({
                model,
                messages: conversation,
                max_tokens,
                temperature,
                top_p,
                stop,
                tools,
                tool_choice,
            });
            return textResult(data);
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool('routara_generate_image', TOOL_IMAGE, {
        model: z.string().min(1).describe('Image model slug from routara_list_models'),
        prompt: z.string().min(1).describe('Detailed image prompt'),
        size: z.string().optional().describe('Output dimensions such as 1024x1024'),
        n: z.number().int().min(1).max(4).optional(),
        quality: z.string().optional(),
        response_format: z.enum(['url', 'b64_json']).optional(),
        aspect_ratio: z.string().optional().describe('Aspect ratio such as 1:1, 16:9, or 9:16'),
        image_url: z.string().url().optional().describe('Reference image URL for compatible image-edit models'),
        negative_prompt: z.string().optional(),
        seed: z.number().int().optional(),
        style: z.string().optional(),
    }, async (params) => {
        try {
            return textResult(await getClient(options).generateImage(params));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool('routara_generate_video', TOOL_VIDEO, {
        model: z.string().min(1).describe('Video model slug from routara_list_models'),
        prompt: z.string().min(1).describe('Scene and motion description'),
        duration: z.number().int().min(1).max(60).optional(),
        aspect_ratio: z.string().optional().describe('Aspect ratio such as 16:9 or 9:16'),
        image_url: z.string().url().optional().describe('Starting frame for image-to-video'),
        negative_prompt: z.string().optional(),
        resolution: z.string().optional().describe('Model-specific resolution such as 720p or 1080p'),
        fps: z.number().int().min(1).max(120).optional(),
    }, async (params) => {
        try {
            return textResult(await getClient(options).generateVideo(params));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.tool('routara_get_video_status', TOOL_VIDEO_STATUS, {
        task_id: z.string().min(1).describe('Task id returned by routara_generate_video'),
        model: z.string().optional().describe('Optional video model slug for provider-specific status routing'),
    }, async ({ task_id, model }) => {
        try {
            return textResult(await getClient(options).getVideoTask(task_id, model));
        }
        catch (err) {
            return errorResult(err);
        }
    });
    return server;
}
/** Smithery hosted-module entrypoint. */
export function createServer({ config, } = {}) {
    return createRoutaraMcpServer({ apiKey: config?.apiKey, baseUrl: config?.baseUrl });
}
export async function main() {
    const server = createRoutaraMcpServer();
    await server.connect(new StdioServerTransport());
}
// `index.ts` is also bundled into the Routara HTTP gateway. In a CommonJS
// bundle `import.meta.url` is unavailable, so guard it before resolving the
// entrypoint instead of evaluating fileURLToPath eagerly.
const currentModulePath = typeof import.meta.url === 'string' ? fileURLToPath(import.meta.url) : '';
const isDirectExecution = Boolean(currentModulePath && process.argv[1] && currentModulePath === resolve(process.argv[1]));
if (isDirectExecution) {
    main().catch((err) => {
        console.error('[routara-mcp] fatal:', err);
        process.exit(1);
    });
}
