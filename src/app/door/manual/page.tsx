import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ManualLookup } from "@/components/door/manual-lookup";
import { requireRole } from "@/lib/authz";
import { isDoorDirection } from "@/lib/door-token";
import { getSchoolTimeZone } from "@/lib/time";

export const metadata: Metadata = {
  title: "Manual door scan",
  description:
    "Find a member by name or admission number and record a manual library entry or exit.",
};

export default async function ManualPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string | string[] }>;
}) {
  const query = await searchParams;
  const dir = typeof query.dir === "string" ? query.dir : undefined;

  if (!isDoorDirection(dir)) {
    notFound();
  }

  await requireRole("gatekeeper", "admin");

  return <ManualLookup direction={dir} timeZone={getSchoolTimeZone()} />;
}
