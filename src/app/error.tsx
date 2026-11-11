"use client";

import { ArrowClockwise, ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    document.title = "Ledger interrupted · Vulcan";
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 items-center px-5 py-16 sm:px-8 sm:py-24">
      <section className="w-full max-w-[46rem] border-y border-rule py-10 sm:py-14">
        <WarningCircle
          aria-hidden="true"
          size={52}
          weight="duotone"
          className="text-vermilion"
        />
        <span className="stamp mt-6 rotate-[-1.5deg] text-vermilion">
          Ledger interrupted
        </span>
        <h1 className="mt-5 font-display text-[clamp(2.6rem,5vw,4rem)] leading-[0.95] tracking-[-0.03em] text-ink">
          Something smudged the page.
        </h1>
        <p className="mt-6 max-w-[58ch] text-[1.0625rem] leading-7 text-ink-muted">
          The record you asked for did not load. Nothing has been written to the
          ledger. Try the page again, or go back to the front desk.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={reset} className="button-primary">
            <ArrowClockwise aria-hidden="true" size={18} weight="regular" />
            Try again
          </button>
          <Link href="/" className="button-secondary">
            <ArrowLeft aria-hidden="true" size={18} weight="regular" />
            Back to the front page
          </Link>
        </div>

        <p className="mt-7 border-t border-rule pt-4 font-mono text-[10px] uppercase leading-5 tracking-[0.1em] text-ink-muted">
          If the ink stays blurred, tell the librarian
          {error.digest ? ` · reference ${error.digest}` : ""}.
        </p>
      </section>
    </div>
  );
}
