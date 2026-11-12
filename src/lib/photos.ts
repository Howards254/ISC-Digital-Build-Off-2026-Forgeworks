export type DetectedImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

/**
 * Identify the image from its bytes rather than trusting the browser's MIME
 * header. The server route only accepts these three formats.
 */
export function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

/**
 * Resolve the hostname of the configured public Blob store. Vercel builds
 * public URLs as `https://<store id>.public.blob.vercel-storage.com/...`.
 * Without a configured store, no external photo URL is trusted.
 */
function getPublicBlobHostname(): string | null {
  const configuredStoreId =
    process.env.BLOB_STORE_ID?.trim() ||
    parseStoreId(process.env.BLOB_READ_WRITE_TOKEN);
  const storeId = configuredStoreId?.startsWith("store_")
    ? configuredStoreId.slice("store_".length)
    : configuredStoreId;

  if (!storeId) {
    return null;
  }

  return `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
}

/** `vercel_blob_rw_<store id>_<secret>` is the documented R/W token shape. */
function parseStoreId(token: string | undefined): string | null {
  if (!token) {
    return null;
  }

  const [, , , storeId = ""] = token.trim().split("_");

  return storeId || null;
}

/**
 * Uploads are written under `devices/<user id>/` in our own Blob store.
 * Requiring both the expected hostname and the user's path prefix stops a
 * member from attaching an arbitrary external image to their laptop. When no
 * Blob store is configured, the same rule is applied to the relative
 * `/api/photos/<user id>/<photo id>` fallback URLs.
 */
export function isOwnPhotoUrl(value: string, userId: string): boolean {
  const localPrefix = `/api/photos/${userId}/`;

  if (value.startsWith(localPrefix)) {
    return UUID_PATTERN.test(value.slice(localPrefix.length));
  }

  try {
    const url = new URL(value);
    const expectedHost = getPublicBlobHostname();

    if (!expectedHost) {
      return false;
    }

    return (
      url.protocol === "https:" &&
      url.hostname === expectedHost &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.pathname.startsWith(`/devices/${userId}/`) &&
      /\.(jpe?g|png|webp)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
