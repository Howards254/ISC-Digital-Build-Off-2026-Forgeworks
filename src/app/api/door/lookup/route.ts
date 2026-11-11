import { getApiUser, jsonNoStore } from "@/lib/api";
import { canOpenDoor } from "@/lib/roles";
import { lookupPeople } from "@/lib/scan-data";
import { formatClock } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 80;

export async function GET(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return jsonNoStore({ error: "Sign in to continue." }, { status: 401 });
  }

  if (!canOpenDoor(user.role)) {
    return jsonNoStore(
      { error: "Only gatekeepers can search members." },
      { status: 403 },
    );
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return jsonNoStore({ people: [] });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return jsonNoStore(
      { error: `Keep the search under ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  try {
    const people = await lookupPeople(query);

    return jsonNoStore({
      people: people.map((person) => ({
        id: person.id,
        name: person.name,
        admissionNumber: person.admissionNumber,
        openVisit: person.openVisit
          ? {
              id: person.openVisit.id,
              entryAt: person.openVisit.entryAt.toISOString(),
              entryTime: formatClock(person.openVisit.entryAt),
              deviceId: person.openVisit.deviceId,
              looseSerial: person.openVisit.looseSerial,
              deviceModel: person.openVisit.deviceModel,
              deviceSerial: person.openVisit.deviceSerial,
              devicePhotoUrl: person.openVisit.devicePhotoUrl,
            }
          : null,
        laptops: person.laptops,
      })),
    });
  } catch (error) {
    console.error("Door lookup failed", error);
    return jsonNoStore(
      { error: "The member search couldn't be completed." },
      { status: 500 },
    );
  }
}
