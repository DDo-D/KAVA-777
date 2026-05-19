import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DURUMI_URL = process.env.DURUMI_URL ?? "http://127.0.0.1:5000";

const BodySchema = z.object({
  companies: z.array(z.string().trim().min(1)).min(1).max(50),
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

  try {
    const res = await fetch(`${DURUMI_URL}/api/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companies: parsed.data.companies }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      return NextResponse.json({ financials: {}, unavailable: true });
    }

    const data = await res.json();

    const financials: Record<string, { per: number | null; evEbitda: number | null }> = {};
    for (const row of (data.financials ?? [])) {
      const name: string = row["입력회사명"] || "";
      if (!name) continue;
      const per = row["PER"] != null && row["PER"] !== "" ? parseFloat(row["PER"]) : null;
      const ev = row["EV/EBITDA"] != null && row["EV/EBITDA"] !== "" ? parseFloat(row["EV/EBITDA"]) : null;
      financials[name] = {
        per: per !== null && !isNaN(per) ? per : null,
        evEbitda: ev !== null && !isNaN(ev) ? ev : null,
      };
    }

    return NextResponse.json({ financials });
  } catch {
    return NextResponse.json({ financials: {}, unavailable: true });
  }
}
