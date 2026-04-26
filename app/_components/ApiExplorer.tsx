"use client";

import { useReducer } from "react";

type ResponseData = {
  status: number;
  headers: Record<string, string>;
  body: string;
  duration: number;
};

const REQUEST_HEADERS_DOCS: Array<{
  name: string;
  type: string;
  description: string;
}> = [
  {
    name: "If-None-Match",
    type: "string (optional)",
    description:
      "前回レスポンスの ETag 値。値が一致する場合、サーバーは 304 Not Modified を返しボディを省略します。",
  },
];

const RESPONSE_HEADERS_DOCS: Array<{
  name: string;
  value: string;
  description: string;
}> = [
  {
    name: "Content-Type",
    value: "application/json; charset=UTF-8",
    description: "レスポンスボディの MIME タイプとエンコーディング。",
  },
  {
    name: "ETag",
    value: '"<sha256[:16]>"',
    description:
      "ボディの SHA-256 ハッシュ先頭 16 文字。条件付きリクエストに使用します。",
  },
  {
    name: "Cache-Control",
    value: "public, max-age=60, stale-while-revalidate=300",
    description: "60 秒キャッシュし、最大 300 秒の古いレスポンス配信を許可。",
  },
];

function formatBody(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown[]>;
    const keys = Object.keys(parsed);
    const total = keys.length;
    const previewKeys = keys.slice(0, 3);
    const preview: Record<string, unknown[]> = {};
    for (const key of previewKeys) {
      preview[key] = parsed[key];
    }
    return `// Showing 3 of ${total} rooms\n${JSON.stringify(preview, null, 2)}`;
  } catch {
    return raw;
  }
}

function statusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  }
  if (status >= 300 && status < 400) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  return (
    <details open={defaultOpen || undefined} className="group">
      <summary className="list-none cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
        <span className="inline-block transition-transform group-open:rotate-90">
          ▶
        </span>
        {title}
      </summary>
      {children}
    </details>
  );
}

type ApiExplorerState = {
  isOpen: boolean;
  useEtag: boolean;
  storedEtag: string | null;
  loading: boolean;
  responseData: ResponseData | null;
  error: string | null;
};

type ApiExplorerAction =
  | { type: "TOGGLE_OPEN" }
  | { type: "TOGGLE_USE_ETAG"; payload: boolean }
  | { type: "FETCH_START" }
  | {
      type: "FETCH_SUCCESS";
      payload: { responseData: ResponseData; etag: string | null };
    }
  | { type: "FETCH_ERROR"; payload: string };

function apiExplorerReducer(
  state: ApiExplorerState,
  action: ApiExplorerAction,
): ApiExplorerState {
  switch (action.type) {
    case "TOGGLE_OPEN":
      return { ...state, isOpen: !state.isOpen };
    case "TOGGLE_USE_ETAG":
      return { ...state, useEtag: action.payload };
    case "FETCH_START":
      return { ...state, loading: true, error: null, responseData: null };
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        responseData: action.payload.responseData,
        storedEtag:
          action.payload.etag !== null ? action.payload.etag : state.storedEtag,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export default function ApiExplorer() {
  const [state, dispatch] = useReducer(apiExplorerReducer, {
    isOpen: false,
    useEtag: false,
    storedEtag: null,
    loading: false,
    responseData: null,
    error: null,
  });

  const { isOpen, useEtag, storedEtag, loading, responseData, error } = state;

  async function sendRequest(): Promise<void> {
    dispatch({ type: "FETCH_START" });

    const headers: Record<string, string> = {};
    if (useEtag && storedEtag !== null) {
      headers["If-None-Match"] = storedEtag;
    }

    const start = performance.now();
    try {
      const res = await fetch("/api/fetch_syllabus", { headers });
      const duration = Math.round(performance.now() - start);

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const etag = res.headers.get("etag");
      let body = "";
      if (res.status !== 304) {
        body = await res.text();
      }

      dispatch({
        type: "FETCH_SUCCESS",
        payload: {
          responseData: {
            status: res.status,
            headers: responseHeaders,
            body,
            duration,
          },
          etag,
        },
      });
    } catch (err) {
      dispatch({
        type: "FETCH_ERROR",
        payload: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3">
        <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-emerald-500 shrink-0">
          GET
        </span>
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200 flex-1">
          /api/fetch_syllabus
        </code>
        <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 shrink-0">
          シラバスデータを JSON で返します。ETag
          による条件付きリクエストをサポート。
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_OPEN" })}
          className="shrink-0 text-xs font-medium px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isOpen ? "閉じる" : "Try it"}
        </button>
      </div>

      {/* ── Documentation grid ──────────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Request Headers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Request Headers
            </h3>
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-1 pr-3 font-medium">Name</th>
                  <th className="pb-1 pr-3 font-medium">Type</th>
                  <th className="pb-1 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {REQUEST_HEADERS_DOCS.map((h) => (
                  <tr key={h.name} className="align-top">
                    <td className="py-1 pr-3">
                      <code className="font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {h.name}
                      </code>
                    </td>
                    <td className="py-1 pr-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {h.type}
                    </td>
                    <td className="py-1 text-gray-600 dark:text-gray-300">
                      {h.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Response Headers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Response Headers
            </h3>
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-1 pr-3 font-medium">Name</th>
                  <th className="pb-1 pr-3 font-medium">Value</th>
                  <th className="pb-1 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {RESPONSE_HEADERS_DOCS.map((h) => (
                  <tr key={h.name} className="align-top">
                    <td className="py-1 pr-3">
                      <code className="font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        {h.name}
                      </code>
                    </td>
                    <td className="py-1 pr-3 text-gray-500 dark:text-gray-400">
                      {h.value}
                    </td>
                    <td className="py-1 text-gray-600 dark:text-gray-300">
                      {h.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Try it panel ────────────────────────────────────────────── */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-4">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={useEtag}
                disabled={storedEtag === null}
                onChange={(e) =>
                  dispatch({
                    type: "TOGGLE_USE_ETAG",
                    payload: e.target.checked,
                  })
                }
                className="rounded border-gray-300 dark:border-gray-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              />
              <span>If-None-Match を使用</span>
              {storedEtag === null ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  (最初のリクエスト後に有効)
                </span>
              ) : (
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-gray-700 dark:text-gray-300">
                  {storedEtag}
                </code>
              )}
            </label>

            <button
              type="button"
              onClick={sendRequest}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded px-4 py-1.5 transition-colors"
            >
              {loading ? "送信中..." : "Send Request"}
            </button>
          </div>

          {/* Error alert */}
          {error !== null && (
            <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <span className="font-medium">エラー: </span>
              {error}
            </div>
          )}

          {/* Response display */}
          {responseData !== null && (
            <div className="space-y-3">
              {/* Status + duration */}
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${statusBadgeClass(responseData.status)}`}
                >
                  {responseData.status}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {responseData.duration} ms
                </span>
              </div>

              {/* Response Headers collapsible */}
              <CollapsibleSection title="Response Headers">
                <div className="mt-2 rounded bg-gray-50 dark:bg-gray-800 p-3 text-xs font-mono space-y-0.5">
                  {Object.entries(responseData.headers).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">
                        {key}:
                      </span>
                      <span className="break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Response Body or 304 note */}
              {responseData.status === 304 ? (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                  ✓ 304 Not Modified — データは変更されていません。
                </div>
              ) : (
                <CollapsibleSection title="Response Body" defaultOpen>
                  <pre className="mt-2 bg-gray-50 dark:bg-gray-800 p-3 text-xs overflow-auto max-h-64 rounded">
                    {formatBody(responseData.body)}
                  </pre>
                </CollapsibleSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
