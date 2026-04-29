"use client";

import { useReducer, useState } from "react";
import {
  REQUEST_HEADERS_DOCS,
  REQUEST_QUERY_DOCS,
  RESPONSE_HEADERS_DOCS,
} from "../api/fetch_syllabus/constants";

type ResponseData = {
  status: number;
  headers: Record<string, string>;
  body: string;
  duration: number;
};

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
    return `// Showing ${Math.min(3, total)} of ${total} rooms\n${JSON.stringify(preview, null, 2)}`;
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

type DocTableItem = {
  name: string;
  type?: string;
  value?: string;
  description: string;
};

type DocTableProps = {
  title: string;
  items: DocTableItem[];
  valueLabel?: string;
  nameColorClass?: string;
};

function DocTable({
  title,
  items,
  valueLabel = "Type",
  nameColorClass = "text-emerald-700 dark:text-emerald-400",
}: DocTableProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h3>
      <table className="w-full text-xs border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400">
            <th className="pb-1 pr-3 font-medium">Name</th>
            <th className="pb-1 pr-3 font-medium">{valueLabel}</th>
            <th className="pb-1 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h) => (
            <tr key={h.name} className="align-top">
              <td className="py-1 pr-3">
                <code
                  className={`font-mono whitespace-nowrap ${nameColorClass}`}
                >
                  {h.name}
                </code>
              </td>
              <td className="py-1 pr-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {h.type || h.value}
              </td>
              <td className="py-1 text-gray-600 dark:text-gray-300">
                {h.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ApiExplorerState = {
  isOpen: boolean;
  useEtag: boolean;
  storedEtag: string | null;
  loading: boolean;
  responseData: ResponseData | null;
  error: string | null;
  subject: string;
  room: string;
  season: string;
  open_time: string;
};

type ApiExplorerAction =
  | { type: "TOGGLE_OPEN" }
  | { type: "TOGGLE_USE_ETAG"; payload: boolean }
  | { type: "FETCH_START" }
  | {
      type: "FETCH_SUCCESS";
      payload: { responseData: ResponseData; etag: string | null };
    }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SET_QUERY_PARAM"; payload: { name: string; value: string } };

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
    case "SET_QUERY_PARAM":
      return { ...state, [action.payload.name]: action.payload.value };
    default:
      return state;
  }
}

export default function ApiExplorer() {
  const [copied, setCopied] = useState(false);
  const [state, dispatch] = useReducer(apiExplorerReducer, {
    isOpen: false,
    useEtag: false,
    storedEtag: null,
    loading: false,
    responseData: null,
    error: null,
    subject: "",
    room: "",
    season: "",
    open_time: "",
  });

  const {
    isOpen,
    useEtag,
    storedEtag,
    loading,
    responseData,
    error,
    subject,
    room,
    season,
    open_time,
  } = state;

  const currentParams = new URLSearchParams();
  if (subject.trim()) currentParams.append("subject", subject.trim());
  if (room.trim()) currentParams.append("room", room.trim());
  if (season.trim()) currentParams.append("season", season.trim());
  if (open_time.trim()) currentParams.append("open_time", open_time.trim());

  const currentQueryString = currentParams.toString()
    ? `?${currentParams.toString()}`
    : "";
  const requestUrl = `/api/fetch_syllabus${currentQueryString}`;

  async function sendRequest(): Promise<void> {
    dispatch({ type: "FETCH_START" });

    const headers: Record<string, string> = {};
    if (useEtag && storedEtag !== null) {
      headers["If-None-Match"] = storedEtag;
    }

    const start = performance.now();
    try {
      const res = await fetch(requestUrl, { headers });
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <DocTable title="Query Parameters" items={REQUEST_QUERY_DOCS} />
          <DocTable title="Request Headers" items={REQUEST_HEADERS_DOCS} />
          <DocTable
            title="Response Headers"
            items={RESPONSE_HEADERS_DOCS}
            valueLabel="Value"
            nameColorClass="text-blue-700 dark:text-blue-400"
          />
        </div>
      </div>

      {/* ── Try it panel ────────────────────────────────────────────── */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            {(["subject", "room", "season", "open_time"] as const).map(
              (param) => (
                <div key={param} className="space-y-1">
                  <label
                    htmlFor={`query-${param}`}
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 block pb-1"
                  >
                    {param}
                  </label>
                  <input
                    id={`query-${param}`}
                    type="text"
                    value={state[param]}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_QUERY_PARAM",
                        payload: { name: param, value: e.target.value },
                      })
                    }
                    className="block w-full rounded border border-gray-300 bg-white text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 py-1.5 px-2 outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500/20"
                    placeholder={`...`}
                  />
                </div>
              ),
            )}
          </div>

          {/* Current Request URL */}
          <div className="flex items-start gap-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-md">
            <span className="text-gray-400 dark:text-gray-500 font-semibold select-none shrink-0 mt-0.5">
              URL
            </span>
            <code
              data-testid="request-url-preview"
              className="font-mono text-gray-800 dark:text-gray-200 break-all flex-1 mt-0.5"
            >
              {requestUrl}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  const fullUrl =
                    typeof window !== "undefined"
                      ? window.location.origin + requestUrl
                      : requestUrl;
                  await navigator.clipboard.writeText(fullUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (e) {
                  console.error("Failed to copy URL", e);
                }
              }}
              className="shrink-0 ml-auto bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

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
