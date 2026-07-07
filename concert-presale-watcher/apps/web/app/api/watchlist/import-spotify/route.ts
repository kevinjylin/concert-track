export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL("/api/integrations/spotify/import", request.url);
  return fetch(url, {
    method: "POST",
    headers: request.headers,
    body: await request.text(),
    cache: "no-store",
  });
}
