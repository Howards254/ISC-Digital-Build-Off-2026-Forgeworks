import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { LaptopForm } from "@/components/laptops/laptop-form";
import { isUuid } from "@/lib/api";
import { requireSession } from "@/lib/authz";
import { getOwnedLaptop } from "@/lib/member-data";

export const metadata: Metadata = {
  title: "Edit a laptop",
  description:
    "Update a registered laptop's model, serial number, or photo in the library ledger.",
};

type EditLaptopPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLaptopPage({ params }: EditLaptopPageProps) {
  const session = await requireSession();
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const laptop = await getOwnedLaptop(id, session.user.id);

  if (!laptop) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-12">
      <div className="max-w-[46rem]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/me"
            className="text-link text-sm font-semibold text-ink-muted"
          >
            <ArrowLeft aria-hidden="true" size={16} weight="regular" />
            Your page
          </Link>
          <span className="stamp max-w-full truncate text-ink-muted">
            {laptop.serial}
          </span>
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          My laptops / Edit entry
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.7rem,6vw,4.2rem)] leading-[0.95] tracking-[-0.03em] text-ink">
          Edit this laptop.
        </h1>
        <p className="mt-4 max-w-[54ch] text-[1.0625rem] leading-7 text-ink-muted">
          Correct the model, replace a photo, or fix the serial. Changes stay
          attached to this laptop&apos;s place on the ledger.
        </p>

        <div className="mt-10 border-t border-rule pt-8">
          <LaptopForm mode="edit" initial={laptop} />
        </div>
      </div>
    </div>
  );
}
