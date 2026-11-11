import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

type AdminPaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  unit: string;
  hrefForPage: (page: number) => string;
};

export function AdminPagination({
  page,
  pageCount,
  total,
  unit,
  hrefForPage,
}: AdminPaginationProps) {
  if (total === 0) {
    return null;
  }

  return (
    <nav
      aria-label={`${unit} pages`}
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
        {total} {unit} · page {page} of {pageCount}
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className="button-secondary">
            <CaretLeft aria-hidden="true" size={15} weight="regular" />
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className="button-secondary opacity-45">
            <CaretLeft aria-hidden="true" size={15} weight="regular" />
            Previous
          </span>
        )}

        {page < pageCount ? (
          <Link href={hrefForPage(page + 1)} className="button-secondary">
            Next
            <CaretRight aria-hidden="true" size={15} weight="regular" />
          </Link>
        ) : (
          <span aria-disabled="true" className="button-secondary opacity-45">
            Next
            <CaretRight aria-hidden="true" size={15} weight="regular" />
          </span>
        )}
      </div>
    </nav>
  );
}
