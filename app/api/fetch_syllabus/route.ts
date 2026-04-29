import z from "zod";
import type { SyllabusData } from "../../_types/syllabus";
import rawData from "../../data/shaped_data.json";
import { SYLLABUS_HEADERS } from "./constants";
import { syllabusQuerySchema } from "./schema";
import { generateETag } from "./utils";

const data = rawData as SyllabusData;

// 事前にキャッシュしておくフルデータのシリアライズとETag
const fullSerialized = JSON.stringify(data);

const fullEtag = generateETag(fullSerialized);

export async function GET(request: Request) {
  const url = new URL(request.url);

  // フィルタリングパラメータのパースと型変換（小文字化を含む）
  const parsed = syllabusQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: z.treeifyError(parsed.error),
      }),
      {
        status: 400,
        headers: { "content-type": SYLLABUS_HEADERS.contentType },
      },
    );
  }
  const query = parsed.data;

  const subjectQuery = query.subject || null;
  const roomQuery = query.room || null;
  const seasonQuery = query.season || null;
  const openTimeQuery = query.open_time || null;

  let filteredSerialized = fullSerialized;
  let currentEtag = fullEtag;

  // フィルタリング条件が一つでも存在する場合はフィルタリング処理を行う
  if (subjectQuery || roomQuery || seasonQuery || openTimeQuery) {
    const filteredData: SyllabusData = {};

    for (const [roomName, items] of Object.entries(data)) {
      if (roomQuery && !roomName.toLowerCase().includes(roomQuery)) continue;

      const filteredItems = items.filter(
        (item) =>
          (!subjectQuery ||
            item.subject.toLowerCase().includes(subjectQuery)) &&
          (!seasonQuery || item.season === seasonQuery) &&
          (!openTimeQuery || item.open_time === openTimeQuery),
      );

      if (filteredItems.length > 0) {
        filteredData[roomName] = filteredItems;
      }
    }

    filteredSerialized = JSON.stringify(filteredData);
    currentEtag = generateETag(filteredSerialized);
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === currentEtag) {
    return new Response(null, {
      status: 304,
      headers: {
        "cache-control": SYLLABUS_HEADERS.cacheControl,
      },
    });
  }

  return new Response(filteredSerialized, {
    status: 200,
    headers: {
      "content-type": SYLLABUS_HEADERS.contentType,
      "cache-control": SYLLABUS_HEADERS.cacheControl,
      etag: currentEtag,
    },
  });
}
