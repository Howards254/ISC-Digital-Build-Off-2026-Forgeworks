import { getApiUser, jsonNoStore } from "@/lib/api";
import { canOpenDoor } from "@/lib/roles";
import { getRecentScans } from "@/lib/scan-data";
import { formatClock } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return jsonNoStore({ error: "Sign in to continue." }, { status: 401 });
  }

  if (!canOpenDoor(user.role)) {
    return jsonNoStore(
      { error: "Only gatekeepers can read the door feed." },
      { status: 403 },
    );
  }

  try {
    const scans = await getRecentScans(8);

    return jsonNoStore({
      scans: scans.map((scan) => ({
        id: scan.id,
        direction: scan.direction,
        at: scan.at.toISOString(),
        time: formatClock(scan.at),
        name: scan.name,
        admissionNumber: scan.admissionNumber,
        deviceModel: scan.deviceModel,
        looseSerial: scan.looseSerial,
      })),
    });
  } catch (error) {
    console.error("Recent scan lookup failed", error);
    return jsonNoStore(
      { error: "The recent scans couldn't be loaded." },
      { status: 500 },
    );
  }
}
