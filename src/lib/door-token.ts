import { SignJWT, errors, jwtVerify } from "jose";

export type DoorDirection = "in" | "out";

export const DOOR_TOKEN_TTL_SECONDS = 60;

export {
  DOOR_CONFIG_MESSAGE,
  DOOR_EXPIRED_MESSAGE,
  DOOR_INVALID_MESSAGE,
} from "@/lib/door-messages";

export class DoorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DoorConfigError";
  }
}

export type CreatedDoorToken = {
  token: string;
  scanUrl: string;
  issuedAt: Date;
  expiresAt: Date;
};

function getTokenSecret() {
  const secret = process.env.TOKEN_SECRET?.trim();

  if (!secret) {
    throw new DoorConfigError("TOKEN_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  if (!appUrl) {
    throw new DoorConfigError("NEXT_PUBLIC_APP_URL is not configured.");
  }

  return appUrl;
}

export function isDoorDirection(value: unknown): value is DoorDirection {
  return value === "in" || value === "out";
}

export async function createDoorToken(
  direction: DoorDirection,
): Promise<CreatedDoorToken> {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = issuedAtSeconds + DOOR_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({ dir: direction })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    // A unique id makes every issued code different even when two are created
    // within the same second (the manual "New code" button).
    .setJti(crypto.randomUUID())
    .sign(getTokenSecret());

  return {
    token,
    scanUrl: `${getAppUrl()}/scan?t=${encodeURIComponent(token)}`,
    issuedAt: new Date(issuedAtSeconds * 1000),
    expiresAt: new Date(expiresAtSeconds * 1000),
  };
}

export type VerifiedDoorToken =
  | {
      ok: true;
      direction: DoorDirection;
      issuedAt: number;
      expiresAt: number;
    }
  | {
      ok: false;
      reason: "expired" | "invalid" | "config";
    };

export async function verifyDoorToken(
  token: string,
): Promise<VerifiedDoorToken> {
  let secret: Uint8Array;

  try {
    secret = getTokenSecret();
  } catch {
    return { ok: false, reason: "config" };
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      !isDoorDirection(payload.dir) ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp <= payload.iat
    ) {
      return { ok: false, reason: "invalid" };
    }

    return {
      ok: true,
      direction: payload.dir,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      return { ok: false, reason: "expired" };
    }

    return { ok: false, reason: "invalid" };
  }
}
