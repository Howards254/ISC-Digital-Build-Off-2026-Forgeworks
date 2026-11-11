import { LedgerSkeleton } from "@/components/ledger-skeleton";

export default function Loading() {
  return <LedgerSkeleton label="Reading the open visits" rows={6} hero />;
}
