type LedgerSkeletonProps = {
  label?: string;
  rows?: number;
  filters?: boolean;
  hero?: boolean;
};

/**
 * Loading states are drawn as ruled ledger lines rather than cards. The
 * animated wash is disabled by the global reduced-motion rule.
 */
export function LedgerSkeleton({
  label = "Reading the ledger",
  rows = 6,
  filters = false,
  hero = false,
}: LedgerSkeletonProps) {
  const widths = ["w-2/3", "w-1/2", "w-3/5", "w-5/12"];

  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">{label}</p>

      <div className="flex items-center justify-between gap-4 border-b border-rule pb-4">
        <span className="h-2.5 w-28 animate-pulse bg-wash" />
        <span className="h-2.5 w-20 animate-pulse bg-wash" />
      </div>

      {hero ? (
        <div className="mt-7 h-[clamp(4.5rem,12vw,9rem)] w-[15rem] max-w-full animate-pulse bg-wash/70" />
      ) : (
        <div className="mt-7 h-12 w-[min(22rem,72%)] animate-pulse bg-wash/70 sm:h-16" />
      )}
      <div className="mt-4 h-3 w-[min(30rem,88%)] animate-pulse bg-wash/60" />

      {filters ? (
        <div className="mt-8 grid gap-3 border-y border-rule py-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className="h-11 animate-pulse border border-rule bg-wash/55"
            />
          ))}
        </div>
      ) : null}

      <div className="mt-8 border-y border-rule">
        <div className="flex items-center justify-between gap-4 border-b border-rule py-3">
          <span className="h-2 w-20 animate-pulse bg-wash" />
          <span className="h-2 w-12 animate-pulse bg-wash" />
        </div>

        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-4 border-b border-rule py-4 last:border-b-0 sm:grid-cols-[5rem_minmax(0,1.2fr)_minmax(0,1fr)_4rem]"
          >
            <span className="h-2.5 w-10 animate-pulse bg-wash" />
            <span className="min-w-0 space-y-2">
              <span
                className={`block h-3.5 ${widths[index % widths.length]} animate-pulse bg-wash`}
              />
              <span className="block h-2 w-1/3 animate-pulse bg-wash/65" />
            </span>
            <span className="hidden h-2.5 w-20 animate-pulse bg-wash/75 sm:block" />
            <span className="h-6 w-10 animate-pulse border border-rule bg-wash/45" />
          </div>
        ))}
      </div>
    </div>
  );
}
