import { getAdminSession } from "@/lib/authz";
import { getHistoryForExport, parseHistoryFilters } from "@/lib/admin-data";
import {
  formatCsvDateTime,
  formatDuration,
} from "@/lib/time";
import { VISIT_FLAG_INFO } from "@/lib/visit-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = [
  "Time in",
  "Time out",
  "Duration",
  "Name",
  "Admission number",
  "Laptop model",
  "Laptop serial",
  "Loose serial",
  "Flags",
  "Entry method",
  "Exit method",
];

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const admin = await getAdminSession();

  if (!admin) {
    return new Response("Librarian access required.\n", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(request.url);
  const params: Record<string, string | undefined> = {};

  for (const key of ["from", "to", "q", "flag"]) {
    const value = url.searchParams.get(key);

    if (value !== null) {
      params[key] = value;
    }
  }

  const filters = parseHistoryFilters(params);
  const rows = await getHistoryForExport(filters);
  const lines = [
    HEADERS.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        formatCsvDateTime(row.entryAt),
        row.exitAt ? formatCsvDateTime(row.exitAt) : "",
        formatDuration(row.entryAt, row.exitAt),
        row.name,
        row.admissionNumber ?? "",
        row.deviceModel ?? "",
        row.deviceSerial ?? "",
        row.looseSerial ?? "",
        row.flags.map((flag) => VISIT_FLAG_INFO[flag].label).join("; "),
        row.entryMethod,
        row.exitMethod ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  const filename = `vulcan-history-${filters.from}-to-${filters.to}.csv`;

  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
