/**
 * MCP stdio client singletons.
 *
 * Next dev (Turbopack) recompiles modules constantly, so we keep clients
 * on `globalThis` to avoid spawning N child processes per request.
 *
 * Each client lazily connects on first use and reuses the same stdio
 * subprocess until the Node process exits.
 */

import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type CachedClient = {
  client: Client;
  ready: Promise<void>;
};

interface KavaGlobal {
  __kavaKpic?: CachedClient;
}

const g = globalThis as unknown as KavaGlobal;

function resolveKpicPath(): string {
  const fromEnv = process.env.KPIC_MCP_PATH;
  if (fromEnv && fromEnv.trim().length > 0) {
    return path.resolve(process.cwd(), fromEnv);
  }
  return path.resolve(process.cwd(), "vendor/kpic-mcp/dist/index.js");
}

/**
 * KPIC MCP 클라이언트 (lazy singleton).
 * 호출자는 await getKpicClient() 후 client.callTool(...) 사용.
 */
export async function getKpicClient(): Promise<Client> {
  if (g.__kavaKpic) {
    await g.__kavaKpic.ready;
    return g.__kavaKpic.client;
  }

  const client = new Client(
    { name: "kava-web", version: "0.1.0" },
    { capabilities: {} },
  );

  const transport = new StdioClientTransport({
    command: process.execPath, // 현재 Node를 그대로 사용
    args: [resolveKpicPath()],
    env: {
      ...process.env,
      // MCP 서버는 stdout이 JSON-RPC 채널이므로 stderr만 로그 사용.
      NODE_NO_WARNINGS: "1",
    },
    stderr: "inherit",
  });

  const ready = client.connect(transport).catch((err) => {
    // 연결 실패 시 캐시 무효화하여 다음 호출에서 재시도
    g.__kavaKpic = undefined;
    throw err;
  });

  g.__kavaKpic = { client, ready };
  await ready;
  return client;
}
