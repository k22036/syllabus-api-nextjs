"use client";

import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { useCallback, useMemo, useState } from "react";
import type { SyllabusData } from "../_types/syllabus";
import { parseSubject } from "../_utils/formatters";

// ============================================================================
// Constants & Types
// ============================================================================

const PAGE_SIZE = 20;
const SEASONS = ["すべて", "前期", "後期"] as const;

type Season = (typeof SEASONS)[number];

type Props = {
  data: SyllabusData;
  totalRooms: number;
  totalSubjects: number;
};

// ============================================================================
// Custom Hooks
// ============================================================================

function useSyllabusBrowser(data: SyllabusData) {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState<Season>("すべて");
  const [page, setPage] = useState(1);

  const allItems = useMemo(
    () =>
      Object.values(data)
        .flat()
        .map((item, index) => ({ ...item, _uid: index })),
    [data],
  );

  const filtered = useMemo(() => {
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

  const exportCsv = useCallback(() => {
    const header = ["科目コード", "科目名", "教室", "学期", "開講時限"];
    const escapeField = (field: string) => {
      let str = field;
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = filtered.map((item) => {
      const { code, name } = parseSubject(item.subject);
      return [code, name, item.room, item.season, item.open_time]
        .map(escapeField)
        .join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `syllabus_${season === "すべて" ? "all" : season}_${filtered.length}件.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    requestAnimationFrame(() => {
      URL.revokeObjectURL(url);
    });
  }, [filtered, season]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, filtered.length);
  const paginatedItems = filtered.slice(startIdx, endIdx);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSeasonChange = (value: Season) => {
    setSeason(value);
    setPage(1);
  };

  const handlePageChange = (delta: number) => {
    setPage(Math.max(1, Math.min(safePage + delta, pageCount)));
  };

  return {
    search,
    season,
    filteredCount: filtered.length,
    paginatedItems,
    safePage,
    pageCount,
    startIdx,
    endIdx,
    handleSearchChange,
    handleSeasonChange,
    handlePageChange,
    exportCsv,
  };
}

// ============================================================================
// Sub Components
// ============================================================================

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`text-2xl font-bold mt-0.5 ${
          highlight
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SyllabusDataBrowser({
  data,
  totalRooms,
  totalSubjects,
}: Props) {
  const {
    search,
    season,
    filteredCount,
    paginatedItems,
    safePage,
    pageCount,
    startIdx,
    endIdx,
    handleSearchChange,
    handleSeasonChange,
    handlePageChange,
    exportCsv,
  } = useSyllabusBrowser(data);

  return (
    <div className="space-y-4">
      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="教室数" value={totalRooms} />
        <StatCard label="授業数" value={totalSubjects} />
        <StatCard label="絞り込み結果" value={filteredCount} highlight />
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="科目名・教室名で検索"
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

        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredCount === 0}
          aria-label="CSVエクスポート"
          className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
          CSV
        </button>
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
            {paginatedItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  該当するデータがありません
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const { code, name } = parseSubject(item.subject);
                const isSenki = item.season === "前期";
                return (
                  <tr
                    key={item._uid}
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
            {startIdx + 1}–{endIdx} / {filteredCount} 件
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(-1)}
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
              onClick={() => handlePageChange(1)}
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
