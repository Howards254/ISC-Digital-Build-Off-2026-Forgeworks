import Link from "next/link";

type ScanShellProps = {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
};

export function ScanShell({ eyebrow, title, children, aside }: ScanShellProps) {
  return (
    <div className="mx-auto w-full max-w-[780px] flex-1 px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
        <p>Vulcan · Door scan</p>
        <Link
          href="/me"
          className="inline-flex min-h-11 items-center underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-150 hover:text-forest hover:decoration-forest"
        >
          Your page
        </Link>
      </div>

      <header className="mt-5 border-b border-rule pb-7 sm:pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-[18ch] break-words font-display text-[clamp(2.6rem,7vw,4rem)] leading-[0.94] tracking-[-0.03em] text-ink">
          {title}
        </h1>
      </header>

      {aside ? (
        <div className="mt-6 border-b border-rule pb-6">{aside}</div>
      ) : null}

      <div className="pt-6">{children}</div>
    </div>
  );
}
