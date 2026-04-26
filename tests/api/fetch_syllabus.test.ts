import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  RESPONSE_HEADERS_DOCS,
  SYLLABUS_HEADERS,
} from "../../app/api/fetch_syllabus/constants";
import { GET } from "../../app/api/fetch_syllabus/route";

// スキーマ定義
const SyllabusItemSchema = z.object({
  subject: z.string().min(1),
  room: z.string().min(1),
  season: z.string().min(1),
  open_time: z.string().min(1),
});

// レスポンス全体のスキーマ（キーが文字列、値がSyllabusItemの配列）
const ResponseSchema = z.record(z.string(), z.array(SyllabusItemSchema));

const BASE_URL = "http://localhost/api/fetch_syllabus";
const createRequest = (
  headers?: HeadersInit,
  query?: Record<string, string>,
): Request => {
  const url = new URL(BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.append(key, value);
    }
  }
  return new Request(url.toString(), { headers });
};

describe("GET /api/fetch_syllabus", () => {
  describe("初回リクエスト（If-None-Match なし）", () => {
    test("ステータスコードが 200 であること", async () => {
      const request = createRequest();
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    test("ETag ヘッダーが存在すること", async () => {
      const request = createRequest();
      const response = await GET(request);
      const etag = response.headers.get("etag");
      expect(etag).not.toBeNull();
      // ETag は ダブルクォートで囲まれた文字列
      expect(etag).toMatch(/^".+"$/);
    });

    test("Cache-Control ヘッダーが設定されていること", async () => {
      const request = createRequest();
      const response = await GET(request);
      const cacheControl = response.headers.get("cache-control");
      expect(cacheControl).toBe(SYLLABUS_HEADERS.cacheControl);

      // UIのドキュメントと実際の値が一致していることも確認
      const docsCacheControl = RESPONSE_HEADERS_DOCS.find(
        (h) => h.name === "Cache-Control",
      );
      expect(docsCacheControl?.value).toBe(SYLLABUS_HEADERS.cacheControl);
    });

    test("Content-Type が application/json であること", async () => {
      const request = createRequest();
      const response = await GET(request);
      const contentType = response.headers.get("content-type");
      expect(contentType).toBe(SYLLABUS_HEADERS.contentType);

      // UIのドキュメントと実際の値が一致していることも確認
      const docsContentType = RESPONSE_HEADERS_DOCS.find(
        (h) => h.name === "Content-Type",
      );
      expect(docsContentType?.value).toBe(SYLLABUS_HEADERS.contentType);
    });

    test("レスポンスボディがスキーマに準拠していること", async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();
      const result = ResponseSchema.safeParse(data);

      // パース失敗時はエラー詳細を表示してテストを落とす
      if (!result.success) {
        console.error(result.error);
      }
      expect(result.success).toBe(true);
    });

    test("レスポンスデータが空でないこと", async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();
      expect(Object.keys(data).length).toBeGreaterThan(0);
    });
  });

  describe("条件付きリクエスト（If-None-Match あり）", () => {
    test("ETag が一致する場合、304 を返しボディが空であること", async () => {
      // まず通常リクエストで ETag を取得する
      const firstRequest = createRequest();
      const firstResponse = await GET(firstRequest);
      const etag = firstResponse.headers.get("etag");
      expect(etag).not.toBeNull();

      // 取得した ETag を If-None-Match に付けて再リクエスト
      const conditionalRequest = createRequest({
        "if-none-match": etag as string,
      });
      const conditionalResponse = await GET(conditionalRequest);

      expect(conditionalResponse.status).toBe(304);

      // 304 はボディを持たない
      const body = await conditionalResponse.text();
      expect(body).toBe("");
    });

    test("ETag が一致する場合、304 レスポンスにも Cache-Control ヘッダーが存在すること", async () => {
      const firstRequest = createRequest();
      const firstResponse = await GET(firstRequest);
      const etag = firstResponse.headers.get("etag") as string;

      const conditionalRequest = createRequest({ "if-none-match": etag });
      const conditionalResponse = await GET(conditionalRequest);

      expect(conditionalResponse.status).toBe(304);
      const cacheControl = conditionalResponse.headers.get("cache-control");
      expect(cacheControl).toBe(SYLLABUS_HEADERS.cacheControl);
    });

    test("ETag が一致しない場合、200 を返しボディが存在すること", async () => {
      const staleEtag = '"0000000000000000"';
      const request = createRequest({ "if-none-match": staleEtag });
      const response = await GET(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Object.keys(data).length).toBeGreaterThan(0);
    });

    test("ETag が一致しない場合、新しい ETag ヘッダーが付いていること", async () => {
      const staleEtag = '"0000000000000000"';
      const request = createRequest({ "if-none-match": staleEtag });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const newEtag = response.headers.get("etag");
      expect(newEtag).not.toBeNull();
      expect(newEtag).not.toBe(staleEtag);
    });

    test("同一エンドポイントへの複数回リクエストで ETag が変わらないこと", async () => {
      const firstRequest = createRequest();
      const firstResponse = await GET(firstRequest);
      const firstEtag = firstResponse.headers.get("etag");

      const secondRequest = createRequest();
      const secondResponse = await GET(secondRequest);
      const secondEtag = secondResponse.headers.get("etag");

      expect(firstEtag).toBe(secondEtag);
    });
  });

  describe("クエリパラメータによるフィルタリング", () => {
    test("subject パラメータで部分一致フィルタリングができること", async () => {
      const request = createRequest(undefined, { subject: "プログラミング" });
      const response = await GET(request);
      const data = (await response.json()) as Record<
        string,
        { subject: string; room: string; season: string; open_time: string }[]
      >;

      for (const items of Object.values(data)) {
        for (const item of items) {
          expect(item.subject.toLowerCase()).toContain("プログラミング");
        }
      }
    });

    test("room パラメータで部分一致フィルタリングができること", async () => {
      const request = createRequest(undefined, { room: "101" });
      const response = await GET(request);
      const data = (await response.json()) as Record<
        string,
        { subject: string; room: string; season: string; open_time: string }[]
      >;

      for (const items of Object.values(data)) {
        for (const item of items) {
          expect(item.room.toLowerCase()).toContain("101");
        }
      }
    });

    test("season パラメータで完全一致フィルタリングができること", async () => {
      const request = createRequest(undefined, { season: "前期" });
      const response = await GET(request);
      const data = (await response.json()) as Record<
        string,
        { subject: string; room: string; season: string; open_time: string }[]
      >;

      for (const items of Object.values(data)) {
        for (const item of items) {
          expect(item.season).toBe("前期");
        }
      }
    });

    test("該当データがない場合は空のオブジェクトが返ること", async () => {
      const request = createRequest(undefined, { subject: "存在しない科目" });
      const response = await GET(request);
      const data = await response.json();
      expect(data).toEqual({});
    });
  });
});
