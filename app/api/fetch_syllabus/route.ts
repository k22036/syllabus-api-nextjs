import { createHash } from "node:crypto";
import type { SyllabusData } from "../../_types/syllabus";
import rawData from "../../data/shaped_data.json";
import { SYLLABUS_HEADERS } from "./constants";

const data = rawData as SyllabusData;

// 事前にキャッシュしておくフルデータのシリアライズとETag
const fullSerialized = JSON.stringify(data);
const fullEtag = `"${createHash("sha256").update(fullSerialized).digest("hex").slice(0, 16)}"`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // フィルタリングパラメータの取得
  const subjectQuery = searchParams.get("subject")?.toLowerCase() || null;
  const roomQuery = searchParams.get("room")?.toLowerCase() || null;
  const seasonQuery = searchParams.get("season") || null;
  const openTimeQuery = searchParams.get("open_time") || null;

  let filteredSerialized = fullSerialized;
  let currentEtag = fullEtag;

  // フィルタリング条件が一つでも存在する場合はフィルタリング処理を行う
  if (subjectQuery || roomQuery || seasonQuery || openTimeQuery) {
    const filteredData: SyllabusData = {};
    for (const [roomName, items] of Object.entries(data)) {
      const filteredItems = items.filter((item) => {
        let isMatch = true;
        if (
          subjectQuery &&
          !item.subject.toLowerCase().includes(subjectQuery)
        ) {
          isMatch = false;
        }
        if (roomQuery && !item.room.toLowerCase().includes(roomQuery)) {
          isMatch = false;
        }
        if (seasonQuery && item.season !== seasonQuery) {
          isMatch = false;
        }
        if (openTimeQuery && item.open_time !== openTimeQuery) {
          isMatch = false;
        }
        return isMatch;
      });

      if (filteredItems.length > 0) {
        filteredData[roomName] = filteredItems;
      }
    }
    filteredSerialized = JSON.stringify(filteredData);
    currentEtag = `"${createHash("sha256").update(filteredSerialized).digest("hex").slice(0, 16)}"`;
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
