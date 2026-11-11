import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  devices,
  users,
  visits,
  type VisitFlag,
} from "@/db/schema";
import { normalizeAdmissionNumber } from "@/lib/member-rules";

loadEnvConfig(process.cwd());

type DemoMember = {
  name: string;
  admissionNumber: string;
  model: string;
  serial: string;
  accent: "forest" | "vermilion" | "brass";
};

const MEMBERS: DemoMember[] = [
  {
    name: "Amina Wanjiku",
    admissionNumber: "25-0101",
    model: "MacBook Air 13-inch",
    serial: "DEMO-LT-0001",
    accent: "forest",
  },
  {
    name: "Baraka Otieno",
    admissionNumber: "25-0102",
    model: "Dell XPS 13",
    serial: "DEMO-LT-0002",
    accent: "vermilion",
  },
  {
    name: "Chloe Mbeki",
    admissionNumber: "25-0103",
    model: "Lenovo ThinkPad T14",
    serial: "DEMO-LT-0003",
    accent: "brass",
  },
  {
    name: "Daniel Kimani",
    admissionNumber: "25-0104",
    model: "HP EliteBook 840",
    serial: "DEMO-LT-0004",
    accent: "forest",
  },
  {
    name: "Esther Njeri",
    admissionNumber: "25-0105",
    model: "Asus Zenbook 14",
    serial: "DEMO-LT-0005",
    accent: "vermilion",
  },
  {
    name: "Farhan Ali",
    admissionNumber: "25-0106",
    model: "Acer Swift 3",
    serial: "DEMO-LT-0006",
    accent: "brass",
  },
  {
    name: "Grace Achieng",
    admissionNumber: "25-0107",
    model: "Microsoft Surface Laptop 5",
    serial: "DEMO-LT-0007",
    accent: "forest",
  },
  {
    name: "Hassan Omar",
    admissionNumber: "25-0108",
    model: "Samsung Galaxy Book3",
    serial: "DEMO-LT-0008",
    accent: "vermilion",
  },
  {
    name: "Irene Wambui",
    admissionNumber: "25-0109",
    model: "Framework Laptop 13",
    serial: "DEMO-LT-0009",
    accent: "brass",
  },
  {
    name: "Jabari Mutua",
    admissionNumber: "25-0110",
    model: "Chromebook Plus Spin 714",
    serial: "DEMO-LT-0010",
    accent: "forest",
  },
  {
    name: "Kesia Chebet",
    admissionNumber: "25-0111",
    model: "MacBook Pro 14-inch",
    serial: "DEMO-LT-0011",
    accent: "vermilion",
  },
  {
    name: "Liam Omondi",
    admissionNumber: "25-0112",
    model: "ThinkPad X1 Carbon",
    serial: "DEMO-LT-0012",
    accent: "brass",
  },
];

const ACCENT_HEX = {
  forest: "#1f4d3c",
  vermilion: "#b53824",
  brass: "#855b12",
} as const;

function schoolDomain() {
  return (
    process.env.SCHOOL_DOMAIN?.trim().toLowerCase().replace(/^@/, "") ||
    "school.edu"
  );
}

function demoEmail(index: number) {
  return `demo.student${index + 1}@${schoolDomain()}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function placeholderSvg(member: DemoMember, index: number) {
  const accent = ACCENT_HEX[member.accent];
  const number = String(index + 1).padStart(2, "0");
  const rules = Array.from({ length: 10 }, (_, row) => {
    const y = 84 + row * 48;
    return `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="#d8cfbb" stroke-width="1" opacity="0.72"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="Generated demo laptop image for ${escapeXml(member.model)}">
  <rect width="800" height="600" fill="#f4efe4"/>
  ${rules}
  <line x1="92" y1="0" x2="92" y2="600" stroke="#bf3f2b" stroke-width="1" opacity="0.28"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#5c5f58">
    <text x="118" y="56" font-size="13" letter-spacing="3">VULCAN / DEMO REGISTER</text>
    <text x="682" y="56" font-size="13" letter-spacing="3">NO. ${number}</text>
  </g>
  <g>
    <rect x="170" y="126" width="460" height="308" rx="14" fill="#fbf8f1" stroke="${accent}" stroke-width="3"/>
    <rect x="186" y="142" width="428" height="276" rx="4" fill="#ece5d8" stroke="#d8cfbb"/>
    <text x="210" y="190" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" letter-spacing="3" fill="#5c5f58">PHOTO PLACEHOLDER</text>
    <line x1="210" y1="207" x2="590" y2="207" stroke="#d8cfbb"/>
    <text x="210" y="260" font-family="Georgia, 'Times New Roman', serif" font-size="30" fill="#1c211f">${escapeXml(member.model)}</text>
    <line x1="210" y1="291" x2="590" y2="291" stroke="#d8cfbb"/>
    <text x="210" y="330" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="16" letter-spacing="2" fill="${accent}">${escapeXml(member.serial)}</text>
    <text x="210" y="372" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="2" fill="#5c5f58">GENERATED FOR THE DEMO LEDGER</text>
    <path d="M126 456h548l34 30H92z" fill="#ece5d8" stroke="${accent}" stroke-width="3"/>
    <path d="M362 456h76l-8 12h-60z" fill="${accent}" opacity="0.32"/>
  </g>
  <g transform="rotate(-8 646 470)">
    <rect x="566" y="424" width="160" height="92" rx="3" fill="none" stroke="#b53824" stroke-width="3"/>
    <rect x="572" y="430" width="148" height="80" rx="1" fill="none" stroke="#b53824" stroke-width="1"/>
    <text x="646" y="487" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700" letter-spacing="4" fill="#b53824">DEMO</text>
  </g>
  <circle cx="70" cy="530" r="9" fill="${accent}"/>
  <text x="118" y="535" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" letter-spacing="2" fill="#5c5f58">DEMO.STUDENT${number} · ${escapeXml(member.admissionNumber)}</text>
</svg>
`;
}

async function writePlaceholders() {
  const directory = path.join(
    process.cwd(),
    "public",
    "demo",
    "laptops",
  );

  await mkdir(directory, { recursive: true });

  await Promise.all(
    MEMBERS.map((member, index) =>
      writeFile(
        path.join(
          directory,
          `demo-${String(index + 1).padStart(2, "0")}.svg`,
        ),
        placeholderSvg(member, index),
      ),
    ),
  );
}

type PastVisitSpec = {
  member: number;
  device: number | null;
  borrowedDevice: number | null;
  minutesAgo: number;
  duration: number;
  entryMethod: "qr" | "manual";
  exitMethod: "qr" | "manual";
  flags: VisitFlag[];
  looseSerial: string | null;
};

function pastVisitSpecs(): PastVisitSpec[] {
  const specs: PastVisitSpec[] = [];

  for (let day = 0; day < 3; day += 1) {
    for (let slot = 0; slot < 10; slot += 1) {
      const member = (day * 10 + slot) % MEMBERS.length;
      const minutesAgo = 320 + day * 1440 + slot * 67;
      const isNoDevice =
        (day === 0 && slot === 5) || (day === 1 && slot === 8);
      const isBorrowed = day === 0 && slot === 7;
      const isNoMatchingEntry = day === 1 && slot === 4;
      const isManual = day === 2 && slot === 2;
      const noTapOut =
        (day === 0 && slot === 3) ||
        (day === 1 && slot === 6) ||
        (day === 2 && slot === 9);

      const flags: VisitFlag[] = [];

      if (noTapOut) {
        flags.push("no_tap_out");
      }

      if (isBorrowed) {
        flags.push("borrowed");
      }

      if (isNoMatchingEntry) {
        flags.push("no_matching_entry");
      }

      if (isManual || isNoMatchingEntry) {
        flags.push("manual");
      }

      if (isNoDevice) {
        flags.push("no_device");
      }

      specs.push({
        member,
        device: isNoDevice || isNoMatchingEntry ? null : member,
        borrowedDevice: isBorrowed
          ? (member + 5) % MEMBERS.length
          : null,
        minutesAgo,
        duration:
          isNoMatchingEntry ? 0 : 22 + ((day * 7 + slot * 11) % 77),
        entryMethod: isManual || isNoMatchingEntry ? "manual" : "qr",
        exitMethod: isManual || isNoMatchingEntry ? "manual" : "qr",
        flags,
        looseSerial: null,
      });
    }
  }

  return specs;
}

async function main() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE?.trim().toLowerCase() !== "true") {
    console.error(
      "Refusing to seed: set NEXT_PUBLIC_DEMO_MODE=true in .env.local first.",
    );
    process.exit(1);
  }

  const db = getDb();
  const domain = schoolDomain();
  const emails = MEMBERS.map((_, index) => demoEmail(index));
  const serials = MEMBERS.map((member) => member.serial);

  await writePlaceholders();

  for (const [index, member] of MEMBERS.entries()) {
    const email = emails[index];

    await db
      .insert(users)
      .values({
        email,
        name: member.name,
        admissionNumber: normalizeAdmissionNumber(member.admissionNumber),
        role: "member",
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: member.name,
          admissionNumber: normalizeAdmissionNumber(member.admissionNumber),
          role: "member",
        },
      });
  }

  const memberRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, emails));
  const memberIdByEmail = new Map(
    memberRows.map((row) => [row.email, row.id]),
  );

  for (const [index, member] of MEMBERS.entries()) {
    await db
      .insert(devices)
      .values({
        ownerId: memberIdByEmail.get(emails[index])!,
        serial: member.serial,
        model: member.model,
        photoUrl: `/demo/laptops/demo-${String(index + 1).padStart(2, "0")}.svg`,
        serialPhotoUrl: null,
        kind: "personal",
        active: true,
      })
      .onConflictDoUpdate({
        target: devices.serial,
        set: {
          ownerId: memberIdByEmail.get(emails[index])!,
          model: member.model,
          photoUrl: `/demo/laptops/demo-${String(index + 1).padStart(2, "0")}.svg`,
          serialPhotoUrl: null,
          kind: "personal",
          active: true,
        },
      });
  }

  const deviceRows = await db
    .select({ id: devices.id, serial: devices.serial })
    .from(devices)
    .where(inArray(devices.serial, serials));
  const deviceIdBySerial = new Map(
    deviceRows.map((row) => [row.serial, row.id]),
  );
  const memberIds = emails.map((email) => memberIdByEmail.get(email)!);

  await db.delete(visits).where(inArray(visits.userId, memberIds));

  const now = Date.now();
  const openVisits = [
    { member: 0, device: 0, minutesAgo: 38, method: "qr" as const, flags: [] },
    { member: 1, device: 1, minutesAgo: 82, method: "qr" as const, flags: [] },
    {
      member: 2,
      device: null,
      minutesAgo: 124,
      method: "manual" as const,
      flags: ["no_device", "manual"] as VisitFlag[],
    },
    {
      member: 3,
      device: null,
      minutesAgo: 196,
      method: "qr" as const,
      flags: ["borrowed"] as VisitFlag[],
      borrowedDevice: 4,
    },
  ];

  await db.insert(visits).values([
    ...openVisits.map((visit) => ({
      userId: memberIds[visit.member],
      deviceId:
        "borrowedDevice" in visit && visit.borrowedDevice !== undefined
          ? deviceIdBySerial.get(MEMBERS[visit.borrowedDevice].serial)!
          : visit.device === null
            ? null
            : deviceIdBySerial.get(MEMBERS[visit.device].serial)!,
      looseSerial: null,
      entryAt: new Date(now - visit.minutesAgo * 60_000),
      exitAt: null,
      entryMethod: visit.method,
      exitMethod: null,
      flags: visit.flags,
      closedBy: null,
    })),
    ...pastVisitSpecs().map((visit) => {
      const entryAt = new Date(now - visit.minutesAgo * 60_000);
      const deviceIndex = visit.borrowedDevice ?? visit.device;

      return {
        userId: memberIds[visit.member],
        deviceId:
          deviceIndex === null
            ? null
            : deviceIdBySerial.get(MEMBERS[deviceIndex].serial)!,
        looseSerial: visit.looseSerial,
        entryAt,
        exitAt: new Date(entryAt.getTime() + visit.duration * 60_000),
        entryMethod: visit.entryMethod,
        exitMethod: visit.exitMethod,
        flags: visit.flags,
        closedBy: null,
      };
    }),
  ]);

  console.log("");
  console.log("Demo ledger seeded.");
  console.log(`  ${MEMBERS.length} members`);
  console.log(`  ${MEMBERS.length} laptops with generated placeholder images`);
  console.log(`  ${openVisits.length} open visits`);
  console.log(`  ${pastVisitSpecs().length} past visits across the last three days`);
  console.log("");
  console.log(`Demo addresses end in @${domain}, for example ${emails[0]}.`);
  console.log("Generated images: public/demo/laptops/");
}

main().catch((error) => {
  console.error("Demo seed failed.");
  console.error(error);
  process.exit(1);
});
