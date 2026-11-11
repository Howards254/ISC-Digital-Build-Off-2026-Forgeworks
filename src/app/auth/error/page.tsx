import Link from "next/link";
import { XCircle } from "@phosphor-icons/react/dist/ssr";

import { signInWithSchoolAccount } from "@/app/actions";
import { getSchoolDomain } from "@/auth";
import { SchoolSignInButton } from "@/components/school-sign-in-button";

export const metadata = {
  title: "Sign-in failed",
  description:
    "Vulcan only admits verified Google accounts from the school domain.",
};

function getErrorCopy(error?: string) {
  if (error === "AccessDenied") {
    return {
      stamp: "Access denied",
      title: "This account isn't on the register.",
      body: "Vulcan only admits verified Google accounts from the school. Sign in with your school address. If that is the account you used, ask the librarian to check it.",
    };
  }

  if (error === "Configuration") {
    return {
      stamp: "Not configured",
      title: "The sign-in desk isn't ready.",
      body: "School sign-in is not configured yet. Ask the librarian or the person who set up Vulcan to check the Google provider settings.",
    };
  }

  return {
    stamp: "Interrupted",
    title: "The sign-in didn't finish.",
    body: "Something interrupted the handover with Google. Try again with your school account. If it keeps happening, show this page to the librarian.",
  };
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const domain = getSchoolDomain();
  const copy = getErrorCopy(error);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 items-center px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid w-full gap-10 border-y border-rule py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-16">
        <div className="max-w-[43rem]">
          <XCircle
            aria-hidden="true"
            size={52}
            weight="duotone"
            className="text-vermilion"
          />
          <span className="stamp mt-6 rotate-[-1.5deg] text-vermilion">
            {copy.stamp}
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.6rem,5vw,4rem)] leading-[0.95] tracking-[-0.03em] text-ink">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-[58ch] text-[1.0625rem] leading-7 text-ink-muted">
            {copy.body}
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <form action={signInWithSchoolAccount}>
              <SchoolSignInButton label="Try another school account" />
            </form>
            <Link href="/" className="text-link text-sm font-semibold text-ink">
              Back to the front page
            </Link>
          </div>

          <p className="mt-6 font-mono text-[11px] leading-5 text-ink-muted">
            School accounts end in {domain ? `@${domain}` : "your school's domain"}.
          </p>
        </div>

        <div className="border-t border-rule pt-5 lg:mt-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Refused entry
          </p>
          <div className="mt-4 space-y-3 font-mono text-[11px] leading-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
              <span className="text-ink-muted">Gate</span>
              <span className="text-ink">Google</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
              <span className="text-ink-muted">Domain</span>
              <span className="text-ink">
                {domain ? `@${domain}` : "school only"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-ink-muted">Code</span>
              <span className="max-w-[13rem] break-words text-right text-vermilion">
                {error ?? "Unknown"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
