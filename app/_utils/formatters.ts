export function parseSubject(subject: string): { code: string; name: string } {
  const sep = " : ";
  const idx = subject.indexOf(sep);
  if (idx === -1) {
    return { code: "", name: subject };
  }
  return {
    code: subject.slice(0, idx),
    name: subject.slice(idx + sep.length),
  };
}

export function formatJsonBody(
  raw: string,
  maxKeys = 3,
  entityName = "rooms",
): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown[]>;
    const keys = Object.keys(parsed);
    const total = keys.length;
    const previewKeys = keys.slice(0, maxKeys);
    const preview: Record<string, unknown[]> = {};
    for (const key of previewKeys) {
      preview[key] = parsed[key];
    }
    return `// Showing ${Math.min(maxKeys, total)} of ${total} ${entityName}\n${JSON.stringify(preview, null, 2)}`;
  } catch {
    return raw;
  }
}

export function getStatusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  }
  if (status >= 300 && status < 400) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}
