import { auth } from "@/auth";

export async function getApiUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
}

export function apiError(message: string, status = 400, field?: string) {
  return Response.json(
    { error: message, ...(field ? { field } : {}) },
    { status },
  );
}

/** Door and scan data is live; never let a CDN or browser reuse it. */
export function jsonNoStore(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, max-age=0");

  return Response.json(data, { ...init, headers });
}

export function unauthorized() {
  return apiError("Sign in to continue.", 401);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function isUniqueViolation(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; cause?: { code?: unknown } };

  return candidate.code === "23505" || candidate.cause?.code === "23505";
}
