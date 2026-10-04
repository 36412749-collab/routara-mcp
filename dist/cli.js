#!/usr/bin/env node
import { main } from './index.js';
main().catch((err) => {
    console.error('[routara-mcp] fatal:', err);
    process.exit(1);
});
