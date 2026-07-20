#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
export type RoutaraMcpServerOptions = {
    apiKey?: string;
    baseUrl?: string;
};
export declare const configSchema: z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
}, {
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
}>;
export declare function createRoutaraMcpServer(options?: RoutaraMcpServerOptions): McpServer;
/** Smithery hosted-module entrypoint. */
export declare function createServer({ config, }?: {
    config?: z.infer<typeof configSchema>;
}): McpServer;
export declare function main(): Promise<void>;
