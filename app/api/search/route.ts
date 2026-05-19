import { NextResponse } from "next/server";
import { z } from "zod";
import { runSearch } from "@/lib/orchestrator";

export const runtime = "nodejs"; // stdio MCP는 Node 런타임 필수
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  query: z.string().trim().min(1, "query is required").max(100),
  type: z.enum(["name", "ingredient", "efficacy"]).default("name"),
  limit: z.number().int().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await runSearch(parsed.data);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      {
        error: "KPIC search failed",
        message,
        hint:
          "vendor/kpic-mcp/dist/index.js 가 빌드돼 있는지 확인하세요. `pnpm setup-mcps`",
      },
      { status: 500 },
    );
  }
}
