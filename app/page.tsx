import { SearchPanel } from "@/components/SearchPanel";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-foreground/60">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          KPIC connected
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          KAVA — 약품 검색 → 제약회사
        </h1>
        <p className="text-foreground/70 max-w-2xl">
          약품명, 성분, 또는 효능을 검색하면 약학정보원(KPIC)에서 약품 정보를
          가져와 정리하고, 등장하는 제조사를 한눈에 볼 수 있게 묶어 줍니다.
        </p>
      </header>

      <SearchPanel />

      <footer className="mt-auto pt-8 text-xs text-foreground/50 border-t border-black/5 dark:border-white/5">
        데이터 출처: <a className="underline" href="https://www.health.kr" target="_blank" rel="noreferrer">약학정보원</a> · MCP via vendor/kpic-mcp
      </footer>
    </main>
  );
}
