import { getApiUser, jsonNoStore } from "@/lib/api";
import {
  createDoorToken,
  DoorConfigError,
  DOOR_TOKEN_TTL_SECONDS,
  isDoorDirection,
} from "@/lib/door-token";
import { canOpenDoor } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return jsonNoStore({ error: "Sign in to continue." }, { status: 401 });
  }

  if (!canOpenDoor(user.role)) {
    return jsonNoStore(
      { error: "Only gatekeepers can open the door screen." },
      { status: 403 },
    );
  }

  const dir = new URL(request.url).searchParams.get("dir");

  if (!isDoorDirection(dir)) {
    return jsonNoStore(
      { error: "Choose either the entry or exit door." },
      { status: 400 },
    );
  }

  try {
    const created = await createDoorToken(dir);

    return jsonNoStore({
      token: created.token,
      scanUrl: created.scanUrl,
      issuedAt: created.issuedAt.toISOString(),
      expiresAt: created.expiresAt.toISOString(),
      ttlSeconds: DOOR_TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    if (error instanceof DoorConfigError) {
      return jsonNoStore(
        {
          error:
            "Door codes aren't configured. Ask the librarian to set TOKEN_SECRET and NEXT_PUBLIC_APP_URL.",
        },
        { status: 503 },
      );
    }

    console.error("Door token creation failed", error);
    return jsonNoStore(
      { error: "The door code couldn't be issued. Try again." },
      { status: 500 },
    );
  }
}
