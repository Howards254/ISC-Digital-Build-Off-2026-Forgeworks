import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Timer } from "@phosphor-icons/react/dist/ssr";

import { ScanShell } from "@/components/scan/scan-shell";
import { DOOR_EXPIRED_MESSAGE } from "@/lib/door-token";

export const metadata: Metadata = {
  title: "Door code expired",
  description:
    "The one-minute door code has expired. Scan the fresh code on the door screen.",
};

export default function ExpiredCodePage() {
  return (
    <ScanShell eyebrow="Door code · expired" title="The ink has dried.">
      <div className="border-y border-rule py-5">
        <div className="flex items-start gap-3">
          <Timer
            aria-hidden="true"
            size={24}
            weight="duotone"
            className="mt-0.5 shrink-0 text-vermilion"
          />
          <div>
            <p role="alert" className="text-[1.0625rem] leading-7 text-ink">
              {DOOR_EXPIRED_MESSAGE}
            </p>
            <p className="mt-2 max-w-[56ch] text-sm leading-6 text-ink-muted">
              Door codes are deliberately short-lived: one minute, one
              direction. The code on the screen has already been replaced.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-2 border-t border-rule pt-4 font-mono text-[10px] uppercase leading-5 tracking-[0.1em] text-ink-muted">
          <li>
            <span className="text-brass">01</span> Look at the door screen
          </li>
          <li>
            <span className="text-brass">02</span> Scan the new paper-white code
          </li>
          <li>
            <span className="text-brass">03</span> Sign the entry or exit
          </li>
        </ol>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Link href="/me" className="button-secondary">
          Open your page
          <ArrowRight aria-hidden="true" size={18} weight="regular" />
        </Link>
      </div>
    </ScanShell>
  );
}
