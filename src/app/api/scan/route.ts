import { getApiUser, jsonNoStore } from "@/lib/api";
import {
  DOOR_EXPIRED_MESSAGE,
  DOOR_INVALID_MESSAGE,
  verifyDoorToken,
} from "@/lib/door-token";
import { consumeScanLimit } from "@/lib/rate-limit";
import {
  parseChoiceString,
  recordScan,
  ScanError,
} from "@/lib/scan-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOKEN_LENGTH = 4096;

export async function POST(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return jsonNoStore({ error: "Sign in to continue." }, { status: 401 });
  }

  const limit = consumeScanLimit(`scan:${user.id}`);

  if (!limit.ok) {
    const response = jsonNoStore(
      { error: "Too many scans. Wait a moment and try again." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(limit.retryAfter));

    return response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonNoStore(
      { error: "The scan didn't arrive. Try again." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return jsonNoStore(
      { error: "The scan didn't arrive. Try again." },
      { status: 400 },
    );
  }

  const payload = body as {
    token?: unknown;
    choice?: unknown;
    borrowedSerial?: unknown;
  };

  if (
    typeof payload.token !== "string" ||
    payload.token.length === 0 ||
    payload.token.length > MAX_TOKEN_LENGTH
  ) {
    return jsonNoStore(
      { error: DOOR_INVALID_MESSAGE, code: "invalid_token" },
      { status: 400 },
    );
  }

  const verified = await verifyDoorToken(payload.token);

  if (!verified.ok) {
    if (verified.reason === "expired") {
      return jsonNoStore(
        { error: DOOR_EXPIRED_MESSAGE, code: "expired_token" },
        { status: 410 },
      );
    }

    if (verified.reason === "config") {
      return jsonNoStore(
        {
          error:
            "Door codes aren't configured. Ask the librarian to check the door settings.",
          code: "door_not_configured",
        },
        { status: 503 },
      );
    }

    return jsonNoStore(
      { error: DOOR_INVALID_MESSAGE, code: "invalid_token" },
      { status: 400 },
    );
  }

  const choice =
    verified.direction === "in"
      ? parseChoiceString(payload.choice, payload.borrowedSerial)
      : null;

  if (verified.direction === "in" && !choice) {
    return jsonNoStore(
      {
        error: "Choose one of your laptops, a borrowed laptop, or no device.",
        code: "device_choice_required",
      },
      { status: 422 },
    );
  }

  try {
    const result = await recordScan({
      actorId: user.id,
      targetUserId: user.id,
      direction: verified.direction,
      method: "qr",
      choice,
    });

    return jsonNoStore(result, { status: 201 });
  } catch (error) {
    if (error instanceof ScanError) {
      return jsonNoStore(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("Scan failed", error);
    return jsonNoStore(
      {
        error: "The scan couldn't be saved. Try again.",
        code: "scan_failed",
      },
      { status: 500 },
    );
  }
}
