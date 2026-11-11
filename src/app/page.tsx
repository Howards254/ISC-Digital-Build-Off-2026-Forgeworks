import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { signInWithSchoolAccount } from "@/app/actions";
import { auth, getSchoolDomain } from "@/auth";
import { SchoolSignInButton } from "@/components/school-sign-in-button";
import { safeInternalPath } from "@/lib/navigation";

const sampleEntries = [
  {
    time: "08:42",
    name: "Amara Okafor",
    detail: "PS-214 · personal",
    state: "In",
    stateClass: "text-forest",
  },
  {
    time: "09:05",
    name: "Jonah Reed",
    detail: "LIB-022 · library",
    state: "In",
    stateClass: "text-forest",
  },
  {
    time: "09:18",
    name: "Priya Shah",
    detail: "Borrowed laptop",
    state: "Out",
    stateClass: "text-vermilion",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; next?: string }>;
}) {
  const [session, query] = await Promise.all([auth(), searchParams]);
  const domain = getSchoolDomain();
  const showAuthNotice = query.auth === "required";
  const returnTo = safeInternalPath(query.next, null);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-5 sm:px-8">
      <section className="grid flex-1 items-center gap-14 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:pb-24 lg:pt-20">
        <div className="max-w-[38rem]">
          {showAuthNotice ? (
            <div
              role="status"
              className="mb-8 flex max-w-lg items-start gap-3 border-y border-rule py-3"
            >
              <span className="stamp mt-0.5 shrink-0 text-vermilion">Check in</span>
              <p className="text-sm leading-6 text-ink-muted">
                Sign in with your school account to open your page.
              </p>
            </div>
          ) : null}

          <p className="font-mono text-[11px] leading-5 tracking-[0.02em] text-ink-muted">
            The school library, from the door.
          </p>

          <h1 className="mt-4 font-display text-[clamp(3.4rem,8vw,5.75rem)] font-normal leading-[0.88] tracking-[-0.035em] text-ink">
            Sign the
            <span className="block text-forest">ledger.</span>
          </h1>

          <p className="mt-7 max-w-[52ch] text-[1.0625rem] leading-7 text-ink-muted sm:text-lg sm:leading-8">
            Vulcan replaces the paper sign-in book. Students sign in with their
            school account, log the laptop they brought, and sign out on the way
            through.
          </p>

          <div id="sign-in" className="mt-8 scroll-mt-28">
            {session?.user ? (
              <div>
                <Link href="/me" className="button-primary">
                  Open your page
                  <ArrowRight aria-hidden="true" size={19} weight="regular" />
                </Link>
                <p className="mt-4 max-w-md truncate font-mono text-[11px] text-ink-muted">
                  Signed in as {session.user.email}
                </p>
              </div>
            ) : (
              <>
                <form action={signInWithSchoolAccount}>
                  {returnTo ? (
                    <input type="hidden" name="returnTo" value={returnTo} />
                  ) : null}
                  <SchoolSignInButton />
                </form>
                <p className="mt-4 font-mono text-[11px] leading-5 text-ink-muted">
                  Verified {domain ? `@${domain}` : "school"} Google accounts only.
                </p>
              </>
            )}
          </div>

          <div className="mt-12 flex items-center gap-3 border-t border-rule pt-4">
            <span aria-hidden="true" className="size-1.5 bg-brass" />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              For students, gatekeepers, and the librarian
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[31rem] lg:mx-0 lg:ml-auto">
          <span
            aria-hidden="true"
            className="absolute -top-2 left-8 z-10 h-4 w-px bg-rule sm:left-12"
          />
          <figure
            aria-label="Sample ledger page"
            className="relative rounded-md border border-rule bg-surface"
          >
            <div className="flex items-start justify-between gap-5 border-b border-rule px-5 py-5 sm:px-7">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  The day book
                </p>
                <p className="mt-1.5 font-display text-[1.7rem] leading-none tracking-[-0.02em] text-ink">
                  {dateLabel}
                </p>
              </div>
              <span className="stamp mt-0.5 shrink-0 -rotate-2 border-vermilion text-vermilion">
                Sample
              </span>
            </div>

            <div className="px-5 sm:px-7">
              <div className="grid grid-cols-[3.1rem_minmax(0,1fr)_2.4rem] gap-3 border-b border-rule py-3 font-mono text-[10px] uppercase tracking-[0.13em] text-ink-muted">
                <span>Time</span>
                <span>Name / device</span>
                <span className="text-right">State</span>
              </div>

              {sampleEntries.map((entry) => (
                <div
                  key={`${entry.time}-${entry.name}`}
                  className="grid grid-cols-[3.1rem_minmax(0,1fr)_2.4rem] items-center gap-3 border-b border-rule py-3.5"
                >
                  <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                    {entry.time}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-medium leading-5 text-ink">
                      {entry.name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[10px] leading-4 text-ink-muted">
                      {entry.detail}
                    </p>
                  </div>
                  <span
                    className={`text-right font-mono text-[11px] font-semibold uppercase tracking-[0.12em] ${entry.stateClass}`}
                  >
                    {entry.state}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7">
              <p className="font-mono text-[10px] leading-4 text-ink-muted">
                A sample page from the desk.
              </p>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Vol. 01
              </span>
            </div>
          </figure>
        </div>
      </section>

      <div className="border-t border-rule">
        <ul className="grid gap-3 py-5 font-mono text-[10px] leading-5 tracking-[0.02em] text-ink-muted sm:grid-cols-3 sm:gap-6">
          <li>One open visit per student.</li>
          <li>One open visit per laptop.</li>
          <li>Every exit stays on the record.</li>
        </ul>
      </div>
    </div>
  );
}
