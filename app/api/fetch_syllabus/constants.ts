export const CACHE_AGE_SECONDS = 60;
export const STALE_WHILE_REVALIDATE_SECONDS = 300;

export const SYLLABUS_HEADERS = {
  contentType: "application/json; charset=UTF-8",
  cacheControl: `public, max-age=${CACHE_AGE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
} as const;

export const REQUEST_HEADERS_DOCS: Array<{
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

export const RESPONSE_HEADERS_DOCS: Array<{
  name: string;
  value: string;
  description: string;
}> = [
  {
    name: "Content-Type",
    value: SYLLABUS_HEADERS.contentType,
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
    value: SYLLABUS_HEADERS.cacheControl,
    description: `${CACHE_AGE_SECONDS} 秒キャッシュし、最大 ${STALE_WHILE_REVALIDATE_SECONDS} 秒の古いレスポンス配信を許可。`,
  },
];
