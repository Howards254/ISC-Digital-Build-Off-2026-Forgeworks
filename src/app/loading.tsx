import { LedgerSkeleton } from "@/components/ledger-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12">
      <LedgerSkeleton label="Opening the ledger" rows={5} />
    </div>
  );
}
