import { put } from "@vercel/blob";

import { getDb } from "@/db";
import { photos } from "@/db/schema";
import { apiError, getApiUser, unauthorized } from "@/lib/api";
import { MAX_PHOTO_BYTES } from "@/lib/member-rules";
import { detectImage } from "@/lib/photos";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_PHOTO_BYTES + 1024 * 1024) {
    return apiError("Choose a photo under 5 MB.", 413);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return apiError("The photo didn't upload. Try again.", 400);
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return apiError("Choose a photo to upload.", 400);
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return apiError("Choose a photo under 5 MB.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectImage(bytes);

  if (!image) {
    return apiError("Choose a JPEG, PNG, or WebP image.", 415);
  }

  const pathname = `devices/${user.id}/${crypto.randomUUID()}.${image.extension}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(pathname, Buffer.from(bytes), {
          access: "public",
          contentType: image.contentType,
          addRandomSuffix: false,
        });

        return Response.json({
          url: blob.url,
          pathname: blob.pathname,
        });
      } catch (error) {
        // A stale or under-scoped token should not stop a member from
        // registering a laptop. Keep the record in Postgres instead.
        console.error(
          "Vercel Blob upload failed; falling back to database storage",
          error,
        );
      }
    }

    // No usable Blob store: keep the photo in Postgres and serve it through
    // the public /api/photos route. This keeps laptop registration working on
    // deployments that have a database but no object store.
    const [photo] = await getDb()
      .insert(photos)
      .values({
        ownerId: user.id,
        contentType: image.contentType,
        bytes: Buffer.from(bytes),
      })
      .returning({ id: photos.id });

    return Response.json({
      url: `/api/photos/${user.id}/${photo.id}`,
      pathname,
    });
  } catch (error) {
    console.error("Photo storage failed", error);

    return apiError("The photo couldn't be stored. Try again.", 502);
  }
}
