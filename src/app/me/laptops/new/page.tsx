import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { LaptopForm } from "@/components/laptops/laptop-form";
import { requireSession } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Add a laptop",
  description:
    "Register a laptop with its model, serial number, and a photo for the library ledger.",
};

export default async function NewLaptopPage() {
  await requireSession();

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-12">
      <div className="max-w-[46rem]">
        <Link
          href="/me"
          className="text-link text-sm font-semibold text-ink-muted"
        >
          <ArrowLeft aria-hidden="true" size={16} weight="regular" />
          Your page
        </Link>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          My laptops / New entry
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.7rem,6vw,4.2rem)] leading-[0.95] tracking-[-0.03em] text-ink">
          Add a laptop.
        </h1>
        <p className="mt-4 max-w-[54ch] text-[1.0625rem] leading-7 text-ink-muted">
          Put the laptop on your part of the ledger. The serial is checked
          against every other laptop so one machine cannot be registered twice.
        </p>

        <div className="mt-10 border-t border-rule pt-8">
          <LaptopForm mode="create" />
        </div>
      </div>
    </div>
  );
}
