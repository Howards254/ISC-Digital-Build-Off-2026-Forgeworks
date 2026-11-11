import type { Metadata } from "next";

import { InsideLedger } from "@/components/admin/inside-ledger";
import { getInsideVisits } from "@/lib/admin-data";
import { formatClockWithSeconds, formatDayLabel } from "@/lib/time";

export const metadata: Metadata = {
  title: "Inside · Librarian desk",
};

export default async function AdminInsidePage() {
  const [visits, now] = await Promise.all([getInsideVisits(), new Date()]);

  return (
    <InsideLedger
      initialVisits={visits}
      dayLabel={formatDayLabel(now)}
      initialCheckedAt={formatClockWithSeconds(now)}
    />
  );
}
