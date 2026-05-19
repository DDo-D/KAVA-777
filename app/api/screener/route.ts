import { NextResponse } from "next/server";
import { z } from "zod";
import { runSearch } from "@/lib/orchestrator";
import type { Company } from "@/types/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  query: z.string().trim().min(1).max(100),
  type: z.enum(["name", "ingredient", "efficacy"]).default("name"),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { query, type } = parsed.data;
  const result = await runSearch({ query, type, limit: 50 });

  const companies: Company[] = result.manufacturers.map((m) => ({
    id: m.key,
    name: m.displayName,
    relatedKeywords: [],
    relevanceSummary: `약품 ${m.drugCount}개`,
    metrics: { per: null, evEbitda: null },
  }));

  return NextResponse.json({
    companies,
    warnings: result.warnings,
    genericExpanded: result.genericExpanded ?? false,
    genericIngredient: result.genericIngredient,
  });
}
