import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DoorScreen } from "@/components/door/door-screen";
import { requireRole } from "@/lib/authz";
import {
  createDoorToken,
  isDoorDirection,
} from "@/lib/door-token";
import { getSchoolTimeZone } from "@/lib/time";

export const metadata: Metadata = {
  title: "Door",
  description:
    "The gatekeeper door screen, with a rotating QR code for library entries and exits.",
};

export default async function DoorPage({
  params,
}: {
  params: Promise<{ dir: string }>;
}) {
  const { dir } = await params;

  if (!isDoorDirection(dir)) {
    notFound();
  }

  await requireRole("gatekeeper", "admin");

  let initialToken: {
    token: string;
    scanUrl: string;
    expiresAt: string;
  } | null = null;

  try {
    const created = await createDoorToken(dir);
    initialToken = {
      token: created.token,
      scanUrl: created.scanUrl,
      expiresAt: created.expiresAt.toISOString(),
    };
  } catch {
    // The screen shows the configuration error when its first refresh runs.
  }

  return (
    <DoorScreen
      direction={dir}
      initialToken={initialToken}
      demoMode={process.env.NEXT_PUBLIC_DEMO_MODE === "true"}
      timeZone={getSchoolTimeZone()}
      serverNow={new Date().toISOString()}
    />
  );
}
