import { LedgerSkeleton } from "@/components/ledger-skeleton";

export default function Loading() {
  return <LedgerSkeleton label="Fetching the visit history" rows={8} filters />;
}
