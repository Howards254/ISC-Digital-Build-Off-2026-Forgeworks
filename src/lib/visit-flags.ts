export const VISIT_FLAGS = [
  "no_tap_out",
  "no_matching_entry",
  "manual",
  "borrowed",
  "no_device",
  "unregistered_device",
] as const;

export type VisitFlag = (typeof VISIT_FLAGS)[number];

type FlagInfo = {
  label: string;
  description: string;
  tone: "brass" | "vermilion" | "muted";
};

export const VISIT_FLAG_INFO: Record<VisitFlag, FlagInfo> = {
  no_tap_out: {
    label: "No tap out",
    description:
      "They left without tapping out, or the library closed with the visit still open.",
    tone: "vermilion",
  },
  no_matching_entry: {
    label: "No entry",
    description: "An exit was recorded without an open entry.",
    tone: "vermilion",
  },
  manual: {
    label: "Manual",
    description: "A gatekeeper recorded this at the desk.",
    tone: "brass",
  },
  borrowed: {
    label: "Borrowed",
    description: "The laptop belongs to another member.",
    tone: "brass",
  },
  no_device: {
    label: "No device",
    description: "They came in without a laptop.",
    tone: "muted",
  },
  unregistered_device: {
    label: "Unregistered",
    description: "The borrowed serial is not on the register.",
    tone: "vermilion",
  },
};

export function isVisitFlag(value: unknown): value is VisitFlag {
  return (
    typeof value === "string" &&
    VISIT_FLAGS.includes(value as VisitFlag)
  );
}
