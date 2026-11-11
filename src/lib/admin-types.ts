import type { VisitFlag } from "@/lib/visit-flags";

export type AdminInsideVisit = {
  id: string;
  entryAtIso: string;
  entryTime: string;
  name: string;
  admissionNumber: string | null;
  deviceModel: string | null;
  deviceSerial: string | null;
  looseSerial: string | null;
  flags: VisitFlag[];
};

export type AdminHistoryRow = {
  id: string;
  entryAt: Date;
  exitAt: Date | null;
  name: string;
  admissionNumber: string | null;
  deviceModel: string | null;
  deviceSerial: string | null;
  looseSerial: string | null;
  flags: VisitFlag[];
  entryMethod: "qr" | "manual";
  exitMethod: "qr" | "manual" | "auto" | null;
};

export type AdminLaptopInfo = {
  id: string;
  serial: string;
  model: string;
  photoUrl: string;
  serialPhotoUrl: string | null;
  kind: "personal" | "library";
  active: boolean;
  ownerName: string;
  ownerEmail: string;
  ownerAdmissionNumber: string | null;
};

export type AdminLaptopVisit = {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorAdmissionNumber: string | null;
  entryAt: Date;
  exitAt: Date | null;
  flags: VisitFlag[];
  entryMethod: "qr" | "manual";
  exitMethod: "qr" | "manual" | "auto" | null;
  looseSerial: string | null;
};

export type AdminLaptopTrail = {
  serial: string;
  laptop: AdminLaptopInfo | null;
  visits: AdminLaptopVisit[];
};

export type AdminRoleGrant = {
  id: string;
  email: string;
  role: "gatekeeper" | "admin";
  endsAt: Date | null;
  createdBy: string;
};

export type AdminAuditEntry = {
  id: string;
  createdAt: Date;
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown>;
  actorName: string | null;
  actorEmail: string | null;
  targetName: string | null;
  targetAdmissionNumber: string | null;
  deviceModel: string | null;
  deviceSerial: string | null;
  looseSerial: string | null;
};
