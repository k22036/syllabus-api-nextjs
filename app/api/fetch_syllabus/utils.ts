import { createHash } from "node:crypto";

export function generateETag(payload: string): string {
  return `"${createHash("sha256").update(payload).digest("hex").slice(0, 16)}"`;
}
