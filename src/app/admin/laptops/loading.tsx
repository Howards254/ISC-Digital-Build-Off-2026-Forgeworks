import { LedgerSkeleton } from "@/components/ledger-skeleton";

export default function Loading() {
  return <LedgerSkeleton label="Searching the laptop register" rows={7} />;
}
