import { createHash } from "node:crypto";
import data from "../../data/shaped_data.json";

const serialized = JSON.stringify(data);
const etag = `"${createHash("sha256").update(serialized).digest("hex").slice(0, 16)}"`;

export async function GET(request: Request) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  }

  return new Response(serialized, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      etag: etag,
    },
  });
}
