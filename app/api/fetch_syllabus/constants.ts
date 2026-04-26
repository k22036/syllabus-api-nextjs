export const CACHE_AGE_SECONDS = 60;
export const STALE_WHILE_REVALIDATE_SECONDS = 300;

export const SYLLABUS_HEADERS = {
  contentType: "application/json; charset=UTF-8",
  cacheControl: `public, max-age=${CACHE_AGE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
} as const;
