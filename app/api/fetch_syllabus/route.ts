import { createHash } from "node:crypto";
import data from "../../data/shaped_data.json";
import { SYLLABUS_HEADERS } from "./constants";

const serialized = JSON.stringify(data);
const etag = `"${createHash("sha256").update(serialized).digest("hex").slice(0, 16)}"`;

export async function GET(request: Request) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        "cache-control": SYLLABUS_HEADERS.cacheControl,
      },
    });
  }

  return new Response(serialized, {
    status: 200,
    headers: {
      "content-type": SYLLABUS_HEADERS.contentType,
      "cache-control": SYLLABUS_HEADERS.cacheControl,
      etag: etag,
    },
  });
}
