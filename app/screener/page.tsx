import type { Metadata } from "next";
import ValuationDashboard from "@/components/ValuationDashboard";

export const metadata: Metadata = {
  title: "Drug & Indication Valuation Screener",
  description:
    "Search by drug, ingredient, indication, or therapeutic area and compare PER / EV·EBITDA across pharma & biotech.",
};

export default function ScreenerPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <ValuationDashboard />
    </main>
  );
}
