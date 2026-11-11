import Link from "next/link";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Page not found",
  description:
    "No page matches this address in the Vulcan library ledger.",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 items-center px-5 py-16 sm:px-8 sm:py-24">
      <section className="w-full max-w-[43rem] border-y border-rule py-12 sm:py-16">
        <BookOpen
          aria-hidden="true"
          size={52}
          weight="duotone"
          className="text-brass"
        />
        <span className="stamp mt-6 rotate-[-1.5deg] text-vermilion">
          Not in the ledger
        </span>
        <h1 className="mt-5 font-display text-[clamp(2.6rem,5vw,4rem)] leading-[0.95] tracking-[-0.03em] text-ink">
          This page hasn&apos;t been signed in.
        </h1>
        <p className="mt-6 max-w-[52ch] text-[1.0625rem] leading-7 text-ink-muted">
          No entry matches this address. It may have moved, or it may never have
          existed.
        </p>
        <Link href="/" className="button-secondary mt-8">
          Back to the front page
        </Link>
      </section>
    </div>
  );
}
