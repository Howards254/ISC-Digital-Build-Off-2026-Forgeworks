import { VISIT_FLAGS, VISIT_FLAG_INFO, type VisitFlag } from "@/lib/visit-flags";

const toneClass = {
  brass: "text-brass",
  vermilion: "text-vermilion",
  muted: "text-ink-muted",
} as const;

type FlagTagsProps = {
  flags: VisitFlag[];
  emptyLabel?: string | null;
};

/** Small stamp-style tags shared by every ledger view. */
export function FlagTags({ flags, emptyLabel = "No flags" }: FlagTagsProps) {
  const ordered = VISIT_FLAGS.filter((flag) => flags.includes(flag));

  if (ordered.length === 0) {
    return emptyLabel ? (
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
        {emptyLabel}
      </span>
    ) : null;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {ordered.map((flag) => (
        <span
          key={flag}
          className={`stamp ${toneClass[VISIT_FLAG_INFO[flag].tone]}`}
          title={VISIT_FLAG_INFO[flag].description}
        >
          {VISIT_FLAG_INFO[flag].label}
        </span>
      ))}
    </span>
  );
}

export function FlagLegend() {
  return (
    <ul className="space-y-3">
      {VISIT_FLAGS.map((flag) => (
        <li key={flag}>
          <span className={`stamp ${toneClass[VISIT_FLAG_INFO[flag].tone]}`}>
            {VISIT_FLAG_INFO[flag].label}
          </span>
          <p className="mt-1 text-[11px] leading-4 text-ink-muted">
            {VISIT_FLAG_INFO[flag].description}
          </p>
        </li>
      ))}
    </ul>
  );
}
