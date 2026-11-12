import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { photos } from "@/db/schema";
import { isUuid } from "@/lib/api";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ userId: string; photoId: string }>;
};

/**
 * Serve fallback photos stored in Postgres. The owner id is part of the URL so
 * the device API can keep the same "photos belong under your own prefix" rule
 * it uses for Vercel Blob URLs.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { userId, photoId } = await params;

  if (!isUuid(userId) || !isUuid(photoId)) {
    return new Response("Not found", { status: 404 });
  }

  const [photo] = await getDb()
    .select({
      contentType: photos.contentType,
      bytes: photos.bytes,
    })
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.ownerId, userId)))
    .limit(1);

  if (!photo) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
