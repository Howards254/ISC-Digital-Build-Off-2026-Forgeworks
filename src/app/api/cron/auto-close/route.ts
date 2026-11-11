import { timingSafeEqual } from "node:crypto";

import { closeOpenVisits } from "@/lib/auto-close";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return { ok: false, status: 503 } as const;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(header);

  if (provided.length !== expected.length) {
    return { ok: false, status: 401 } as const;
  }

  return {
    ok: timingSafeEqual(provided, expected),
    status: 401,
  } as const;
}

async function runAutoClose(request: Request) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return Response.json(
      {
        error:
          auth.status === 503
            ? "Auto-close is not configured. Set CRON_SECRET."
            : "Unauthorized.",
      },
      {
        status: auth.status,
        headers: {
          "Cache-Control": "no-store",
          ...(auth.status === 401
            ? { "WWW-Authenticate": "Bearer" }
            : {}),
        },
      },
    );
  }

  try {
    const result = await closeOpenVisits();

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Auto-close failed", error);

    return Response.json(
      { error: "The auto-close job could not finish." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * Vercel Cron sends GET requests and adds the CRON_SECRET bearer header.
 * POST stays available for manual runs and schedulers that use it.
 */
export async function GET(request: Request) {
  return runAutoClose(request);
}

export async function POST(request: Request) {
  return runAutoClose(request);
}
