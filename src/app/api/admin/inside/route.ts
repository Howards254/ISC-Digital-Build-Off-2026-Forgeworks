import { getAdminSession } from "@/lib/authz";
import { getInsideVisits } from "@/lib/admin-data";
import { jsonNoStore } from "@/lib/api";
import { formatClockWithSeconds } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();

  if (!admin) {
    return jsonNoStore({ error: "Librarian access required." }, { status: 403 });
  }

  try {
    const visits = await getInsideVisits();

    return jsonNoStore({
      visits,
      checkedAt: formatClockWithSeconds(new Date()),
      count: visits.length,
    });
  } catch (error) {
    console.error("Inside feed failed", error);

    return jsonNoStore(
      { error: "The live ledger couldn't be refreshed." },
      { status: 500 },
    );
  }
}
