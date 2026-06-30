export function buildAbsoluteUrlFromRequest(request: Request, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";

  if (host) {
    return new URL(path, `${protocol}://${host}`);
  }

  return new URL(path, request.url);
}
