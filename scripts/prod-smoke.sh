#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
source /root/unified-llm-api-token-aggregator/.env

NODE_IMG=node:22-alpine
run_node() {
  docker run --rm -v "$ROOT:/app" -w /app -e ROUTARA_API_KEY="${ROUTARA_API_KEY:-}" "$NODE_IMG" node "$@"
}

if [ ! -d node_modules ]; then
  docker run --rm -v "$ROOT:/app" -w /app "$NODE_IMG" npm install --omit=dev
fi

SECRET="sk-or-v1-mcpsmoke$(openssl rand -hex 6)"
HASH=$(PROBE_SECRET="$SECRET" API_KEY_PEPPER="$API_KEY_PEPPER" python3 -c "import hashlib,os;print(hashlib.sha256((os.environ['API_KEY_PEPPER']+os.environ['PROBE_SECRET']).encode()).hexdigest())")
USER_ID=usr_8cb89280
KID=key_mcpsmoke
docker exec aggregator_postgres psql -U postgres -d aggregator -q -c "INSERT INTO user_api_keys (id,user_id,name,secret_hash,secret_prefix,status) VALUES ('$KID','$USER_ID','mcp-smoke','$HASH','${SECRET:0:12}', 'active') ON CONFLICT (id) DO UPDATE SET secret_hash=EXCLUDED.secret_hash, status='active'"
docker exec aggregator_redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning HMSET "apikey:idx:$HASH" user_id "$USER_ID" key_id "$KID" key_status active qps_limit 20 tpm_limit 100000 >/dev/null

export ROUTARA_API_KEY="$SECRET"
run_node scripts/live-smoke.mjs
run_node --test dist/test/smoke.test.js

docker exec aggregator_postgres psql -U postgres -d aggregator -q -c "DELETE FROM user_api_keys WHERE id='$KID';"
docker exec aggregator_redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning DEL "apikey:idx:$HASH" >/dev/null
echo "MCP smoke OK"
