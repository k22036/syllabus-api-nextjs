"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";

type SyllabusItem = {
  subject: string;
  room: string;
  season: string;
  open_time: string;
};

type Props = {
  data: Record<string, SyllabusItem[]>;
  totalRooms: number;
  totalSubjects: number;
};

const PAGE_SIZE = 20;

function parseSubject(subject: string): { code: string; name: string } {
  const sep = " : ";
  const idx = subject.indexOf(sep);
  if (idx === -1) {
    return { code: "", name: subject };
  }
  return {
    code: subject.slice(0, idx),
    name: subject.slice(idx + sep.length),
  };
}

const SEASONS = ["すべて", "前期", "後期"] as const;

const CARD_BASE =
  "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3";

export default function SyllabusDataBrowser({
  data,
  totalRooms,
  totalSubjects,
}: Props): JSX.Element {
  const [search, setSearch] = useState<string>("");
  const [season, setSeason] = useState<string>("すべて");
  const [page, setPage] = useState<number>(1);

  const allItems = useMemo<SyllabusItem[]>(
    () => Object.values(data).flat(),
    [data],
  );

  const filtered = useMemo<SyllabusItem[]>(() => {
    const q = search.toLowerCase();
    return allItems.filter((item) => {
      const matchesSearch =
        q === "" ||
        item.subject.toLowerCase().includes(q) ||
        item.room.toLowerCase().includes(q);
      const matchesSeason = season === "すべて" || item.season === season;
      return matchesSearch && matchesSeason;
    });
  }, [allItems, search, season]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, filtered.length);
  const paginated = filtered.slice(startIdx, endIdx);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleSeasonChange(value: string): void {
    setSeason(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={CARD_BASE}>
          <p className="text-xs text-gray-500 dark:text-gray-400">教室数</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            {totalRooms.toLocaleString()}
          </p>
        </div>
        <div className={CARD_BASE}>
          <p className="text-xs text-gray-500 dark:text-gray-400">授業数</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            {totalSubjects.toLocaleString()}
          </p>
        </div>
        <div className={CARD_BASE}>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            絞り込み結果
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {filtered.length.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="科目名・教室名で検索..."
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {SEASONS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSeasonChange(s)}
              className={[
                "px-3 py-2 text-sm font-medium transition-colors",
                i > 0 ? "border-l border-gray-200 dark:border-gray-700" : "",
                season === s
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Data table ────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
              <th className="px-4 py-3 whitespace-nowrap">科目コード</th>
              <th className="px-4 py-3">科目名</th>
              <th className="px-4 py-3 whitespace-nowrap">教室</th>
              <th className="px-4 py-3 whitespace-nowrap">学期</th>
              <th className="px-4 py-3 whitespace-nowrap">開講時限</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  該当するデータがありません
                </td>
              </tr>
            ) : (
              paginated.map((item) => {
                const { code, name } = parseSubject(item.subject);
                const isSenki = item.season === "前期";
                return (
                  <tr
                    key={`${item.subject}-${item.room}-${item.season}-${item.open_time}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {code}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                      {name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {item.room}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          isSenki
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                        }`}
                      >
                        {item.season}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {item.open_time}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {pageCount > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p className="text-gray-500 dark:text-gray-400">
            {startIdx + 1}–{endIdx} / {filtered.length} 件
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← 前
            </button>
            <span className="text-gray-600 dark:text-gray-400 tabular-nums">
              {safePage} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              次 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
