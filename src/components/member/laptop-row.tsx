import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";

import { RemoveLaptopButton } from "@/components/member/remove-laptop-button";

type LaptopRowProps = {
  laptop: {
    id: string;
    model: string;
    serial: string;
    photoUrl: string;
  };
};

export function LaptopRow({ laptop }: LaptopRowProps) {
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-5 sm:py-5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-rule bg-wash">
        {/* Blob URLs are already resized and are not run through an optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={laptop.photoUrl}
          alt={`Photo of ${laptop.model}`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      </div>

      <div className="min-w-0 self-center">
        <p className="break-words font-display text-[1.35rem] leading-tight tracking-[-0.01em] text-ink">
          {laptop.model}
        </p>
        <p className="mt-1.5 break-all font-mono text-[11px] uppercase leading-5 tracking-[0.06em] text-ink-muted">
          {laptop.serial}
        </p>
      </div>

      <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:justify-end">
        <Link
          href={`/me/laptops/${laptop.id}/edit`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-sm font-medium text-ink transition-colors duration-150 hover:text-forest"
        >
          <PencilSimple aria-hidden="true" size={16} weight="regular" />
          Edit
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-rule" />
        <RemoveLaptopButton deviceId={laptop.id} model={laptop.model} />
      </div>
    </li>
  );
}
