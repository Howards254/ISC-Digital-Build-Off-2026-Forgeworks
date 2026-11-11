/**
 * Accept only same-origin relative paths for post-auth redirects. This keeps
 * `redirectTo` values from turning into open redirects.
 */
export function safeInternalPath(
  value: unknown,
  fallback: string | null = "/me",
): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://vulcan.invalid");

    if (url.origin !== "https://vulcan.invalid") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
