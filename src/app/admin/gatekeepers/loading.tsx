import { LedgerSkeleton } from "@/components/ledger-skeleton";

export default function Loading() {
  return <LedgerSkeleton label="Reading the gatekeeper grants" rows={6} />;
}
