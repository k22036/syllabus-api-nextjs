import { describe, expect, test } from "bun:test";
import { z } from "zod";
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

describe("GET /api/fetch_syllabus", () => {
  test("should validate response against schema", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    const result = ResponseSchema.safeParse(data);

    // パース失敗時はエラー詳細を表示してテストを落とす
    if (!result.success) {
      console.error(result.error);
    }
    expect(result.success).toBe(true);

    // データが空でないことも確認
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });
});
