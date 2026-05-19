"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  loading?: boolean;
  suggestions: ReadonlyArray<string>;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  loading = false,
  suggestions,
}: SearchBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <label
        htmlFor="screener-search"
        className="block text-sm font-semibold text-slate-700"
      >
        약품명 또는 성분명 검색
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        className="relative mt-2 flex gap-2"
      >
        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 3 3" strokeLinecap="round" />
          </svg>
          <input
            id="screener-search"
            type="text"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="예: 타이레놀, 아스피린, 아세트아미노펜"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || value.trim().length === 0}
          className="shrink-0 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          {loading ? "검색 중…" : "검색"}
        </button>
      </form>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          추천 검색어
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => {
            const active = value.trim().toLowerCase() === s.toLowerCase();
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  onSubmit?.();
                }}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                  (active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")
                }
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
